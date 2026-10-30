import React, { useRef, useEffect, useState, useMemo, useCallback } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useSmoothScroll } from '../../context/SmoothScrollContext'
import { useParticleStage } from '../canvas/ParticleStage'
import ScrollCue from '../common/ScrollCue'
import {
  JOURNEY_ENTRIES,
  JOURNEY_CATEGORIES,
  YEAR_MARKERS,
  JOURNEY_OUTRO,
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
  camOffsetX: -45,            // Camera lateral offset from spline centerline (desktop)
  camOffsetY: -95,            // Camera elevation: places cards directly in the middle-upper viewport
  camYawRad: 0.145,           // Subtle rightward look angle so spline winds to upper-right
  camPitchRad: -0.055,        // Subtle horizon pitch
  maxBankDeg: 3.0,            // Max camera banking roll (+/- 3deg) along S-curves
  dwellRadius: 0.22,          // +/- path units around each card where camera slows down
  dwellSpeedFactor: 0.35,     // Camera moves at 35% speed inside dwell zones
  majorWeightMultiplier: 1.3, // "major" entries receive +30% scroll length
  vhPerEntry: 85,             // Base scroll vh per entry
  introVh: 105,               // Intro scroll buffer (vh) for stroke reveal & heading
  outroVh: 115,               // Outro scroll buffer (vh) for horizon fade & closing frame
  cameraLerp: 0.12,           // Single light damping step in the render loop
  dustCountDesktop: 150,      // Sparse 3D dust specks around the rail on desktop
  dustCountMobile: 42,        // Reduced dust specks on <900px mobile
}

/**
 * Placement stances alternating relative to the path (left, right, above)
 * so neighbouring cards in 3D space never overlap on screen.
 */
const CARD_PLACEMENTS = [
  { stance: 'left', anchorXRatio: 0.64, stemHeight: 60, baseRotY: 7.0, baseRotZ: -1.8, sideSign: -1 },
  { stance: 'right', anchorXRatio: 0.36, stemHeight: 76, baseRotY: -7.5, baseRotZ: 2.0, sideSign: 1 },
  { stance: 'above', anchorXRatio: 0.50, stemHeight: 88, baseRotY: -4.0, baseRotZ: -1.2, sideSign: -0.6 },
  { stance: 'right', anchorXRatio: 0.32, stemHeight: 56, baseRotY: -8.0, baseRotZ: 2.2, sideSign: 1 },
  { stance: 'left', anchorXRatio: 0.68, stemHeight: 80, baseRotY: 7.5, baseRotZ: -2.2, sideSign: -1 },
]

/**
 * Generates deterministic 3D control points for the Catmull-Rom spline.
 * Indices run from k = -3 to N + 6 so the spline has smooth S-curves
 * from behind the camera all the way to the distant horizon.
 */
function buildSplineControlPoints(numEntries) {
  const pts = []
  const minK = -3
  const maxK = numEntries + 6

  for (let k = minK; k <= maxK; k++) {
    const swayX = 240 * Math.sin(k * 1.18 - 0.3) + 55 * Math.cos(k * 0.52)
    const waveY = 36 * Math.cos(k * 1.05 + 0.4)
    const z = k * JOURNEY_TUNING.stepZ

    pts.push({ k, x: swayX, y: waveY, z })
  }
  return { pts, minK, maxK }
}

/**
 * Evaluates a 3D point and tangent on the Catmull-Rom spline at continuous path parameter `u`.
 * `swayScale` allows mobile (<900px) to narrow the horizontal sway into a centered vertical S-curve.
 */
function evaluateSpline(splineData, u, swayScale = 1.0) {
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

  const x = (c0 * p0.x + c1 * p1.x + c2 * p2.x + c3 * p3.x) * swayScale
  const y = c0 * p0.y + c1 * p1.y + c2 * p2.y + c3 * p3.y
  const z = c0 * p0.z + c1 * p1.z + c2 * p2.z + c3 * p3.z

  // First derivative (tangent) for camera banking / curvature
  const d0 = -1.5 * t2 + 2.0 * t - 0.5
  const d1 = 4.5 * t2 - 5.0 * t
  const d2 = -4.5 * t2 + 4.0 * t + 0.5
  const d3 = 1.5 * t2 - t

  const tx = (d0 * p0.x + d1 * p1.x + d2 * p2.x + d3 * p3.x) * swayScale
  const ty = d0 * p0.y + d1 * p1.y + d2 * p2.y + d3 * p3.y
  const tz = d0 * p0.z + d1 * p1.z + d2 * p2.z + d3 * p3.z

  return { x, y, z, tx, ty, tz }
}

/**
 * Builds a lookup table mapping scroll progress (0..1) -> camera path position `u`
 * with explicit DWELL ZONES (+/- 0.22 around each integer card index) where the
 * camera moves at 35% speed, and major cards receive +30% scroll weight.
 * Includes an entry lead-in (uStart = -0.65) and an outro horizon run-out (uEnd = N - 1 + 1.45).
 */
