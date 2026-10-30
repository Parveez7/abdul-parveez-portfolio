import React, { useRef, useEffect, useState, useMemo, useCallback } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useSmoothScroll } from '../../context/SmoothScrollContext'
import { useParticleStage } from '../canvas/ParticleStage'
import {
  JOURNEY_ENTRIES,
  JOURNEY_CATEGORIES,
  YEAR_MARKERS,
  CATEGORY_META,
} from '../../data/journey'
import PlaceholderArt, { getRealJourneyImage } from './PlaceholderArt'
import './Journey.css'

/**
 * ============================================================================
 * KEY TUNING CONSTANTS (Camera-on-a-Rail & Scroll Mapping)
 * ============================================================================
 */
export const JOURNEY_TUNING = {
  focalLength: 1050,          // Base perspective focal length (px at 1440w)
  stepZ: 520,                 // World Z distance between consecutive cards
  focusDistZ: 660,            // Distance from camera to the d = 0 focus node
  camOffsetX: -55,            // Camera lateral offset from spline centerline
  camOffsetY: -175,           // Camera elevation above the rail plane
  camYawRad: 0.145,           // Subtle rightward look angle so spline winds to upper-right
  camPitchRad: -0.055,        // Subtle horizon pitch
  maxBankDeg: 3.0,            // Max camera banking roll (+/- 3deg) along S-curves
  dwellRadius: 0.22,          // +/- path units around each card where camera slows down
  dwellSpeedFactor: 0.35,     // Camera moves at 35% speed inside dwell zones
  majorWeightMultiplier: 1.3, // "major" entries receive +30% scroll length
  vhPerEntry: 85,             // Base scroll vh per entry
  introVh: 100,               // Intro scroll buffer (vh)
  outroVh: 80,                // Outro scroll buffer (vh)
  cameraLerp: 0.12,           // Single light damping step in the render loop
  dustCountDesktop: 150,      // Sparse 3D dust specks around the rail
  dustCountCompact: 70,
}

/**
 * Placement stances alternating relative to the path (left, right, above)
 * so neighbouring cards in 3D space never overlap on screen.
 */
const CARD_PLACEMENTS = [
  { stance: 'left', anchorXRatio: 0.66, stemHeight: 62, baseRotY: 7.5, baseRotZ: -2.0, sideSign: -1 },
  { stance: 'right', anchorXRatio: 0.34, stemHeight: 84, baseRotY: -8.0, baseRotZ: 2.2, sideSign: 1 },
  { stance: 'above', anchorXRatio: 0.50, stemHeight: 102, baseRotY: -4.5, baseRotZ: -1.4, sideSign: -0.6 },
  { stance: 'right', anchorXRatio: 0.30, stemHeight: 58, baseRotY: -8.5, baseRotZ: 2.4, sideSign: 1 },
  { stance: 'left', anchorXRatio: 0.70, stemHeight: 88, baseRotY: 8.0, baseRotZ: -2.5, sideSign: -1 },
]

/**
 * Generates deterministic 3D control points for the Catmull-Rom spline.
 * Indices run from k = -3 to N + 5 so the spline has smooth S-curves
 * from behind the camera all the way to the distant horizon.
 */
function buildSplineControlPoints(numEntries) {
  const pts = []
  const minK = -3
  const maxK = numEntries + 5

  for (let k = minK; k <= maxK; k++) {
    // S-curve lateral sway left and right + gentle vertical undulation
    const swayX = 240 * Math.sin(k * 1.18 - 0.3) + 55 * Math.cos(k * 0.52)
    const waveY = 36 * Math.cos(k * 1.05 + 0.4)
    const z = k * JOURNEY_TUNING.stepZ

    pts.push({ k, x: swayX, y: waveY, z })
  }
  return { pts, minK, maxK }
}

/**
 * Evaluates a 3D point and tangent on the Catmull-Rom spline at continuous path parameter `u`.
 */
function evaluateSpline(splineData, u) {
  const { pts, minK, maxK } = splineData
  const clampedU = Math.max(minK + 1, Math.min(maxK - 2, u))
  const iFloor = Math.floor(clampedU)
  const t = clampedU - iFloor
  const idx = iFloor - minK

  const p0 = pts[idx - 1]
  const p1 = pts[idx]
  const p2 = pts[idx + 1]
  const p3 = pts[idx + 2]

  const t2 = t * t
  const t3 = t2 * t

  // Standard Catmull-Rom matrix weights (tau = 0.5)
  const c0 = -0.5 * t3 + t2 - 0.5 * t
  const c1 = 1.5 * t3 - 2.5 * t2 + 1.0
  const c2 = -1.5 * t3 + 2.0 * t2 + 0.5 * t
  const c3 = 0.5 * t3 - 0.5 * t2

  const x = c0 * p0.x + c1 * p1.x + c2 * p2.x + c3 * p3.x
  const y = c0 * p0.y + c1 * p1.y + c2 * p2.y + c3 * p3.y
  const z = c0 * p0.z + c1 * p1.z + c2 * p2.z + c3 * p3.z

  // First derivative (tangent) for camera banking / curvature
  const d0 = -1.5 * t2 + 2.0 * t - 0.5
  const d1 = 4.5 * t2 - 5.0 * t
  const d2 = -4.5 * t2 + 4.0 * t + 0.5
  const d3 = 1.5 * t2 - t

  const tx = d0 * p0.x + d1 * p1.x + d2 * p2.x + d3 * p3.x
  const ty = d0 * p0.y + d1 * p1.y + d2 * p2.y + d3 * p3.y
  const tz = d0 * p0.z + d1 * p1.z + d2 * p2.z + d3 * p3.z

  return { x, y, z, tx, ty, tz }
}

/**
 * Builds a lookup table mapping scroll progress (0..1) -> camera path position `u`
 * with explicit DWELL ZONES (+/- 0.22 around each integer card index) where the
 * camera moves at 35% speed, and major cards receive +30% scroll weight.
 */
function buildScrollToCameraLut(entries) {
  const n = entries.length
  const uStart = -0.32
  const uEnd = n - 1 + 0.38
  const samples = 2400
  const du = (uEnd - uStart) / samples

  const uValues = new Float32Array(samples + 1)
  const cumScroll = new Float32Array(samples + 1)

  const { dwellRadius, dwellSpeedFactor, majorWeightMultiplier } = JOURNEY_TUNING
  let acc = 0

  for (let s = 0; s <= samples; s++) {
    const u = uStart + s * du
    uValues[s] = u
    cumScroll[s] = acc

    // Nearest card index
    const nearestIdx = Math.max(0, Math.min(n - 1, Math.round(u)))
    const distToCard = Math.abs(u - nearestIdx)
    const entry = entries[nearestIdx]
    const majorMult = entry?.size === 'major' ? majorWeightMultiplier : 1.0

    // Inside +/- dwellRadius of a card, speed drops to dwellSpeedFactor (35%),
    // meaning scroll cost d(scroll)/du is 1 / dwellSpeedFactor (~2.85x higher)
    let speed = 1.0
    if (distToCard < dwellRadius) {
      const norm = distToCard / dwellRadius // 0 at card center, 1 at edge
      const smooth = norm * norm * (3 - 2 * norm)
      speed = dwellSpeedFactor + (1.0 - dwellSpeedFactor) * smooth
    }

    const scrollCost = (1.0 / speed) * majorMult
    acc += scrollCost * du
  }

  // Normalize cumulative scroll to [0, 1]
  const totalScrollCost = cumScroll[samples] || 1
  for (let s = 0; s <= samples; s++) {
    cumScroll[s] /= totalScrollCost
  }

  return { uValues, cumScroll, samples }
}

/**
 * Maps normalized scroll progress p in [0, 1] to camera path position `u` via binary search.
 */
function mapScrollProgressToU(lut, p) {
  const { uValues, cumScroll, samples } = lut
  const clampedP = Math.max(0, Math.min(1, p))

  let low = 0
  let high = samples
  while (low < high) {
    const mid = (low + high) >>> 1
    if (cumScroll[mid] < clampedP) {
      low = mid + 1
    } else {
      high = mid
    }
  }

  const i = Math.max(1, low)
  const s0 = cumScroll[i - 1]
  const s1 = cumScroll[i]
  const t = s1 > s0 ? (clampedP - s0) / (s1 - s0) : 0
  return uValues[i - 1] + (uValues[i] - uValues[i - 1]) * t
}

/**
 * Inverse mapping: finds normalized scroll progress p in [0, 1] for a given card index `uTarget`.
 */
function findScrollProgressForCard(lut, uTarget) {
  const { uValues, cumScroll, samples } = lut
  for (let i = 1; i <= samples; i++) {
    if (uValues[i] >= uTarget) {
      return cumScroll[i]
    }
  }
  return 1
}

/**
 * Generates sparse 3D atmospheric dust specks along the corridor of the spline.
 */
function generateDustParticles(splineData, numEntries, count) {
  const specks = []
  const uMin = -1.0
  const uMax = numEntries + 3.2

  for (let i = 0; i < count; i++) {
    const u = uMin + (i / count) * (uMax - uMin) + (Math.random() - 0.5) * 0.4
    const center = evaluateSpline(splineData, u)
    const spreadX = (Math.random() - 0.5) * 780
    const spreadY = (Math.random() - 0.5) * 320 + 25
    const spreadZ = (Math.random() - 0.5) * 260

    specks.push({
      x: center.x + spreadX,
      y: center.y + spreadY,
      z: center.z + spreadZ,
      size: 0.8 + Math.random() * 1.35,
      alpha: 0.16 + Math.random() * 0.38,
      isRed: i % 12 === 0, // ~1 in 12 is accent red
      phase: Math.random() * Math.PI * 2,
      speed: 0.4 + Math.random() * 0.7,
    })
  }
  return specks
}

function smoothstep(min, max, value) {
  const x = Math.max(0, Math.min(1, (value - min) / (max - min)))
  return x * x * (3 - 2 * x)
}