function buildScrollToCameraLut(entries) {
  const n = entries.length
  const uStart = -0.65
  const uEnd = n - 1 + 1.45
  const samples = 2800
  const du = (uEnd - uStart) / samples

  const uValues = new Float32Array(samples + 1)
  const cumScroll = new Float32Array(samples + 1)

  const { dwellRadius, dwellSpeedFactor, majorWeightMultiplier } = JOURNEY_TUNING
  let acc = 0

  for (let s = 0; s <= samples; s++) {
    const u = uStart + s * du
    uValues[s] = u
    cumScroll[s] = acc

    const nearestIdx = Math.max(0, Math.min(n - 1, Math.round(u)))
    const distToCard = Math.abs(u - nearestIdx)
    const entry = entries[nearestIdx]
    const majorMult =
      u >= -0.25 && u <= n - 0.75 && entry?.size === 'major'
        ? majorWeightMultiplier
        : 1.0

    let speed = 1.0
    if (u >= -0.25 && u <= n - 0.75 && distToCard < dwellRadius) {
      const norm = distToCard / dwellRadius
      const smooth = norm * norm * (3 - 2 * norm)
      speed = dwellSpeedFactor + (1.0 - dwellSpeedFactor) * smooth
    }

    const scrollCost = (1.0 / speed) * majorMult
    acc += scrollCost * du
  }

  const totalScrollCost = cumScroll[samples] || 1
  for (let s = 0; s <= samples; s++) {
    cumScroll[s] /= totalScrollCost
  }

  return { uValues, cumScroll, samples, uStart, uEnd }
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
  const uMin = -1.2
  const uMax = numEntries + 3.5

  for (let i = 0; i < count; i++) {
    const u = uMin + (i / count) * (uMax - uMin) + (Math.random() - 0.5) * 0.4
    const center = evaluateSpline(splineData, u, 1.0)
    const spreadX = (Math.random() - 0.5) * 760
    const spreadY = (Math.random() - 0.5) * 320 + 25
    const spreadZ = (Math.random() - 0.5) * 260

    specks.push({
      baseX: center.x,
      spreadX,
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
  const headerMainRef = useRef(null)
  const categoryFillRef = useRef(null)
  const bottomProgressRef = useRef(null)
  const scrollCueWrapRef = useRef(null)
  const outroFrameRef = useRef(null)
  const exitCurtainRef = useRef(null)
  const mobileChipStripRef = useRef(null)
  const mobileChipRefs = useRef({})
  const cardRefs = useRef([])
  const stRef = useRef(null)

  const {
    scrollTo,
    setActiveTheme,
    setActiveSection,
    setActiveSectionIndex,
    setIsChromeHidden,
    updateProgress,
  } = useSmoothScroll()
  const { stage: particleStage } = useParticleStage()

  const [prefersReducedMotion, setPrefersReducedMotion] = useState(() =>
    typeof window !== 'undefined'
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false
  )
  const [activeCategory, setActiveCategory] = useState(JOURNEY_ENTRIES[0].category)
  const [focusedIndex, setFocusedIndex] = useState(0)
  const [activeYear, setActiveYear] = useState(JOURNEY_ENTRIES[0].year)
  const [nearCameraWindow, setNearCameraWindow] = useState(0)

  // Refs synced into the GSAP ticker loop
  const stateRef = useRef({
    targetU: -0.65,
    currentU: -0.65,
    scrollProgress: 0,
    isActive: false,
    lastFocusedIdx: 0,
    lastYear: JOURNEY_ENTRIES[0].year,
    pulseTimer: 0,
    pulseNodeIdx: 0,
    avgFrameMs: 16.6,
    slowFrameStreak: 0,
    lowPerfMode: false,
  })

  // Listen for OS prefers-reduced-motion changes
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const onChange = (e) => setPrefersReducedMotion(e.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  // Auto-scroll active mobile category chip into horizontal view
  useEffect(() => {
    const stripEl = mobileChipStripRef.current
    const chipEl = mobileChipRefs.current[activeCategory]
    if (!stripEl || !chipEl) return
    const targetLeft =
      chipEl.offsetLeft - stripEl.clientWidth / 2 + chipEl.clientWidth / 2
    stripEl.scrollTo({ left: Math.max(0, targetLeft), behavior: 'smooth' })
  }, [activeCategory])

  // Precompute spline, scroll LUT, and 3D dust
  const splineData = useMemo(
    () => buildSplineControlPoints(JOURNEY_ENTRIES.length),
    []
  )
  const scrollLut = useMemo(
    () => buildScrollToCameraLut(JOURNEY_ENTRIES),
    []
  )
  const dustSpecks = useMemo(
    () =>
      generateDustParticles(
        splineData,
        JOURNEY_ENTRIES.length,
        JOURNEY_TUNING.dustCountDesktop
      ),
    [splineData]
  )

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

  // Ensure all cards are hidden initially before scroll / projection runs
  useEffect(() => {
    if (prefersReducedMotion) return
    cardRefs.current.forEach((cardEl) => {
      if (cardEl) {
        cardEl.style.display = 'none'
        cardEl.style.opacity = '0'
      }
    })
  }, [prefersReducedMotion])

  // Jump to a specific card index (used by Category Index & keyboard card focus)
  const scrollToCardIndex = useCallback(
    (targetIdx, duration = 1.35) => {
      if (targetIdx < 0 || targetIdx >= JOURNEY_ENTRIES.length) return

      if (prefersReducedMotion) {
        const cardEl = cardRefs.current[targetIdx]
        if (cardEl) {
          cardEl.scrollIntoView({ behavior: 'auto', block: 'center' })
        }
        setFocusedIndex(targetIdx)
        setActiveCategory(JOURNEY_ENTRIES[targetIdx].category)
        setActiveYear(JOURNEY_ENTRIES[targetIdx].year)
        return
      }

      const st = stRef.current
      if (!st) return
      const normP = findScrollProgressForCard(scrollLut, targetIdx)
      const targetScrollY = st.start + normP * (st.end - st.start)
      scrollTo(targetScrollY, {
        duration,
        easing: (t) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t)),
      })
    },
    [prefersReducedMotion, scrollLut, scrollTo]
  )

  // Jump to first entry of a clicked category in the left sidebar or mobile strip
  const handleCategoryClick = useCallback(
    (category) => {
      const targetIdx = JOURNEY_ENTRIES.findIndex(
        (e) => e.category === category
      )
      if (targetIdx === -1) return
      scrollToCardIndex(targetIdx, 1.45)
    },
    [scrollToCardIndex]
  )

  // Skip Timeline / Continue button: 1.6s expo ease to #contact
  const handleSkipTimeline = useCallback(() => {
    setIsChromeHidden(false)
    updateProgress('experience', 1)
    scrollTo('#contact', {
      duration: 1.6,
      easing: (t) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t)),
    })
  }, [scrollTo, setIsChromeHidden, updateProgress])

  // Keyboard accessibility: focusing a card brings that card into 3D focus
  const handleCardKeyboardFocus = useCallback(
    (idx) => {
      if (prefersReducedMotion) {
        setFocusedIndex(idx)
        setActiveCategory(JOURNEY_ENTRIES[idx].category)
        setActiveYear(JOURNEY_ENTRIES[idx].year)
        return
      }
      if (Math.abs(stateRef.current.currentU - idx) > 0.25) {
        scrollToCardIndex(idx, 1.1)
      }
    },
    [prefersReducedMotion, scrollToCardIndex]
  )

  // Reduced-motion scroll tracking
  useEffect(() => {
    if (!prefersReducedMotion) return
    const sectionEl = sectionRef.current
    if (!sectionEl) return

    const st = ScrollTrigger.create({
      trigger: sectionEl,
      start: 'top 60%',
      end: 'bottom 40%',
      onEnter: () => {
        setActiveSection('experience')
        setActiveSectionIndex('04')
        setActiveTheme('dark')
        particleStage.setVisibility(0)
      },
      onEnterBack: () => {
        setActiveSection('experience')
        setActiveSectionIndex('04')
        setActiveTheme('dark')
        particleStage.setVisibility(0)
      },
      onUpdate: (self) => {
        updateProgress('experience', self.progress)
        const idx = Math.min(
          JOURNEY_ENTRIES.length - 1,
          Math.floor(self.progress * JOURNEY_ENTRIES.length)
        )
        setFocusedIndex(idx)
        setActiveCategory(JOURNEY_ENTRIES[idx].category)
        setActiveYear(JOURNEY_ENTRIES[idx].year)
      },
    })

    return () => {
      st.kill()
      setIsChromeHidden(false)
    }
  }, [
    prefersReducedMotion,
    setActiveSection,
    setActiveSectionIndex,
    setActiveTheme,
    setIsChromeHidden,
    updateProgress,
    particleStage,
  ])

  // Main 3D ScrollTrigger + Canvas 2D & DOM Projection Loop
  useEffect(() => {
    if (prefersReducedMotion) return

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
        setIsChromeHidden(true)
        particleStage.setVisibility(0)
      },
      onEnterBack: () => {
        stateRef.current.isActive = true
        setActiveSection('experience')
        setActiveSectionIndex('04')
        setActiveTheme('dark')
        setIsChromeHidden(true)
        particleStage.setVisibility(0)
      },
      onLeave: () => {
        stateRef.current.isActive = false
        setIsChromeHidden(false)
        updateProgress('experience', 1)
        setActiveSection('contact')
        setActiveSectionIndex('05')
      },
      onLeaveBack: () => {
        stateRef.current.isActive = false
        setIsChromeHidden(false)
        updateProgress('experience', 0)
        setActiveSection('projects')
        setActiveSectionIndex('03')
      },
      onUpdate: (self) => {
        const p = self.progress
        stateRef.current.scrollProgress = p
        updateProgress('experience', p)
        stateRef.current.targetU = mapScrollProgressToU(scrollLut, p)
      },
    })
    stRef.current = st

    // Render frame function synced to gsap.ticker
    const renderFrame = (time, deltaTime) => {
      const s = stateRef.current
      if (!s.isActive) return

      const rawDtMs = deltaTime || 16.6
      const dt = Math.min(0.05, rawDtMs / 1000)

      // Auto-scale dust & blur if frame time exceeds 22ms sustained
      s.avgFrameMs = s.avgFrameMs * 0.92 + rawDtMs * 0.08
      if (s.avgFrameMs > 22.5) {
        s.slowFrameStreak += 1
        if (s.slowFrameStreak > 35 && !s.lowPerfMode) {
          s.lowPerfMode = true
        }
      } else {
        s.slowFrameStreak = Math.max(0, s.slowFrameStreak - 1)
      }

      const isMobile = vw < 900
      const swayScale = isMobile ? 0.36 : 1.0

      // 1. Update camera path position u with single light damping step (lerp ~0.12)
      s.currentU += (s.targetU - s.currentU) * JOURNEY_TUNING.cameraLerp
      const camU = s.currentU
      const numEntries = JOURNEY_ENTRIES.length
      const maxCardIdx = numEntries - 1

      // Overall normalized progress [0..1]
      const progressNorm = s.scrollProgress

      // Update vertical category line red fill & bottom edge progress line
      if (categoryFillRef.current) {
        categoryFillRef.current.style.transform = `scaleY(${progressNorm.toFixed(4)})`
      }
      if (bottomProgressRef.current) {
        bottomProgressRef.current.style.transform = `scaleX(${progressNorm.toFixed(4)})`
      }

      // 2. Entry Heading Collapse:
      // Fully visible at start (camU <= -0.15), collapses & fades as first card comes into focus (camU: -0.15 -> 0.55)
      if (headerMainRef.current) {
        const entryReveal = smoothstep(-0.68, -0.35, camU)
        const collapseT = smoothstep(-0.12, 0.55, camU)
        const headerAlpha = entryReveal * (1 - collapseT)
        const headerScale = 1 - 0.09 * collapseT
        const headerY = (1 - entryReveal) * 14 - collapseT * 12

        headerMainRef.current.style.opacity = headerAlpha.toFixed(3)
        headerMainRef.current.style.transform = `translate3d(0, ${headerY.toFixed(
          1
        )}px, 0) scale(${headerScale.toFixed(3)})`
        headerMainRef.current.style.pointerEvents =
          headerAlpha > 0.15 ? 'auto' : 'none'
      }

      // 3. Bottom-Center Scroll Cue (visible during first part only)
      if (scrollCueWrapRef.current) {
        const cueAlpha =
          smoothstep(-0.62, -0.32, camU) * (1 - smoothstep(0.05, 0.65, camU))
        scrollCueWrapRef.current.style.opacity = cueAlpha.toFixed(3)
      }

      // 4. Outro / Closing Frame ("To be continued..." + "CONTINUE ->") & Soft Exit Crossfade
      const outroStartU = maxCardIdx + 0.32
      const outroFullU = maxCardIdx + 0.85
      const outroProgress = smoothstep(outroStartU, outroFullU, camU)
      const horizonFadeOut = 1 - smoothstep(maxCardIdx + 0.45, maxCardIdx + 1.32, camU)

      if (outroFrameRef.current) {
        const outroY = (1 - outroProgress) * 18
        outroFrameRef.current.style.opacity = outroProgress.toFixed(3)
        outroFrameRef.current.style.transform = `translate3d(-50%, calc(-50% + ${outroY.toFixed(
          1
        )}px), 0)`
        outroFrameRef.current.style.pointerEvents =
          outroProgress > 0.45 ? 'auto' : 'none'
      }

      if (exitCurtainRef.current) {
        const exitFade = smoothstep(0.95, 1.0, progressNorm)
        exitCurtainRef.current.style.opacity = (exitFade * 0.65).toFixed(3)
      }

      // Track nearest focused card, active category, and active year
      const nearestIdx = Math.max(0, Math.min(maxCardIdx, Math.round(camU)))
      if (nearestIdx !== s.lastFocusedIdx) {
        s.lastFocusedIdx = nearestIdx
        s.pulseNodeIdx = nearestIdx
        s.pulseTimer = 0
        setFocusedIndex(nearestIdx)
        setActiveCategory(JOURNEY_ENTRIES[nearestIdx].category)

        const newYear = JOURNEY_ENTRIES[nearestIdx].year
        if (newYear !== s.lastYear) {
          s.lastYear = newYear
          setActiveYear(newYear)
        }
      }
      if (Math.abs(nearestIdx - nearCameraWindow) >= 1) {
        setNearCameraWindow(nearestIdx)
      }
      s.pulseTimer += dt

      // 5. Compute Virtual Camera Pose on the 3D Rail
      const focusPt = evaluateSpline(splineData, camU, swayScale)
      const lookAheadPt = evaluateSpline(splineData, camU + 1.5, swayScale)

      const camOffsetX = isMobile ? 0 : JOURNEY_TUNING.camOffsetX
      const camOffsetY = isMobile ? -85 : JOURNEY_TUNING.camOffsetY
      const camYaw = isMobile ? 0.035 : JOURNEY_TUNING.camYawRad
      const camPitch = isMobile ? -0.045 : JOURNEY_TUNING.camPitchRad

      const camX = focusPt.x * 0.58 + camOffsetX
      const camY = focusPt.y * 0.65 + camOffsetY
      const camZ = focusPt.z - JOURNEY_TUNING.focusDistZ

      // Subtle camera banking roll (+/- 3 deg) proportional to lateral curvature
      const curvatureX = (lookAheadPt.tx - focusPt.tx) / JOURNEY_TUNING.stepZ
      const maxBank = isMobile ? 1.2 : JOURNEY_TUNING.maxBankDeg
      const bankRad = Math.max(
        (-maxBank * Math.PI) / 180,
        Math.min((maxBank * Math.PI) / 180, curvatureX * 0.22)
      )
      const cosRoll = Math.cos(bankRad)
      const sinRoll = Math.sin(bankRad)

      const focal =
        JOURNEY_TUNING.focalLength *
        (isMobile ? Math.max(0.68, vw / 960) : vw / 1440)

      // Reserve a ~240px left gutter on desktop so the left Journey Index never overlaps cards
      const leftGutterPx = isMobile ? 16 : Math.min(260, Math.max(220, vw * 0.17))
      const screenCenterX = isMobile
        ? vw * 0.5
        : Math.max(leftGutterPx + 240, vw * 0.52)
      // Elevated projection center placed in upper-middle viewport
      const screenCenterY = isMobile ? vh * 0.46 : vh * 0.44

      const cosYaw = Math.cos(camYaw)
      const sinYaw = Math.sin(camYaw)
      const cosPitch = Math.cos(camPitch)
      const sinPitch = Math.sin(camPitch)

      const projectPoint = (wx, wy, wz) => {
        const dx = wx - camX
        const dy = wy - camY
        const dz = wz - camZ

        const rx1 = dx * cosYaw - dz * sinYaw
        const rz1 = dx * sinYaw + dz * cosYaw

        const ry2 = dy * cosPitch - rz1 * sinPitch
        const rz2 = dy * sinPitch + rz1 * cosPitch

        if (rz2 <= 45) return null

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

      // 6. Entry Stroke Reveal & Dust Alpha
      const entryLineReveal = smoothstep(-0.65, -0.10, camU)
      const dustGlobalAlpha = smoothstep(-0.60, -0.15, camU) * horizonFadeOut

      ctx.save()
      ctx.scale(dpr, dpr)
      ctx.clearRect(0, 0, vw, vh)

      // Draw 3D Atmospheric Dust
      const activeDustLimit = isMobile
        ? JOURNEY_TUNING.dustCountMobile
        : s.lowPerfMode
        ? Math.floor(dustSpecks.length * 0.5)
        : dustSpecks.length

      if (dustGlobalAlpha > 0.01) {
        for (let i = 0; i < activeDustLimit; i++) {
          const sp = dustSpecks[i]
          const driftX = Math.sin(time * sp.speed + sp.phase) * 14
          const driftY = Math.cos(time * sp.speed * 0.8 + sp.phase) * 9
          const wx = sp.baseX * swayScale + sp.spreadX * swayScale + driftX
          const proj = projectPoint(wx, sp.y + driftY, sp.z)
          if (!proj || proj.depthZ > 3200 || proj.depthZ < 120) continue

          const distFade =
            smoothstep(3200, 1800, proj.depthZ) *
            smoothstep(120, 350, proj.depthZ)
          const alpha = sp.alpha * distFade * dustGlobalAlpha
          if (alpha < 0.02) continue

          const radius = Math.max(
            0.6,
            Math.min(2.4, sp.size * proj.scale * 1.15)
          )
          ctx.fillStyle = sp.isRed
            ? `rgba(232, 40, 60, ${(alpha * 1.15).toFixed(3)})`
            : `rgba(245, 242, 238, ${alpha.toFixed(3)})`
          ctx.beginPath()
          ctx.arc(proj.sx, proj.sy, radius, 0, Math.PI * 2)
          ctx.fill()
        }
      }

      // 7. Sample & Draw the Winding 3D Spline Path with Entry Draw-In & Outro Horizon Fade
      const uMinDraw = camU - 1.18
      const maxDrawSpan = (isMobile ? 2.85 : 4.15) * (0.18 + 0.82 * entryLineReveal)
      const uMaxDraw = camU + maxDrawSpan
      const stepU = 0.035
      const projectedCurve = []

      for (let u = uMinDraw; u <= uMaxDraw; u += stepU) {
        const pt = evaluateSpline(splineData, u, swayScale)
        const proj = projectPoint(pt.x, pt.y, pt.z)
        if (proj) {
          projectedCurve.push({ u, ...proj })
        }
      }

      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'

      for (let i = projectedCurve.length - 1; i >= 1; i--) {
        const pA = projectedCurve[i]
        const pB = projectedCurve[i - 1]
        const uMid = 0.5 * (pA.u + pB.u)
        const d = uMid - camU

        const baseWidth = Math.max(0.55, Math.min(2.6, 1.9 * pA.scale))

        if (d > 0) {
          const farFade = smoothstep(maxDrawSpan, 0.2, d)
          const alpha = (0.12 + 0.42 * farFade) * horizonFadeOut
          if (alpha > 0.01) {
            ctx.strokeStyle = `rgba(245, 242, 238, ${alpha.toFixed(3)})`
            ctx.lineWidth = baseWidth
            ctx.beginPath()
            ctx.moveTo(pA.sx, pA.sy)
            ctx.lineTo(pB.sx, pB.sy)
            ctx.stroke()
          }
        } else {
          const nearFade = smoothstep(-1.18, -0.35, d) * horizonFadeOut
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

          if (coreAlpha > 0.01) {
            ctx.strokeStyle = `rgba(245, 242, 238, ${coreAlpha.toFixed(3)})`
            ctx.lineWidth = baseWidth * 1.15
            ctx.beginPath()
            ctx.moveTo(pA.sx, pA.sy)
            ctx.lineTo(pB.sx, pB.sy)
            ctx.stroke()
          }
        }
      }

      // 8. Project Each Card, Draw Node Dots & 1px Stems on Canvas, and Position DOM Cards
      const maxVisibleAhead = isMobile ? 2.35 : 3.5
      for (let i = numEntries - 1; i >= 0; i--) {
        const cardEl = cardRefs.current[i]
        const d = i - camU

        // Outside lifecycle bounds or unrevealed during entry stroke draw: hide completely
        if (d > maxVisibleAhead || d < -1.2 || i > uMaxDraw - 0.15) {
          if (cardEl) {
            cardEl.style.display = 'none'
            cardEl.style.opacity = '0'
          }
          continue
        }

        const nodePt = evaluateSpline(splineData, i, swayScale)
        const proj = projectPoint(nodePt.x, nodePt.y, nodePt.z)
        if (!proj) {
          if (cardEl) {
            cardEl.style.display = 'none'
            cardEl.style.opacity = '0'
          }
          continue
        }

        const placement = CARD_PLACEMENTS[i % CARD_PLACEMENTS.length]
        const anchorXRatio = isMobile ? 0.5 : placement.anchorXRatio

        let cardScale = 1
        let cardOpacity = 1
        let blurPx = 0
        let rotY = isMobile ? placement.baseRotY * 0.35 : placement.baseRotY
        let rotZ = isMobile ? placement.baseRotZ * 0.35 : placement.baseRotZ
        let rotX = isMobile ? 0.8 : 1.2
        let floatOffsetY = 0
        let recedeOffsetX = 0
        let recedeOffsetY = 0
        let stemAlpha = 1

        if (d > 1.0) {
          const tEmerge = smoothstep(maxVisibleAhead, 1.0, d)
          cardScale = isMobile
            ? 0.24 + 0.38 * tEmerge
            : 0.16 + 0.42 * tEmerge
          cardOpacity = (isMobile ? 0.38 : 0.55) * tEmerge
          blurPx =
            isMobile || s.lowPerfMode
              ? 0
              : Math.round((1 - tEmerge) * 3.5 * 2) / 2
          rotY =
            (isMobile ? placement.baseRotY * 0.35 : placement.baseRotY) +
            placement.sideSign * (1 - tEmerge) * (isMobile ? 6 : 16)
          rotZ =
            (isMobile ? placement.baseRotZ * 0.35 : placement.baseRotZ) *
            (1.4 - 0.4 * tEmerge)
          stemAlpha = tEmerge * 0.75
        } else if (d >= 0) {
          const tApp = smoothstep(1.0, 0.0, d)
          cardScale = (isMobile ? 0.62 : 0.58) + (isMobile ? 0.38 : 0.42) * tApp
          cardOpacity =
            (isMobile ? 0.38 : 0.55) +
            (isMobile ? 0.62 : 0.45) * smoothstep(1.0, 0.22, d)
          blurPx =
            isMobile || s.lowPerfMode
              ? 0
              : d > 0.45
              ? Math.round(((d - 0.45) / 0.55) * 1.5 * 2) / 2
              : 0
          rotY =
            (isMobile ? placement.baseRotY * 0.35 : placement.baseRotY) *
            (1.15 - 0.15 * tApp)
          rotZ = isMobile ? placement.baseRotZ * 0.35 : placement.baseRotZ

          const focusWeight = smoothstep(0.35, 0.0, Math.abs(d))
          floatOffsetY = Math.sin(time * 1.7 + i) * 3.0 * focusWeight
          stemAlpha = 0.75 + 0.25 * tApp
        } else {
          // RECEDE (d: 0.0 -> -1.2)
          const r = smoothstep(0.0, -1.2, d)
          cardScale = 1.0 - 0.54 * r
          cardOpacity = Math.pow(1.0 - r, 1.35)
          blurPx =
            isMobile || s.lowPerfMode ? 0 : Math.round(r * 3.5 * 2) / 2
          rotY =
            (isMobile ? placement.baseRotY * 0.35 : placement.baseRotY) +
            placement.sideSign * r * (isMobile ? 10 : 24)
          rotZ =
            (isMobile ? placement.baseRotZ * 0.35 : placement.baseRotZ) +
            placement.sideSign * r * (isMobile ? 2 : 4)
          recedeOffsetX = placement.sideSign * r * (isMobile ? 75 : 195)
          recedeOffsetY = -r * 38
          stemAlpha = Math.max(0, 1.0 - r * 1.6)
        }

        // Stem screen length & left-gutter guard on desktop
        const stemLen = (isMobile ? 44 : placement.stemHeight) * cardScale
        const approxHalfCardW =
          (JOURNEY_ENTRIES[i].size === 'major' ? 270 : 200) * cardScale
        const minSafeAttachX = isMobile
          ? vw * 0.5
          : leftGutterPx + approxHalfCardW * (2 * anchorXRatio)

        const rawAttachX = isMobile
          ? vw * 0.5 + (proj.sx - vw * 0.5) * 0.35 + recedeOffsetX
          : Math.max(minSafeAttachX, proj.sx + recedeOffsetX)
        const attachY = proj.sy - stemLen + floatOffsetY + recedeOffsetY

        // Draw 1px Stem (warm grey at card bottom -> accent red at node)
        if (stemAlpha > 0.02) {
          const grad = ctx.createLinearGradient(
            rawAttachX,
            attachY,
            proj.sx,
            proj.sy
          )
          grad.addColorStop(
            0,
            `rgba(245, 242, 238, ${(stemAlpha * 0.36).toFixed(3)})`
          )
          grad.addColorStop(
            1,
            `rgba(232, 40, 60, ${(stemAlpha * 0.85).toFixed(3)})`
          )

          ctx.strokeStyle = grad
          ctx.lineWidth = 1
          ctx.beginPath()
          ctx.moveTo(rawAttachX, attachY)
          ctx.lineTo(proj.sx, proj.sy)
          ctx.stroke()
        }

        // Draw Node Dot on the Spline (warm white core + thin red ring)
        const isFocusedNode = Math.abs(d) < 0.24
        const nodeAlpha =
          d >= 0
            ? smoothstep(maxVisibleAhead, 0.8, d)
            : smoothstep(-1.2, -0.2, d)

        if (nodeAlpha > 0.02) {
          const ringRadius =
            (isFocusedNode ? 7.5 : 5.2) *
            Math.min(1.2, Math.max(0.55, cardScale))
          const coreRadius =
            (isFocusedNode ? 3.2 : 2.2) *
            Math.min(1.2, Math.max(0.55, cardScale))

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

          ctx.fillStyle = `rgba(20, 20, 22, ${(nodeAlpha * 0.9).toFixed(3)})`
          ctx.strokeStyle = `rgba(232, 40, 60, ${(
            nodeAlpha * (isFocusedNode ? 0.95 : 0.65)
          ).toFixed(3)})`
          ctx.lineWidth = isFocusedNode ? 1.6 : 1.1
          ctx.beginPath()
          ctx.arc(proj.sx, proj.sy, ringRadius, 0, Math.PI * 2)
          ctx.fill()
          ctx.stroke()

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
          cardEl.style.transformOrigin = `${anchorXRatio * 100}% 100%`
          cardEl.style.filter = blurPx > 0 ? `blur(${blurPx}px)` : 'none'
          cardEl.style.pointerEvents = Math.abs(d) < 0.65 ? 'auto' : 'none'

          cardEl.style.transform =
            `translate3d(${rawAttachX.toFixed(1)}px, ${attachY.toFixed(1)}px, 0) ` +
            `translate(${(-anchorXRatio * 100).toFixed(1)}%, -100%) ` +
            `scale(${cardScale.toFixed(3)}) ` +
            `rotateX(${rotX.toFixed(2)}deg) rotateY(${rotY.toFixed(
              2
            )}deg) rotateZ(${rotZ.toFixed(2)}deg)`
        }
      }

      ctx.restore()
    }

    gsap.ticker.add(renderFrame)

    return () => {
      window.removeEventListener('resize', updateCanvasSize)
      gsap.ticker.remove(renderFrame)
      st.kill()
      setIsChromeHidden(false)
    }
  }, [
    prefersReducedMotion,
    splineData,
    scrollLut,
    dustSpecks,
    totalPinVh,
    nearCameraWindow,
    setActiveSection,
    setActiveSectionIndex,
    setActiveTheme,
    setIsChromeHidden,
    updateProgress,
    particleStage,
  ])

  const focusedEntry = JOURNEY_ENTRIES[focusedIndex] || JOURNEY_ENTRIES[0]

  return (
    <section
      ref={sectionRef}
      id="experience"
      data-theme="dark"
      className={`journey-section ${
        prefersReducedMotion ? 'journey-section--reduced-motion' : ''
      }`}
      aria-label="04 The Journey Timeline"
    >
      {/* Anchor alias so #achievements links also resolve here */}
      <span id="achievements" className="journey-section__anchor" aria-hidden="true" />

      {/* Visually Hidden Polite Live Region for Screen Readers */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {`Journey category: ${activeCategory}, Year ${activeYear}. Milestone ${
          focusedIndex + 1
        } of ${JOURNEY_ENTRIES.length}: ${focusedEntry.title}`}
      </div>

      {/* 1. Matte Backdrop Vignette & Subtle Film Grain */}
      <div className="journey-section__vignette" aria-hidden="true" />
      <div className="journey-section__grain" aria-hidden="true" />

      {/* 2. Canvas 2D Layer: 3D Projected Spline, Travelled Line, Nodes, Stems & Dust */}
      {!prefersReducedMotion && (
        <canvas
          ref={canvasRef}
          className="journey-section__canvas"
          aria-hidden="true"
        />
      )}

      {/* 3. Fixed Editorial HUD: Skip Button (First Focusable Element!), Top-Left Masthead, Category Index, Year Marker */}
      <div className="journey-section__hud">
        {/* Top-Right Skip Timeline Pill — First Focusable Element in the Section */}
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

        {/* Top-Left Masthead ("04 | JOURNEY" stays visible; large "THE Journey" collapses after first card) */}
        <header className="journey-section__header">
          <div className="journey-section__eyebrow">
            <span className="journey-section__eyebrow-num">04</span>
            <span className="journey-section__eyebrow-sep" aria-hidden="true" />
            <span>JOURNEY</span>
          </div>

          <div
            ref={headerMainRef}
            className="journey-section__title-row"
          >
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

        {/* Desktop Left Category Navigation Track (>= 900px) */}
        <nav
          className="journey-categories"
          aria-label="Journey Categories"
        >
          <div className="journey-categories__line" aria-hidden="true">
            <div
              ref={categoryFillRef}
              className="journey-categories__line-fill"
            />
          </div>
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
                aria-current={isActive ? 'true' : undefined}
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

        {/* Bottom-Left Year Marker ("2022 / THE BEGINNING") — Cross-fades with 500ms rise & fade */}
        {!prefersReducedMotion && (
          <div
            className="journey-year-hud"
            aria-hidden="true"
          >
            <div key={activeYear} className="journey-year-hud__inner">
              <span className="journey-year-hud__year">{activeYear}</span>
              <span className="journey-year-hud__tagline">
                {YEAR_MARKERS[activeYear] || ''}
              </span>
            </div>
          </div>
        )}

        {/* Mobile (< 900px) Compact Horizontal Category Chip Strip */}
        <nav
          ref={mobileChipStripRef}
          className="journey-mobile-chips"
          aria-label="Journey Categories Mobile"
        >
          {JOURNEY_CATEGORIES.map((category) => {
            const isActive = activeCategory === category
            return (
              <button
                key={category}
                ref={(el) => (mobileChipRefs.current[category] = el)}
                type="button"
                onClick={() => handleCategoryClick(category)}
                className={`journey-mobile-chips__btn ${
                  isActive ? 'journey-mobile-chips__btn--active' : ''
                }`}
                aria-current={isActive ? 'true' : undefined}
              >
                <span className="journey-mobile-chips__dot" aria-hidden="true" />
                <span>{category}</span>
              </button>
            )
          })}
        </nav>

        {/* Bottom-Center Mouse Scroll Cue (First Part Only) */}
        {!prefersReducedMotion && (
          <div
            ref={scrollCueWrapRef}
            className="journey-section__scroll-cue"
          >
            <ScrollCue variant="centered" persistOnScroll={true} />
          </div>
        )}

        {/* Very Thin Bottom-Edge Progress Line (0..1) */}
        {!prefersReducedMotion && (
          <div className="journey-section__bottom-progress" aria-hidden="true">
            <div
              ref={bottomProgressRef}
              className="journey-section__bottom-progress-fill"
            />
          </div>
        )}
      </div>

      {/* 4. Ordered List (<ol>) of 14 Chronological Milestone Cards */}
      <div className="journey-section__stage-wrap">
        {prefersReducedMotion && (
          <svg
            className="journey-reduced-svg-line"
            viewBox="0 0 120 1400"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <path
              d="M60,0 C105,180 15,360 60,540 C105,720 15,900 60,1080 C95,1220 35,1320 60,1400"
              fill="none"
              stroke="rgba(232, 40, 60, 0.45)"
              strokeWidth="1.5"
            />
          </svg>
        )}

        <ol className="journey-section__stage">
          {JOURNEY_ENTRIES.map((entry, idx) => {
            const placement = CARD_PLACEMENTS[idx % CARD_PLACEMENTS.length]
            const isFocused = focusedIndex === idx
            const isNearCamera =
              prefersReducedMotion || Math.abs(idx - nearCameraWindow) <= 3
            const catNum = `No. ${String(idx + 1).padStart(2, '0')}`

            return (
              <li
                key={entry.id}
                ref={(el) => (cardRefs.current[idx] = el)}
                className={`journey-card-item journey-card--${entry.size} ${
                  isFocused ? 'journey-card--focused' : ''
                }`}
              >
                <article
                  tabIndex={0}
                  onFocus={() => handleCardKeyboardFocus(idx)}
                  className="journey-card__article"
                  aria-label={`${entry.year} ${entry.title} (${entry.category})`}
                >
                  {/* Left / Top Image or Certificate Tile */}
                  <PlaceholderArt entry={entry} isNearCamera={isNearCamera} />

                  {/* Right / Bottom Editorial Catalogue Copy */}
                  <div className="journey-card__body">
                    <div
                      className="journey-card__focus-tick"
                      aria-hidden="true"
                    />
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
                  {!prefersReducedMotion && (
                    <span
                      className="journey-card__stem-anchor"
                      style={{ left: `${placement.anchorXRatio * 100}%` }}
                      aria-hidden="true"
                    />
                  )}
                </article>
              </li>
            )
          })}
        </ol>
      </div>

      {/* 5. Closing / Outro Frame ("To be continued..." + "CONTINUE ->") */}
      <div
        ref={outroFrameRef}
        className={`journey-outro ${
          prefersReducedMotion ? 'journey-outro--static' : ''
        }`}
      >
        <span className="journey-outro__eyebrow">{JOURNEY_OUTRO.eyebrow}</span>
        <p className="journey-outro__text">{JOURNEY_OUTRO.closingLine}</p>
        <button
          type="button"
          onClick={handleSkipTimeline}
          className="journey-outro__btn"
        >
          <span>{JOURNEY_OUTRO.ctaLabel}</span>
          <span className="journey-outro__arrow" aria-hidden="true">
            →
          </span>
        </button>
      </div>

      {/* Soft Dark Exit Crossfade Curtain */}
      {!prefersReducedMotion && (
        <div
          ref={exitCurtainRef}
          className="journey-section__exit-curtain"
          aria-hidden="true"
        />
      )}
    </section>
  )
}