export default function Journey() {
  const sectionRef = useRef(null)
  const canvasRef = useRef(null)
  const cardRefs = useRef([])
  const yearMarkerRefs = useRef([])
  const stRef = useRef(null)

  const {
    scrollTo,
    setActiveTheme,
    setActiveSection,
    setActiveSectionIndex,
    updateProgress,
  } = useSmoothScroll()
  const { stage: particleStage } = useParticleStage()

  const [activeCategory, setActiveCategory] = useState(JOURNEY_ENTRIES[0].category)
  const [focusedIndex, setFocusedIndex] = useState(0)
  const [nearCameraWindow, setNearCameraWindow] = useState(0)

  // Debug controls state
  const [debugCollapsed, setDebugCollapsed] = useState(false)
  const [manualOverride, setManualOverride] = useState(false)
  const [manualU, setManualU] = useState(0)
  const [showControlPoints, setShowControlPoints] = useState(false)
  const [debugBankDeg, setDebugBankDeg] = useState('0.0')

  // Refs synced into the GSAP ticker loop
  const stateRef = useRef({
    targetU: -0.25,
    currentU: -0.25,
    isActive: false,
    manualOverride: false,
    manualU: 0,
    showControlPoints: false,
    lastFocusedIdx: 0,
    pulseTimer: 0,
    pulseNodeIdx: 0,
  })

  useEffect(() => {
    stateRef.current.manualOverride = manualOverride
    stateRef.current.manualU = manualU
    stateRef.current.showControlPoints = showControlPoints
  }, [manualOverride, manualU, showControlPoints])

  // Precompute spline, scroll LUT, dust, and unique first-entry-per-year markers
  const splineData = useMemo(
    () => buildSplineControlPoints(JOURNEY_ENTRIES.length),
    []
  )
  const scrollLut = useMemo(
    () => buildScrollToCameraLut(JOURNEY_ENTRIES),
    []
  )
  const dustSpecks = useMemo(() => {
    const count =
      typeof window !== 'undefined' && window.innerWidth < 1024
        ? JOURNEY_TUNING.dustCountCompact
        : JOURNEY_TUNING.dustCountDesktop
    return generateDustParticles(splineData, JOURNEY_ENTRIES.length, count)
  }, [splineData])

  const yearAnchors = useMemo(() => {
    const seen = new Set()
    const list = []
    JOURNEY_ENTRIES.forEach((entry, index) => {
      if (!seen.has(entry.year) && YEAR_MARKERS[entry.year]) {
        seen.add(entry.year)
        list.push({
          year: entry.year,
          label: YEAR_MARKERS[entry.year],
          entryIndex: index,
        })
      }
    })
    return list
  }, [])

  // Calculate total pin scroll height in vh
  const totalPinVh = useMemo(() => {
    const entriesVh = JOURNEY_ENTRIES.reduce((sum, entry) => {
      const mult =
        entry.size === 'major' ? JOURNEY_TUNING.majorWeightMultiplier : 1.0
      return sum + JOURNEY_TUNING.vhPerEntry * mult
    }, 0)
    return Math.round(
      JOURNEY_TUNING.introVh + entriesVh + JOURNEY_TUNING.outroVh
    )
  }, [])

  // Dev-only console summary listing placeholder text & image status
  useEffect(() => {
    if (!import.meta.env.DEV) return

    const missingImages = JOURNEY_ENTRIES.filter(
      (e) => !getRealJourneyImage(e.id)
    ).map((e) => e.id)
    const placeholderCopy = JOURNEY_ENTRIES.filter((e) => e.placeholder).map(
      (e) => e.id
    )

    console.info(
      `%c[Journey Section 04 — Asset Status]%c\n` +
        `• Entries using placeholder SVG art (${missingImages.length}/${JOURNEY_ENTRIES.length}): ${
          missingImages.join(', ') || 'None'
        }\n` +
        `• Entries using placeholder copy (${placeholderCopy.length}/${JOURNEY_ENTRIES.length}): ${
          placeholderCopy.join(', ') || 'None'
        }\n` +
        `Drop <id>.webp into src/assets/journey/ to auto-replace any placeholder image.`,
      'color: #E8283C; font-weight: bold;',
      'color: #C7C3BB;'
    )
  }, [])

  // Jump to first entry of a clicked category in the left sidebar
  const handleCategoryClick = useCallback(
    (category) => {
      const targetIdx = JOURNEY_ENTRIES.findIndex(
        (e) => e.category === category
      )
      if (targetIdx === -1) return

      if (stateRef.current.manualOverride) {
        setManualU(targetIdx)
        return
      }

      const st = stRef.current
      if (!st) return
      const normP = findScrollProgressForCard(scrollLut, targetIdx)
      const targetScrollY = st.start + normP * (st.end - st.start)
      scrollTo(targetScrollY)
    },
    [scrollLut, scrollTo]
  )

  const handleSkipTimeline = useCallback(() => {
    scrollTo('#contact')
  }, [scrollTo])

  // Main ScrollTrigger + Canvas 2D & DOM 3D Projection Loop
  useEffect(() => {
    const sectionEl = sectionRef.current
    const canvasEl = canvasRef.current
    if (!sectionEl || !canvasEl) return

    const ctx = canvasEl.getContext('2d')
    let vw = window.innerWidth
    let vh = window.innerHeight
    let dpr = Math.min(window.devicePixelRatio || 1, 2)

    const updateCanvasSize = () => {
      vw = sectionEl.clientWidth || window.innerWidth
      vh = sectionEl.clientHeight || window.innerHeight
      dpr = Math.min(window.devicePixelRatio || 1, 2)
      canvasEl.width = Math.round(vw * dpr)
      canvasEl.height = Math.round(vh * dpr)
    }
    updateCanvasSize()

    window.addEventListener('resize', updateCanvasSize)

    // Pin section with ScrollTrigger
    const st = ScrollTrigger.create({
      trigger: sectionEl,
      start: 'top top',
      end: `+=${totalPinVh}%`,
      pin: true,
      pinSpacing: true,
      scrub: true,
      onEnter: () => {
        stateRef.current.isActive = true
        setActiveSection('experience')
        setActiveSectionIndex('04')
        setActiveTheme('dark')
        particleStage.setVisibility(0)
      },
      onEnterBack: () => {
        stateRef.current.isActive = true
        setActiveSection('experience')
        setActiveSectionIndex('04')
        setActiveTheme('dark')
        particleStage.setVisibility(0)
      },
      onLeave: () => {
        stateRef.current.isActive = false
      },
      onLeaveBack: () => {
        stateRef.current.isActive = false
      },
      onUpdate: (self) => {
        const p = self.progress
        updateProgress('experience', p)
        stateRef.current.targetU = mapScrollProgressToU(scrollLut, p)
      },
    })
    stRef.current = st

    // Render frame function synced to gsap.ticker
    const renderFrame = (time, deltaTime) => {
      const s = stateRef.current
      if (!s.isActive && !s.manualOverride) return

      const dt = Math.min(0.05, (deltaTime || 16.6) / 1000)

      // 1. Update camera path position u with single light damping step (lerp ~0.12)
      const desiredU = s.manualOverride ? s.manualU : s.targetU
      s.currentU += (desiredU - s.currentU) * JOURNEY_TUNING.cameraLerp
      const camU = s.currentU

      // Track nearest focused card & trigger subtle arrival pulse
      const nearestIdx = Math.max(
        0,
        Math.min(JOURNEY_ENTRIES.length - 1, Math.round(camU))
      )
      if (nearestIdx !== s.lastFocusedIdx) {
        s.lastFocusedIdx = nearestIdx
        s.pulseNodeIdx = nearestIdx
        s.pulseTimer = 0
        setFocusedIndex(nearestIdx)
        setActiveCategory(JOURNEY_ENTRIES[nearestIdx].category)
      }
      if (Math.abs( nearestIdx - nearCameraWindow ) >= 1) {
        setNearCameraWindow(nearestIdx)
      }
      s.pulseTimer += dt

      // 2. Compute Virtual Camera Pose on the 3D Rail
      const focusPt = evaluateSpline(splineData, camU)
      const lookAheadPt = evaluateSpline(splineData, camU + 1.5)

      // Camera sits behind focusPt by focusDistZ, elevated above the rail,
      // and tracks 58% of the spline's lateral X so S-bends sweep across the screen
      const camX = focusPt.x * 0.58 + JOURNEY_TUNING.camOffsetX
      const camY = focusPt.y * 0.65 + JOURNEY_TUNING.camOffsetY
      const camZ = focusPt.z - JOURNEY_TUNING.focusDistZ

      // Subtle camera banking roll (+/- 3 deg) proportional to lateral curvature
      const curvatureX = (lookAheadPt.tx - focusPt.tx) / JOURNEY_TUNING.stepZ
      const bankRad = Math.max(
        (-JOURNEY_TUNING.maxBankDeg * Math.PI) / 180,
        Math.min(
          (JOURNEY_TUNING.maxBankDeg * Math.PI) / 180,
          curvatureX * 0.22
        )
      )
      const cosRoll = Math.cos(bankRad)
      const sinRoll = Math.sin(bankRad)

      if (s.showControlPoints || s.manualOverride) {
        setDebugBankDeg(((bankRad * 180) / Math.PI).toFixed(2))
      }

      const focal = JOURNEY_TUNING.focalLength * (vw / 1440)
      const screenCenterX = vw * 0.46
      const screenCenterY = vh * 0.56

      const cosYaw = Math.cos(JOURNEY_TUNING.camYawRad)
      const sinYaw = Math.sin(JOURNEY_TUNING.camYawRad)
      const cosPitch = Math.cos(JOURNEY_TUNING.camPitchRad)
      const sinPitch = Math.sin(JOURNEY_TUNING.camPitchRad)

      /**
       * Projects any 3D world point (wx, wy, wz) through the virtual camera
       * into 2D viewport coordinates (sx, sy) and perspective scale.
       */
      const projectPoint = (wx, wy, wz) => {
        const dx = wx - camX
        const dy = wy - camY
        const dz = wz - camZ

        // Yaw rotation (horizontal look toward upper-right horizon)
        const rx1 = dx * cosYaw - dz * sinYaw
        const rz1 = dx * sinYaw + dz * cosYaw

        // Pitch rotation
        const ry2 = dy * cosPitch - rz1 * sinPitch
        const rz2 = dy * sinPitch + rz1 * cosPitch

        if (rz2 <= 45) return null

        // Camera banking roll
        const rx3 = rx1 * cosRoll - ry2 * sinRoll
        const ry3 = rx1 * sinRoll + ry2 * cosRoll

        const scale = focal / rz2
        return {
          sx: screenCenterX + rx3 * scale,
          sy: screenCenterY + ry3 * scale,
          scale,
          depthZ: rz2,
        }
      }

      // 3. Clear Canvas & Draw 3D Atmospheric Dust
      ctx.save()
      ctx.scale(dpr, dpr)
      ctx.clearRect(0, 0, vw, vh)

      for (let i = 0; i < dustSpecks.length; i++) {
        const sp = dustSpecks[i]
        const driftX = Math.sin(time * sp.speed + sp.phase) * 14
        const driftY = Math.cos(time * sp.speed * 0.8 + sp.phase) * 9
        const proj = projectPoint(sp.x + driftX, sp.y + driftY, sp.z)
        if (!proj || proj.depthZ > 3200 || proj.depthZ < 120) continue

        const distFade = smoothstep(3200, 1800, proj.depthZ) * smoothstep(120, 350, proj.depthZ)
        const alpha = sp.alpha * distFade
        if (alpha < 0.02) continue

        const radius = Math.max(0.6, Math.min(2.4, sp.size * proj.scale * 1.15))
        ctx.fillStyle = sp.isRed
          ? `rgba(232, 40, 60, ${(alpha * 1.15).toFixed(3)})`
          : `rgba(245, 242, 238, ${alpha.toFixed(3)})`
        ctx.beginPath()
        ctx.arc(proj.sx, proj.sy, radius, 0, Math.PI * 2)
        ctx.fill()
      }

      // 4. Sample & Draw the Winding 3D Spline Path
      //    - Ahead of focus (u > camU): dim warm grey hairline tapering with distance
      //    - Behind/up to focus (u <= camU): bright warm white with subtle narrow red bloom
      const uMinDraw = camU - 1.18
      const uMaxDraw = camU + 4.15
      const stepU = 0.035
      const projectedCurve = []

      for (let u = uMinDraw; u <= uMaxDraw; u += stepU) {
        const pt = evaluateSpline(splineData, u)
        const proj = projectPoint(pt.x, pt.y, pt.z)
        if (proj) {
          projectedCurve.push({ u, ...proj })
        }
      }

      // Draw segments back-to-front (far to near)
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'

      for (let i = projectedCurve.length - 1; i >= 1; i--) {
        const pA = projectedCurve[i]
        const pB = projectedCurve[i - 1]
        const uMid = 0.5 * (pA.u + pB.u)
        const d = uMid - camU

        // Perspective line width (~1.8px at focus depth)
        const baseWidth = Math.max(0.55, Math.min(2.6, 1.9 * pA.scale))

        if (d > 0) {
          // Ahead of camera focus: dim warm grey fading into distance
          const farFade = smoothstep(4.1, 0.2, d)
          const alpha = 0.12 + 0.42 * farFade
          ctx.strokeStyle = `rgba(245, 242, 238, ${alpha.toFixed(3)})`
          ctx.lineWidth = baseWidth
          ctx.beginPath()
          ctx.moveTo(pA.sx, pA.sy)
          ctx.lineTo(pB.sx, pB.sy)
          ctx.stroke()
        } else {
          // Travelled path (d <= 0): subtle narrow red bloom + crisp bright warm white core
          const nearFade = smoothstep(-1.18, -0.35, d)
          const bloomAlpha = 0.22 * nearFade
          const coreAlpha = 0.92 * nearFade

          if (bloomAlpha > 0.01) {
            ctx.strokeStyle = `rgba(232, 40, 60, ${bloomAlpha.toFixed(3)})`
            ctx.lineWidth = baseWidth * 2.8
            ctx.beginPath()
            ctx.moveTo(pA.sx, pA.sy)
            ctx.lineTo(pB.sx, pB.sy)
            ctx.stroke()
          }

          ctx.strokeStyle = `rgba(245, 242, 238, ${coreAlpha.toFixed(3)})`
          ctx.lineWidth = baseWidth * 1.15
          ctx.beginPath()
          ctx.moveTo(pA.sx, pA.sy)
          ctx.lineTo(pB.sx, pB.sy)
          ctx.stroke()
        }
      }

      // 5. Update Year Markers in 3D Space beside the spline
      yearAnchors.forEach((ym, ymIdx) => {
        const markerEl = yearMarkerRefs.current[ymIdx]
        if (!markerEl) return

        const d = ym.entryIndex - camU
        if (d > 3.2 || d < -1.05) {
          markerEl.style.display = 'none'
          return
        }

        const nodePt = evaluateSpline(splineData, ym.entryIndex)
        const placement = CARD_PLACEMENTS[ym.entryIndex % CARD_PLACEMENTS.length]
        // Place year marker opposite the card stem beside the node
        const markerWorldX = nodePt.x - placement.sideSign * 105
        const markerWorldY = nodePt.y - 12
        const proj = projectPoint(markerWorldX, markerWorldY, nodePt.z)

        if (!proj) {
          markerEl.style.display = 'none'
          return
        }

        const alpha =
          d >= 0
            ? smoothstep(3.1, 0.6, d)
            : smoothstep(-1.05, -0.15, d)
        const sc = Math.max(0.35, Math.min(1.15, proj.scale * 1.05))

        markerEl.style.display = 'block'
        markerEl.style.opacity = alpha.toFixed(3)
        markerEl.style.transform = `translate3d(${proj.sx.toFixed(1)}px, ${proj.sy.toFixed(
          1
        )}px, 0) translate(-50%, -50%) scale(${sc.toFixed(3)})`
      })

      // 6. Project Each Card, Draw Node Dots & 1px Stems on Canvas, and Position DOM Cards
      const numEntries = JOURNEY_ENTRIES.length
      for (let i = numEntries - 1; i >= 0; i--) {
        const cardEl = cardRefs.current[i]
        const d = i - camU

        // Outside lifecycle bounds (d > 3.5 or d < -1.2): hide completely
        if (d > 3.5 || d < -1.2) {
          if (cardEl) cardEl.style.display = 'none'
          continue
        }

        const nodePt = evaluateSpline(splineData, i)
        const proj = projectPoint(nodePt.x, nodePt.y, nodePt.z)
        if (!proj) {
          if (cardEl) cardEl.style.display = 'none'
          continue
        }

        const placement = CARD_PLACEMENTS[i % CARD_PLACEMENTS.length]

        // Compute Card Lifecycle Curves (Emerging -> Approach -> Focus -> Recede)
        let cardScale = 1
        let cardOpacity = 1
        let blurPx = 0
        let rotY = placement.baseRotY
        let rotZ = placement.baseRotZ
        let rotX = 1.2
        let floatOffsetY = 0
        let recedeOffsetX = 0
        let recedeOffsetY = 0
        let stemAlpha = 1

        if (d > 1.0) {
          // EMERGING (d: 3.5 -> 1.0)
          const tEmerge = smoothstep(3.5, 1.0, d) // 0 at 3.5, 1 at 1.0
          cardScale = 0.16 + 0.42 * tEmerge
          cardOpacity = 0.55 * tEmerge
          // Quantized blur in 0.5px steps so browser doesn't re-rasterize every frame
          blurPx = Math.round((1 - tEmerge) * 3.5 * 2) / 2
          rotY = placement.baseRotY + placement.sideSign * (1 - tEmerge) * 16
          rotZ = placement.baseRotZ * (1.4 - 0.4 * tEmerge)
          stemAlpha = tEmerge * 0.75
        } else if (d >= 0) {
          // APPROACH & FOCUS (d: 1.0 -> 0.0)
          const tApp = smoothstep(1.0, 0.0, d) // 0 at 1.0, 1 at 0.0
          cardScale = 0.58 + 0.42 * tApp
          cardOpacity = 0.55 + 0.45 * smoothstep(1.0, 0.25, d)
          blurPx = d > 0.45 ? Math.round(((d - 0.45) / 0.55) * 1.5 * 2) / 2 : 0
          rotY = placement.baseRotY * (1.15 - 0.15 * tApp)
          rotZ = placement.baseRotZ

          // Subtle float at focus (+/- 3px)
          const focusWeight = smoothstep(0.35, 0.0, Math.abs(d))
          floatOffsetY = Math.sin(time * 1.7 + i) * 3.0 * focusWeight
          stemAlpha = 0.75 + 0.25 * tApp
        } else {
          // RECEDE (d: 0.0 -> -1.2)
          // Card backs away into depth, drifts outward to its side, turns away, and fades
          const r = smoothstep(0.0, -1.2, d) // 0 at 0.0, 1 at -1.2
          cardScale = 1.0 - 0.54 * r
          cardOpacity = Math.pow(1.0 - r, 1.35)
          blurPx = Math.round(r * 3.5 * 2) / 2
          rotY = placement.baseRotY + placement.sideSign * r * 24
          rotZ = placement.baseRotZ + placement.sideSign * r * 4
          recedeOffsetX = placement.sideSign * r * 195
          recedeOffsetY = -r * 38
          stemAlpha = Math.max(0, 1.0 - r * 1.6)
        }

        // Stem screen length
        const stemLen = placement.stemHeight * cardScale
        const attachX = proj.sx + recedeOffsetX
        const attachY = proj.sy - stemLen + floatOffsetY + recedeOffsetY

        // Draw 1px Stem (warm grey at card bottom -> accent red at node)
        if (stemAlpha > 0.02) {
          const grad = ctx.createLinearGradient(
            attachX,
            attachY,
            proj.sx,
            proj.sy
          )
          grad.addColorStop(0, `rgba(245, 242, 238, ${(stemAlpha * 0.36).toFixed(3)})`)
          grad.addColorStop(1, `rgba(232, 40, 60, ${(stemAlpha * 0.85).toFixed(3)})`)

          ctx.strokeStyle = grad
          ctx.lineWidth = 1
          ctx.beginPath()
          ctx.moveTo(attachX, attachY)
          ctx.lineTo(proj.sx, proj.sy)
          ctx.stroke()
        }

        // Draw Node Dot on the Spline (warm white core + thin red ring)
        const isFocusedNode = Math.abs(d) < 0.24
        const nodeAlpha = d >= 0 ? smoothstep(3.5, 0.8, d) : smoothstep(-1.2, -0.2, d)

        if (nodeAlpha > 0.02) {
          const ringRadius = (isFocusedNode ? 7.5 : 5.2) * Math.min(1.2, Math.max(0.55, cardScale))
          const coreRadius = (isFocusedNode ? 3.2 : 2.2) * Math.min(1.2, Math.max(0.55, cardScale))

          // Gentle arrival pulse ring on the focused node
          if (s.pulseNodeIdx === i && s.pulseTimer < 1.15) {
            const pNorm = s.pulseTimer / 1.15
            const pulseR = ringRadius + pNorm * 16
            const pulseA = (1 - pNorm) * 0.55 * nodeAlpha
            ctx.strokeStyle = `rgba(232, 40, 60, ${pulseA.toFixed(3)})`
            ctx.lineWidth = 1.2
            ctx.beginPath()
            ctx.arc(proj.sx, proj.sy, pulseR, 0, Math.PI * 2)
            ctx.stroke()
          }

          // Outer thin crimson ring
          ctx.fillStyle = `rgba(20, 20, 22, ${(nodeAlpha * 0.9).toFixed(3)})`
          ctx.strokeStyle = `rgba(232, 40, 60, ${(nodeAlpha * (isFocusedNode ? 0.95 : 0.65)).toFixed(3)})`
          ctx.lineWidth = isFocusedNode ? 1.6 : 1.1
          ctx.beginPath()
          ctx.arc(proj.sx, proj.sy, ringRadius, 0, Math.PI * 2)
          ctx.fill()
          ctx.stroke()

          // Inner warm white dot
          ctx.fillStyle = `rgba(245, 242, 238, ${nodeAlpha.toFixed(3)})`
          ctx.beginPath()
          ctx.arc(proj.sx, proj.sy, coreRadius, 0, Math.PI * 2)
          ctx.fill()
        }

        // Apply single 3D transform to the DOM Card
        if (cardEl) {
          cardEl.style.display = 'flex'
          cardEl.style.opacity = cardOpacity.toFixed(3)
          cardEl.style.zIndex = String(Math.round(1000 - d * 100))
          cardEl.style.transformOrigin = `${placement.anchorXRatio * 100}% 100%`
          cardEl.style.filter = blurPx > 0 ? `blur(${blurPx}px)` : 'none'
          cardEl.style.pointerEvents = Math.abs(d) < 0.65 ? 'auto' : 'none'

          cardEl.style.transform =
            `translate3d(${attachX.toFixed(1)}px, ${attachY.toFixed(1)}px, 0) ` +
            `translate(${(-placement.anchorXRatio * 100).toFixed(1)}%, -100%) ` +
            `scale(${cardScale.toFixed(3)}) ` +
            `rotateX(${rotX.toFixed(2)}deg) rotateY(${rotY.toFixed(2)}deg) rotateZ(${rotZ.toFixed(2)}deg)`
        }
      }

      // 7. Optional Debug Overlay: Render 3D Catmull-Rom Control Points & Cage
      if (s.showControlPoints) {
        const { pts } = splineData
        ctx.strokeStyle = 'rgba(232, 40, 60, 0.35)'
        ctx.lineWidth = 1
        ctx.setLineDash([4, 4])
        ctx.beginPath()
        let started = false

        for (let k = 0; k < pts.length; k++) {
          const cp = pts[k]
          const proj = projectPoint(cp.x, cp.y, cp.z)
          if (!proj || proj.depthZ > 4500) continue
          if (!started) {
            ctx.moveTo(proj.sx, proj.sy)
            started = true
          } else {
            ctx.lineTo(proj.sx, proj.sy)
          }
        }
        ctx.stroke()
        ctx.setLineDash([])

        for (let k = 0; k < pts.length; k++) {
          const cp = pts[k]
          const proj = projectPoint(cp.x, cp.y, cp.z)
          if (!proj || proj.depthZ > 4500) continue

          ctx.fillStyle = '#E8283C'
          ctx.beginPath()
          ctx.arc(proj.sx, proj.sy, 4, 0, Math.PI * 2)
          ctx.fill()

          ctx.fillStyle = '#F5F2EE'
          ctx.font = '10px Inter, sans-serif'
          ctx.fillText(
            `CP[${cp.k}] (${Math.round(cp.x)}, ${Math.round(cp.y)}, ${Math.round(cp.z)})`,
            proj.sx + 7,
            proj.sy - 5
          )
        }
      }

      ctx.restore()
    }

    gsap.ticker.add(renderFrame)

    return () => {
      window.removeEventListener('resize', updateCanvasSize)
      gsap.ticker.remove(renderFrame)
      st.kill()
    }
  }, [
    splineData,
    scrollLut,
    dustSpecks,
    yearAnchors,
    totalPinVh,
    nearCameraWindow,
    setActiveSection,
    setActiveSectionIndex,
    setActiveTheme,
    updateProgress,
    particleStage,
  ])

  return (
    <section
      ref={sectionRef}
      id="experience"
      data-theme="dark"
      className="journey-section"
      aria-label="04 The Journey Timeline"
    >
      {/* 1. Matte Backdrop Vignette & Subtle Film Grain */}
      <div className="journey-section__vignette" aria-hidden="true" />
      <div className="journey-section__grain" aria-hidden="true" />

      {/* 2. Canvas 2D Layer: 3D Projected Spline, Travelled Line, Nodes, Stems & Dust */}
      <canvas
        ref={canvasRef}
        className="journey-section__canvas"
        aria-hidden="true"
      />

      {/* 3. Fixed Editorial HUD: Top-Left Masthead, Left Category Track, Skip Button */}
      <div className="journey-section__hud">
        <header className="journey-section__header">
          <div className="journey-section__eyebrow">
            <span className="journey-section__eyebrow-num">04</span>
            <span className="journey-section__eyebrow-sep" aria-hidden="true" />
            <span>JOURNEY</span>
          </div>
          <div className="journey-section__title-row">
            <h2 className="journey-section__title">
              <span className="journey-section__title-the">THE</span>
              <span className="journey-section__title-journey">Journey</span>
            </h2>
            <p className="journey-section__subtitle">
              A timeline of experiences, achievements, and moments that shaped
              who I am today.
            </p>
          </div>
        </header>

        {/* Left Category Navigation Track */}
        <nav className="journey-categories" aria-label="Journey Categories">
          <div className="journey-categories__line" aria-hidden="true" />
          {JOURNEY_CATEGORIES.map((category) => {
            const meta = CATEGORY_META[category]
            const isActive = activeCategory === category
            return (
              <button
                key={category}
                type="button"
                onClick={() => handleCategoryClick(category)}
                className={`journey-categories__item ${
                  isActive ? 'journey-categories__item--active' : ''
                }`}
              >
                <span className="journey-categories__node" aria-hidden="true">
                  <span className="journey-categories__node-dot" />
                </span>
                <span className="journey-categories__text">
                  <span className="journey-categories__name">{category}</span>
                  {meta?.yearRange && (
                    <span className="journey-categories__years">
                      {meta.yearRange}
                    </span>
                  )}
                </span>
              </button>
            )
          })}
        </nav>

        {/* Top-Right Skip Timeline Pill */}
        <button
          type="button"
          onClick={handleSkipTimeline}
          className="journey-section__skip-btn"
        >
          <span>SKIP TIMELINE</span>
          <span className="journey-section__skip-arrow" aria-hidden="true">
            →
          </span>
        </button>
      </div>

      {/* 4. 3D Projected DOM Stage: Year Markers & Matte Editorial Cards */}
      <div className="journey-section__stage">
        {/* Year Markers ("2022 / THE BEGINNING") */}
        {yearAnchors.map((ym, ymIdx) => (
          <div
            key={ym.year}
            ref={(el) => (yearMarkerRefs.current[ymIdx] = el)}
            className="journey-year-marker"
            aria-hidden="true"
          >
            <span className="journey-year-marker__year">{ym.year}</span>
            <span className="journey-year-marker__label">{ym.label}</span>
          </div>
        ))}

        {/* 14 Milestone Cards */}
        {JOURNEY_ENTRIES.map((entry, idx) => {
          const placement = CARD_PLACEMENTS[idx % CARD_PLACEMENTS.length]
          const isFocused = focusedIndex === idx
          const isNearCamera = Math.abs(idx - nearCameraWindow) <= 3
          const catNum = `No. ${String(idx + 1).padStart(2, '0')}`

          return (
            <article
              key={entry.id}
              ref={(el) => (cardRefs.current[idx] = el)}
              className={`journey-card journey-card--${entry.size} ${
                isFocused ? 'journey-card--focused' : ''
              }`}
              aria-label={`${entry.year} ${entry.title} (${entry.category})`}
            >
              {/* Left Image / Certificate Tile (~38%) */}
              <PlaceholderArt entry={entry} isNearCamera={isNearCamera} />

              {/* Right Editorial Catalogue Copy */}
              <div className="journey-card__body">
                <div className="journey-card__focus-tick" aria-hidden="true" />
                <div className="journey-card__meta-row">
                  <span className="journey-card__cat-num">{catNum}</span>
                  <span className="journey-card__year">{entry.year}</span>
                </div>
                <h3 className="journey-card__title">{entry.title}</h3>
                <p className="journey-card__desc">{entry.description}</p>
                <div className="journey-card__category-tag">
                  <span
                    className="journey-card__category-rule"
                    aria-hidden="true"
                  />
                  <span>{entry.category}</span>
                </div>
              </div>

              {/* Bottom stem attachment dot */}
              <span
                className="journey-card__stem-anchor"
                style={{ left: `${placement.anchorXRatio * 100}%` }}
                aria-hidden="true"
              />
            </article>
          )
        })}
      </div>

      {/* 5. Temporary Debug Slider & Control Point Toggle */}
      <aside className="journey-debug" aria-label="Journey Camera Debug">
        <div className="journey-debug__header">
          <span className="journey-debug__title">RAIL CAMERA DEBUG</span>
          <button
            type="button"
            className="journey-debug__toggle-btn"
            onClick={() => setDebugCollapsed((prev) => !prev)}
          >
            {debugCollapsed ? 'Expand' : 'Hide'}
          </button>
        </div>

        {!debugCollapsed && (
          <>
            <label className="journey-debug__row">
              <span>Manual Camera Slider</span>
              <input
                type="checkbox"
                checked={manualOverride}
                onChange={(e) => {
                  setManualOverride(e.target.checked)
                  if (e.target.checked) {
                    setManualU( Number(stateRef.current.currentU.toFixed(2)) )
                  }
                }}
              />
            </label>

            <input
              type="range"
              min="-0.35"
              max={JOURNEY_ENTRIES.length - 0.6}
              step="0.01"
              value={manualOverride ? manualU : focusedIndex}
              disabled={!manualOverride}
              onChange={(e) => setManualU(parseFloat(e.target.value))}
              className="journey-debug__slider"
            />

            <label className="journey-debug__row">
              <span>Show 3D Control Points</span>
              <input
                type="checkbox"
                checked={showControlPoints}
                onChange={(e) => setShowControlPoints(e.target.checked)}
              />
            </label>

            <div className="journey-debug__meta">
              <span>
                Card: #{String(focusedIndex + 1).padStart(2, '0')} (
                {JOURNEY_ENTRIES[focusedIndex]?.id})
              </span>
              <span>Bank: {debugBankDeg}°</span>
            </div>
          </>
        )}
      </aside>
    </section>
  )
}
