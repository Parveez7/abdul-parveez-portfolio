import React, {
  useEffect,
  useRef,
  useState,
  useMemo,
  useCallback,
} from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useSmoothScroll } from '../../context/SmoothScrollContext';
import ScrollCue from '../common/ScrollCue';
import PlaceholderArt from './PlaceholderArt';
import {
  JOURNEY_SECTION_META,
  JOURNEY_CATEGORIES,
  CATEGORY_META,
  YEAR_MARKERS,
  JOURNEY_OUTRO,
  JOURNEY_CAMERA_CONFIG,
  JOURNEY_ENTRIES,
  getFirstEntryIndexByCategory,
} from '../../data/journey';
import './Journey.css';

gsap.registerPlugin(ScrollTrigger);

/* ============================================================================
 * 3D CATMULL-ROM SPLINE & PERSPECTIVE PROJECTION ENGINE (Pure Vanilla Math)
 * ============================================================================ */

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function smoothstep(edge0, edge1, x) {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

/**
 * Evaluate a 3D Catmull-Rom spline at normalized parameter u in [0, 1]
 */
function evalCatmullRom3D(points, u) {
  const n = points.length;
  if (n === 0) return { x: 0, y: 0, z: 0 };
  if (n === 1) return { ...points[0] };

  const scaled = clamp(u, 0, 1) * (n - 1);
  const seg = Math.min(Math.floor(scaled), n - 2);
  const t = scaled - seg;
  const t2 = t * t;
  const t3 = t2 * t;

  const p0 = points[Math.max(0, seg - 1)];
  const p1 = points[seg];
  const p2 = points[seg + 1];
  const p3 = points[Math.min(n - 1, seg + 2)];

  const x =
    0.5 *
    (2 * p1.x +
      (-p0.x + p2.x) * t +
      (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 +
      (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3);

  const y =
    0.5 *
    (2 * p1.y +
      (-p0.y + p2.y) * t +
      (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 +
      (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3);

  const z =
    0.5 *
    (2 * p1.z +
      (-p0.z + p2.z) * t +
      (2 * p0.z - 5 * p1.z + 4 * p2.z - p3.z) * t2 +
      (-p0.z + 3 * p1.z - 3 * p2.z + p3.z) * t3);

  return { x, y, z };
}

/**
 * Evaluate the unit tangent vector of the 3D Catmull-Rom spline at u in [0, 1]
 */
function evalCatmullRomTangent3D(points, u) {
  const eps = 0.0015;
  const a = evalCatmullRom3D(points, Math.max(0, u - eps));
  const b = evalCatmullRom3D(points, Math.min(1, u + eps));
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const dz = b.z - a.z;
  const len = Math.hypot(dx, dy, dz) || 1;
  return { x: dx / len, y: dy / len, z: dz / len };
}

/**
 * Build the 3D world spline control points and arc-length lookup table.
 * The path winds organically left-right (X), rises/dips through gentle
 * hills and valleys (Y), and advances steadily forward into depth (Z).
 */
function buildTimelineSpline(entryCount, isMobile = false) {
  const Z_SPACING = 340;
  const totalZ = (entryCount + 2.5) * Z_SPACING;
  const controlCount = (entryCount + 3) * 2;
  const controlPoints = [];

  const xAmp = isMobile ? 54 : 155;
  const yAmp = isMobile ? 28 : 66;

  for (let i = 0; i <= controlCount; i++) {
    const frac = i / controlCount;
    const z = frac * totalZ - Z_SPACING * 0.85;
    const wavePhase = frac * Math.PI * 4.2;
    const secondaryPhase = frac * Math.PI * 8.4 + 0.65;

    const x =
      Math.sin(wavePhase) * xAmp + Math.cos(secondaryPhase) * (xAmp * 0.28);
    const y =
      Math.cos(wavePhase * 0.85) * yAmp +
      Math.sin(secondaryPhase * 0.7) * (yAmp * 0.32);

    controlPoints.push({ x, y, z });
  }

  // Dense sample table (600 points) for fast world-Z -> spline parameter lookup
  const SAMPLE_COUNT = 600;
  const samples = new Array(SAMPLE_COUNT + 1);
  for (let i = 0; i <= SAMPLE_COUNT; i++) {
    const u = i / SAMPLE_COUNT;
    const pt = evalCatmullRom3D(controlPoints, u);
    const tan = evalCatmullRomTangent3D(controlPoints, u);
    samples[i] = { u, ...pt, tx: tan.x, ty: tan.y, tz: tan.z };
  }

  return {
    controlPoints,
    samples,
    Z_SPACING,
    totalZ,
  };
}

/**
 * Sample the spline at a given world Z coordinate via binary search
 */
function sampleSplineAtZ(spline, targetZ) {
  const { samples } = spline;
  const n = samples.length;
  if (targetZ <= samples[0].z) return samples[0];
  if (targetZ >= samples[n - 1].z) return samples[n - 1];

  let lo = 0;
  let hi = n - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (samples[mid].z <= targetZ) lo = mid;
    else hi = mid;
  }

  const a = samples[lo];
  const b = samples[hi];
  const span = b.z - a.z || 1;
  const t = clamp((targetZ - a.z) / span, 0, 1);

  return {
    u: lerp(a.u, b.u, t),
    x: lerp(a.x, b.x, t),
    y: lerp(a.y, b.y, t),
    z: targetZ,
    tx: lerp(a.tx, b.tx, t),
    ty: lerp(a.ty, b.ty, t),
    tz: lerp(a.tz, b.tz, t),
  };
}

/**
 * Compute cumulative scroll weights for entries so scroll progress [0..1]
 * maps smoothly to continuous entry-index space [0 .. N-1 + outroSpan].
 */
function buildEntryScrollMap(entries) {
  const { majorWeightMultiplier } = JOURNEY_CAMERA_CONFIG;
  const weights = entries.map((e) =>
    e.size === 'major' ? majorWeightMultiplier : 1.0
  );

  // Entry 0 starts at scroll offset 0; subsequent entries spaced by average weight
  const cumulative = [0];
  for (let i = 1; i < entries.length; i++) {
    const stepWeight = (weights[i - 1] + weights[i]) * 0.5;
    cumulative.push(cumulative[i - 1] + stepWeight);
  }

  // Reserve extra scroll weight at the end for the outro beat ("To be continued...")
  const outroWeight = 1.15;
  const totalWeight = cumulative[cumulative.length - 1] + outroWeight;

  return {
    weights,
    cumulative,
    outroWeight,
    totalWeight,
  };
}

/**
 * Convert overall scroll progress p in [0, 1] into continuous entry index s
 * where s = 0 is Entry 0 in focus, s = N-1 is final entry in focus,
 * and s > N-1 transitions into the closing outro frame.
 */
function scrollProgressToContinuousIndex(p, scrollMap) {
  const { cumulative, outroWeight, totalWeight } = scrollMap;
  const targetW = clamp(p, 0, 1) * totalWeight;
  const n = cumulative.length;
  const lastEntryW = cumulative[n - 1];

  if (targetW >= lastEntryW) {
    const outroT = clamp((targetW - lastEntryW) / outroWeight, 0, 1);
    return {
      continuousIndex: n - 1 + outroT * 1.15,
      outroProgress: outroT,
    };
  }

  // Binary search in cumulative weight table
  let lo = 0;
  let hi = n - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (cumulative[mid] <= targetW) lo = mid;
    else hi = mid;
  }

  const w0 = cumulative[lo];
  const w1 = cumulative[hi];
  const segT = clamp((targetW - w0) / (w1 - w0 || 1), 0, 1);

  return {
    continuousIndex: lo + segT,
    outroProgress: 0,
  };
}

/**
 * Convert a desired entry index i back into normalized scroll progress [0..1]
 */
function entryIndexToScrollProgress(index, scrollMap) {
  const { cumulative, totalWeight } = scrollMap;
  const clampedIdx = clamp(index, 0, cumulative.length - 1);
  return cumulative[clampedIdx] / (totalWeight || 1);
}

/**
 * Project a 3D world point (wx, wy, wz) into 2D screen space relative to camera
 */
function projectPoint3D(
  wx,
  wy,
  wz,
  cam,
  viewportW,
  viewportH,
  focalLength,
  opticalCenterX
) {
  // Translate relative to camera
  const dx = wx - cam.x;
  const dy = wy - cam.y;
  const dz = wz - cam.z;

  // Apply subtle camera yaw (around Y) and pitch (around X)
  const cosYaw = Math.cos(cam.yaw);
  const sinYaw = Math.sin(cam.yaw);
  const rx = dx * cosYaw - dz * sinYaw;
  const rz1 = dx * sinYaw + dz * cosYaw;

  const cosPitch = Math.cos(cam.pitch);
  const sinPitch = Math.sin(cam.pitch);
  const ry = dy * cosPitch - rz1 * sinPitch;
  const rz = dy * sinPitch + rz1 * cosPitch;

  if (rz <= 18) {
    return null;
  }

  const scale = focalLength / rz;
  const screenX = opticalCenterX + rx * scale;
  const screenY = viewportH * 0.54 - ry * scale;

  return {
    x: screenX,
    y: screenY,
    z: rz,
    scale,
  };
}

/**
 * Generate 48 deterministic ambient dust motes distributed in 3D space
 * along the full length of the spline.
 */
function buildAmbientDustMotes(totalZ) {
  const count = 48;
  const motes = [];
  for (let i = 0; i < count; i++) {
    // Deterministic Halton-like pseudo-random distribution
    const s1 = Math.sin(i * 12.9898 + 78.233) * 43758.5453;
    const s2 = Math.sin(i * 93.9898 + 19.133) * 24634.6345;
    const s3 = Math.sin(i * 45.164 + 37.719) * 19532.1123;
    const r1 = s1 - Math.floor(s1);
    const r2 = s2 - Math.floor(s2);
    const r3 = s3 - Math.floor(s3);

    motes.push({
      xOffset: (r1 - 0.5) * 760,
      yOffset: (r2 - 0.5) * 420,
      z: r3 * totalZ,
      radius: 0.75 + (i % 3) * 0.4,
      baseAlpha: 0.14 + (i % 4) * 0.05,
    });
  }
  return motes;
}

/* ============================================================================
 * MAIN COMPONENT: Journey (Section 05)
 * ============================================================================ */

export default function Journey() {
  const {
    scrollTo,
    setActiveTheme,
    setActiveSection,
    setActiveSectionIndex,
    setIsChromeHidden,
    updateProgress,
  } = useSmoothScroll();

  const sectionRef = useRef(null);
  const canvasRef = useRef(null);
  const stageRef = useRef(null);
  const cardRefs = useRef([]);
  const headerTitleRef = useRef(null);
  const scrollCueWrapRef = useRef(null);
  const bottomProgressFillRef = useRef(null);
  const categoryLineFillRef = useRef(null);
  const outroRef = useRef(null);
  const exitCurtainRef = useRef(null);

  const [focusedIndex, setFocusedIndex] = useState(0);
  const [activeCategory, setActiveCategory] = useState(
    JOURNEY_ENTRIES[0]?.category || JOURNEY_CATEGORIES[0]
  );
  const [activeYear, setActiveYear] = useState(JOURNEY_ENTRIES[0]?.year || 2022);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  // Mutable animation state (zero React re-renders per frame)
  const animStateRef = useRef({
    targetProgress: 0,
    smoothProgress: 0,
    isActive: false,
    rafId: null,
    viewportW: typeof window !== 'undefined' ? window.innerWidth : 1440,
    viewportH: typeof window !== 'undefined' ? window.innerHeight : 900,
    dpr:
      typeof window !== 'undefined'
        ? Math.min(window.devicePixelRatio || 1, 2)
        : 1,
    isMobile:
      typeof window !== 'undefined' ? window.innerWidth < 900 : false,
    lastFocusedIdx: 0,
    lastCategory: JOURNEY_ENTRIES[0]?.category || JOURNEY_CATEGORIES[0],
    lastYear: JOURNEY_ENTRIES[0]?.year || 2022,
  });

  // ScrollTrigger instance reference for programmatic jumps
  const stRef = useRef(null);

  // Precompute scroll weight map for the 11 entries
  const scrollMap = useMemo(() => buildEntryScrollMap(JOURNEY_ENTRIES), []);

  // Precompute spline & entry 3D world positions
  const sceneGraph = useMemo(() => {
    const splineDesktop = buildTimelineSpline(JOURNEY_ENTRIES.length, false);
    const splineMobile = buildTimelineSpline(JOURNEY_ENTRIES.length, true);
    const motes = buildAmbientDustMotes(splineDesktop.totalZ);

    const computeEntryWorldPositions = (spline, isMob) =>
      JOURNEY_ENTRIES.map((entry, i) => {
        const nodeZ = (i + 0.65) * spline.Z_SPACING;
        const sample = sampleSplineAtZ(spline, nodeZ);
        // Alternating left/right placement; cards sit slightly above spline
        const side = i % 2 === 0 ? -1 : 1;
        const lateralOffset = isMob
          ? side * 26
          : side * 106;
        const verticalLift = isMob
          ? 74
          : entry.layout === 'top'
          ? 92
          : 98;

        return {
          index: i,
          side,
          nodeX: sample.x,
          nodeY: sample.y,
          nodeZ: sample.z,
          anchorX: sample.x + lateralOffset,
          anchorY: sample.y + verticalLift,
          anchorZ: sample.z,
        };
      });

    return {
      desktop: {
        spline: splineDesktop,
        entries3D: computeEntryWorldPositions(splineDesktop, false),
      },
      mobile: {
        spline: splineMobile,
        entries3D: computeEntryWorldPositions(splineMobile, true),
      },
      motes,
    };
  }, []);

  // Detect prefers-reduced-motion
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return undefined;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const updateMotionPref = () => setPrefersReducedMotion(mq.matches);
    updateMotionPref();
    mq.addEventListener('change', updateMotionPref);
    return () => mq.removeEventListener('change', updateMotionPref);
  }, []);

  /**
   * Core per-frame render function (Canvas 2D spline + stems + dust + DOM 3D cards)
   */
  const renderSceneFrame = useCallback(
    (progress) => {
      const state = animStateRef.current;
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const { viewportW: width, viewportH: height, dpr, isMobile } = state;
      const graph = isMobile ? sceneGraph.mobile : sceneGraph.desktop;
      const { spline, entries3D } = graph;
      const { motes } = sceneGraph;

      // Map scroll progress [0..1] -> continuous entry index s & outro progress
      const { continuousIndex, outroProgress } =
        scrollProgressToContinuousIndex(progress, scrollMap);

      // Camera world Z tracks continuousIndex along the spline
      const camTargetZ = (continuousIndex + 0.65) * spline.Z_SPACING;
      const camZ = camTargetZ - 320;
      const camSample = sampleSplineAtZ(spline, camZ);
      const lookSample = sampleSplineAtZ(spline, camTargetZ);

      // Camera sits slightly above the spline and Gently banks into turns
      const cam = {
        x: lerp(camSample.x, lookSample.x, 0.35),
        y: lerp(camSample.y, lookSample.y, 0.35) + (isMobile ? 54 : 68),
        z: camZ,
        yaw: clamp((lookSample.x - camSample.x) * 0.00055, -0.14, 0.14),
        pitch: -0.075,
      };

      const focalLength = isMobile
        ? Math.min(width, height) * 0.88
        : Math.min(width, height) * 0.92;

      // Shift optical center slightly right on desktop to respect the 240px left category gutter
      const leftGutterPx = isMobile ? 16 : Math.max(230, width * 0.17);
      const opticalCenterX = isMobile
        ? width * 0.5
        : leftGutterPx + (width - leftGutterPx) * 0.49;

      // Clear 2D Canvas
      ctx.save();
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);

      // ----------------------------------------------------------------------
      // 1. Render Sparse Ambient Dust Motes (max 48, no glow)
      // ----------------------------------------------------------------------
      for (let i = 0; i < motes.length; i++) {
        const m = motes[i];
        const dz = m.z - cam.z;
        if (dz <= 40 || dz > 1850) continue;

        const sp = sampleSplineAtZ(spline, m.z);
        const proj = projectPoint3D(
          sp.x + m.xOffset,
          sp.y + m.yOffset,
          m.z,
          cam,
          width,
          height,
          focalLength,
          opticalCenterX
        );
        if (!proj) continue;

        const depthFade =
          smoothstep(40, 220, dz) * (1 - smoothstep(1100, 1850, dz));
        const alpha = m.baseAlpha * depthFade * (1 - outroProgress * 0.7);
        if (alpha <= 0.01) continue;

        ctx.fillStyle = `rgba(245, 242, 238, ${alpha.toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(
          proj.x,
          proj.y,
          Math.max(0.6, m.radius * clamp(proj.scale * 0.9, 0.5, 1.6)),
          0,
          Math.PI * 2
        );
        ctx.fill();
      }

      // ----------------------------------------------------------------------
      // 2. Project & Draw the Winding 3D Spline (Future Line + Travelled Line)
      // ----------------------------------------------------------------------
      const zStart = cam.z + 24;
      const zEnd = cam.z + 1850;
      const STEP_COUNT = 96;
      const zStep = (zEnd - zStart) / STEP_COUNT;

      const projectedSplinePts = [];
      for (let i = 0; i <= STEP_COUNT; i++) {
        const wz = zStart + i * zStep;
        const sp = sampleSplineAtZ(spline, wz);
        const proj = projectPoint3D(
          sp.x,
          sp.y,
          wz,
          cam,
          width,
          height,
          focalLength,
          opticalCenterX
        );
        if (proj) {
          projectedSplinePts.push({
            ...proj,
            wz,
          });
        }
      }

      if (projectedSplinePts.length > 1) {
        // 2a. Untravelled / Future Path: thin warm-white hairline
        ctx.beginPath();
        ctx.moveTo(projectedSplinePts[0].x, projectedSplinePts[0].y);
        for (let i = 1; i < projectedSplinePts.length; i++) {
          const prev = projectedSplinePts[i - 1];
          const curr = projectedSplinePts[i];
          const midX = (prev.x + curr.x) * 0.5;
          const midY = (prev.y + curr.y) * 0.5;
          ctx.quadraticCurveTo(prev.x, prev.y, midX, midY);
        }
        const lastPt = projectedSplinePts[projectedSplinePts.length - 1];
        ctx.lineTo(lastPt.x, lastPt.y);

        const futureGrad = ctx.createLinearGradient(
          0,
          height,
          0,
          height * 0.28
        );
        futureGrad.addColorStop(0, 'rgba(245, 242, 238, 0.34)');
        futureGrad.addColorStop(0.55, 'rgba(245, 242, 238, 0.20)');
        futureGrad.addColorStop(1, 'rgba(245, 242, 238, 0.02)');
        ctx.strokeStyle = futureGrad;
        ctx.lineWidth = 1.35;
        ctx.stroke();

        // 2b. Travelled Path (up to current focus Z): 1.75px solid accent red (#E8283C)
        const travelledPts = projectedSplinePts.filter(
          (pt) => pt.wz <= camTargetZ + 12
        );
        if (travelledPts.length > 1) {
          ctx.beginPath();
          ctx.moveTo(travelledPts[0].x, travelledPts[0].y);
          for (let i = 1; i < travelledPts.length; i++) {
            const prev = travelledPts[i - 1];
            const curr = travelledPts[i];
            const midX = (prev.x + curr.x) * 0.5;
            const midY = (prev.y + curr.y) * 0.5;
            ctx.quadraticCurveTo(prev.x, prev.y, midX, midY);
          }
          const lastTrav = travelledPts[travelledPts.length - 1];
          ctx.lineTo(lastTrav.x, lastTrav.y);
          ctx.strokeStyle = '#E8283C';
          ctx.lineWidth = 1.85;
          ctx.stroke();
        }
      }

      // ----------------------------------------------------------------------
      // 3. Update 3D Cards, Connector Stems, and Anchor Nodes
      // ----------------------------------------------------------------------
      const { maxVisibleAhead, maxVisibleBehind, maxDepthBlurPx } =
        JOURNEY_CAMERA_CONFIG;

      let nearestIdx = 0;
      let nearestAbsD = Infinity;

      for (let i = 0; i < JOURNEY_ENTRIES.length; i++) {
        const entry = JOURNEY_ENTRIES[i];
        const pos3D = entries3D[i];
        const cardEl = cardRefs.current[i];

        // Signed distance in entry-steps:
        // d > 0 -> ahead of camera (in the distance)
        // d = 0 -> in primary reading focus
        // d < 0 -> passed / receding toward camera
        const d = i - continuousIndex;
        const absD = Math.abs(d);

        if (absD < nearestAbsD) {
          nearestAbsD = absD;
          nearestIdx = i;
        }

        // Cull cards outside visible range [ -maxVisibleBehind, +maxVisibleAhead ]
        const isVisible =
          d <= maxVisibleAhead && d >= -maxVisibleBehind && outroProgress < 0.98;

        if (!isVisible) {
          if (cardEl && cardEl.style.display !== 'none') {
            cardEl.style.display = 'none';
            cardEl.style.pointerEvents = 'none';
          }
          continue;
        }

        // Project spline node and card anchor point
        const nodeScreen = projectPoint3D(
          pos3D.nodeX,
          pos3D.nodeY,
          pos3D.nodeZ,
          cam,
          width,
          height,
          focalLength,
          opticalCenterX
        );
        const anchorScreen = projectPoint3D(
          pos3D.anchorX,
          pos3D.anchorY,
          pos3D.anchorZ,
          cam,
          width,
          height,
          focalLength,
          opticalCenterX
        );

        if (!nodeScreen || !anchorScreen) {
          if (cardEl && cardEl.style.display !== 'none') {
            cardEl.style.display = 'none';
            cardEl.style.pointerEvents = 'none';
          }
          continue;
        }

        // Compute scale across the 4 lifecycle states:
        // Far -> Emerging -> Focused (|d| < 0.22) -> Receding
        let cardScale = 1;
        let blurPx = 0;
        const isFocused = absD <= 0.22 && outroProgress < 0.25;

        if (d > 0) {
          // Ahead of camera (Far -> Emerging -> Focused)
          const normAhead = clamp(d / maxVisibleAhead, 0, 1);
          cardScale = lerp(1.0, 0.36, Math.pow(normAhead, 0.88));
          blurPx =
            d > 0.35
              ? smoothstep(0.35, maxVisibleAhead, d) * maxDepthBlurPx
              : 0;
        } else {
          // Passing camera (Focused -> Receding)
          const normBehind = clamp(-d / maxVisibleBehind, 0, 1);
          cardScale = lerp(1.0, 1.15, Math.pow(normBehind, 0.92));
          blurPx = smoothstep(0.28, maxVisibleBehind, -d) * 1.4;
        }

        // Strictly 100% opaque card surface across 90% of its lifecycle!
        // Only fade cardOpacity over the first ~5% (d in [2.18, 2.35]) and last ~5% (d in [-1.05, -0.88])
        // when the card is practically invisible in the background fog and cannot overlap anything.
        const entryFadeStart = maxVisibleAhead - 0.17; // 2.18
        const exitFadeStart = -(maxVisibleBehind - 0.17); // -0.88
        let cardOpacity = 1.0;
        if (d > entryFadeStart) {
          cardOpacity = clamp((maxVisibleAhead - d) / 0.17, 0, 1);
        } else if (d < exitFadeStart) {
          cardOpacity = clamp((d + maxVisibleBehind) / 0.17, 0, 1);
        }

        // Depth "fog": solid --bg-dark (#0E0E10) overlay inside the card whose alpha increases with distance
        let fogAlpha = 0;
        if (d > 0.22) {
          const fogT = smoothstep(0.22, maxVisibleAhead, d);
          fogAlpha = lerp(0, 0.92, Math.pow(fogT, 0.85));
        } else if (d < -0.18) {
          const fogT = smoothstep(0.18, maxVisibleBehind, -d);
          fogAlpha = lerp(0, 0.92, Math.pow(fogT, 0.9));
        }

        if (outroProgress > 0) {
          fogAlpha = Math.max(fogAlpha, smoothstep(0, 0.82, outroProgress) * 0.95);
          if (outroProgress > 0.82) {
            cardOpacity *= 1 - smoothstep(0.82, 0.98, outroProgress);
          }
        }

        // Clamp horizontal card position so it never intrudes into the left category gutter or right edge
        const approxHalfCardW =
          (isMobile
            ? Math.min(width * 0.43, 175)
            : entry.layout === 'side'
            ? 300
            : 252) * cardScale;

        const minCenterX = leftGutterPx + approxHalfCardW;
        const maxCenterX = width - 28 - approxHalfCardW;
        const clampedCardX = isMobile
          ? clamp(anchorScreen.x, width * 0.14 + approxHalfCardW * 0.5, width * 0.86 - approxHalfCardW * 0.5)
          : clamp(anchorScreen.x, minCenterX, Math.max(minCenterX, maxCenterX));

        // Clamp vertical bottom position so taller 'top' cards never clip the top HUD or bottom edge
        const approxCardH =
          (isMobile
            ? 325
            : entry.layout === 'top'
            ? Math.min(445, height * 0.6)
            : Math.min(340, height * 0.52)) * cardScale;
        const minTopY = isMobile ? 76 : Math.max(76, height * 0.1);
        const maxBottomY = height - (isMobile ? 72 : 34);
        const clampedCardY = clamp(
          anchorScreen.y,
          minTopY + approxCardH,
          Math.max(minTopY + approxCardH, maxBottomY)
        );

        // Draw hairline stem connecting spline node -> card bottom center
        const stemVisibility = (1 - fogAlpha * 0.92) * cardOpacity;
        const stemAlpha = clamp(
          stemVisibility * (isFocused ? 0.62 : 0.28),
          0,
          0.75
        );
        if (stemAlpha > 0.02) {
          ctx.beginPath();
          ctx.moveTo(nodeScreen.x, nodeScreen.y);
          ctx.lineTo(clampedCardX, clampedCardY);
          ctx.strokeStyle = isFocused
            ? `rgba(232, 40, 60, ${stemAlpha.toFixed(3)})`
            : `rgba(245, 242, 238, ${stemAlpha.toFixed(3)})`;
          ctx.lineWidth = isFocused ? 1.25 : 1;
          ctx.stroke();
        }

        // Draw spline anchor node (small crisp circle, solid red when focused/passed, hollow when ahead)
        const isPassedOrFocused = d <= 0.22;
        const nodeRadius = clamp(
          (isFocused ? 5.2 : 3.6) * clamp(nodeScreen.scale * 0.95, 0.55, 1.35),
          2.2,
          6.5
        );
        ctx.beginPath();
        ctx.arc(nodeScreen.x, nodeScreen.y, nodeRadius, 0, Math.PI * 2);
        if (isPassedOrFocused) {
          ctx.fillStyle = `rgba(232, 40, 60, ${clamp(
            stemVisibility * 0.95,
            0.2,
            1
          ).toFixed(3)})`;
          ctx.fill();
        } else {
          ctx.fillStyle = '#0E0E10';
          ctx.fill();
          ctx.lineWidth = 1.3;
          ctx.strokeStyle = `rgba(245, 242, 238, ${clamp(
            stemVisibility * 0.65,
            0.12,
            0.75
          ).toFixed(3)})`;
          ctx.stroke();
        }

        // Apply GPU transform, strict depth-sorted z-index, and internal fog alpha to DOM card element
        if (cardEl) {
          if (cardEl.style.display !== 'block') {
            cardEl.style.display = 'block';
          }
          // Subtle perspective tilt that straightens to 0deg at focus
          const tiltY = isFocused ? 0 : clamp(pos3D.side * d * -3.2, -7, 7);
          const tiltX = isFocused ? 0 : clamp(d * 1.8, -4, 4);

          // Strictly depth-sort z-index by distance so nearer cards always cover farther ones cleanly
          const zIndex = Math.max(1, 1000 - Math.round(d * 100));

          cardEl.style.zIndex = String(zIndex);
          cardEl.style.opacity = cardOpacity.toFixed(3);
          cardEl.style.setProperty('--card-fog-alpha', fogAlpha.toFixed(3));
          cardEl.style.pointerEvents = isFocused ? 'auto' : 'none';
          cardEl.style.transform = `translate3d(${clampedCardX.toFixed(
            1
          )}px, ${clampedCardY.toFixed(
            1
          )}px, 0) translate(-50%, -100%) scale(${cardScale.toFixed(
            4
          )}) rotateX(${tiltX.toFixed(2)}deg) rotateY(${tiltY.toFixed(2)}deg)`;

          if (blurPx > 0.15) {
            cardEl.style.filter = `blur(${blurPx.toFixed(2)}px)`;
          } else if (cardEl.style.filter !== 'none') {
            cardEl.style.filter = 'none';
          }

          if (isFocused) {
            cardEl.classList.add('journey-card--focused');
          } else {
            cardEl.classList.remove('journey-card--focused');
          }
        }
      }

      ctx.restore();

      // ----------------------------------------------------------------------
      // 4. Sync Editorial HUD (Heading Shrink, Scroll Cue, Progress Bars, Outro)
      // ----------------------------------------------------------------------
      // Shrink top-left title to ~72% scale after scrolling into the path
      if (headerTitleRef.current) {
        const shrinkT = smoothstep(0.01, 0.08, progress);
        const titleScale = lerp(1, 0.72, shrinkT);
        const subOpacity = lerp(1, 0, smoothstep(0.01, 0.06, progress));
        headerTitleRef.current.style.transform = `scale(${titleScale.toFixed(
          3
        )})`;
        const subEl = headerTitleRef.current.querySelector(
          '.journey-section__subtitle'
        );
        if (subEl) {
          subEl.style.opacity = subOpacity.toFixed(3);
        }
      }

      // Fade out bottom-center scroll cue after ~4% scroll progress
      if (scrollCueWrapRef.current) {
        const cueAlpha = 1 - smoothstep(0.005, 0.045, progress);
        scrollCueWrapRef.current.style.opacity = cueAlpha.toFixed(3);
      }

      // Bottom-edge 2px hairline progress bar
      if (bottomProgressFillRef.current) {
        bottomProgressFillRef.current.style.transform = `scaleX(${clamp(
          progress,
          0,
          1
        ).toFixed(4)})`;
      }

      // Left category vertical line fill
      if (categoryLineFillRef.current) {
        categoryLineFillRef.current.style.transform = `scaleY(${clamp(
          progress,
          0,
          1
        ).toFixed(4)})`;
      }

      // Closing / Outro Frame ("To be continued..." + "CONTINUE ->")
      if (outroRef.current) {
        const outroAlpha = smoothstep(0.18, 0.72, outroProgress);
        const outroY = lerp(22, 0, outroAlpha);
        outroRef.current.style.opacity = outroAlpha.toFixed(3);
        outroRef.current.style.transform = `translate3d(-50%, calc(-50% + ${outroY.toFixed(
          1
        )}px), 0)`;
        outroRef.current.style.pointerEvents =
          outroAlpha > 0.5 ? 'auto' : 'none';
      }

      // Soft dark crossfade curtain at the very end (progress > 0.96)
      if (exitCurtainRef.current) {
        const curtainAlpha = smoothstep(0.95, 1.0, progress) * 0.45;
        exitCurtainRef.current.style.opacity = curtainAlpha.toFixed(3);
      }

      // Update React HUD states only when focused card / category / year changes
      const focusedEntry = JOURNEY_ENTRIES[nearestIdx];
      if (focusedEntry) {
        if (state.lastFocusedIdx !== nearestIdx) {
          state.lastFocusedIdx = nearestIdx;
          setFocusedIndex(nearestIdx);
        }
        if (state.lastCategory !== focusedEntry.category) {
          state.lastCategory = focusedEntry.category;
          setActiveCategory(focusedEntry.category);
        }
        if (state.lastYear !== focusedEntry.year) {
          state.lastYear = focusedEntry.year;
          setActiveYear(focusedEntry.year);
        }
      }
    },
    [sceneGraph, scrollMap]
  );

  /**
   * Setup Canvas sizing, ResizeObserver, and pinned GSAP ScrollTrigger
   */
  useEffect(() => {
    if (prefersReducedMotion) {
      setIsChromeHidden(false);
      return undefined;
    }

    const sectionEl = sectionRef.current;
    const canvasEl = canvasRef.current;
    if (!sectionEl || !canvasEl) return undefined;

    const state = animStateRef.current;

    const updateCanvasSize = () => {
      const rect = sectionEl.getBoundingClientRect();
      const w = rect.width || window.innerWidth;
      const h = rect.height || window.innerHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);

      state.viewportW = w;
      state.viewportH = h;
      state.dpr = dpr;
      state.isMobile = w < 900;

      canvasEl.width = Math.round(w * dpr);
      canvasEl.height = Math.round(h * dpr);
      canvasEl.style.width = `${w}px`;
      canvasEl.style.height = `${h}px`;

      renderSceneFrame(state.smoothProgress);
    };

    updateCanvasSize();

    // RAF damping loop — only runs while section is active or settling
    const tick = () => {
      const diff = state.targetProgress - state.smoothProgress;
      if (Math.abs(diff) > 0.00015) {
        state.smoothProgress += diff * 0.14;
        renderSceneFrame(state.smoothProgress);
      } else {
        state.smoothProgress = state.targetProgress;
        renderSceneFrame(state.smoothProgress);
      }

      if (state.isActive || Math.abs(diff) > 0.00015) {
        state.rafId = requestAnimationFrame(tick);
      } else {
        state.rafId = null;
      }
    };

    const startLoop = () => {
      if (!state.rafId) {
        state.rafId = requestAnimationFrame(tick);
      }
    };

    const stopLoop = () => {
      state.isActive = false;
      if (state.rafId) {
        cancelAnimationFrame(state.rafId);
        state.rafId = null;
      }
    };

    // Total scroll budget in px: uniform ~100vh per card + outroVh
    const getTotalScrollPx = () => {
      const vh = window.innerHeight || 900;
      const { vhPerEntry, outroVh } = JOURNEY_CAMERA_CONFIG;
      const totalVh =
        scrollMap.totalWeight * vhPerEntry +
        outroVh * 0.35;
      return Math.round((totalVh / 100) * vh);
    };

    const st = ScrollTrigger.create({
      id: 'journey',
      trigger: sectionEl,
      pin: true,
      start: 'top top',
      end: () => `+=${getTotalScrollPx()}`,
      scrub: 0.6,
      anticipatePin: 1,
      invalidateOnRefresh: true,
      onEnter: () => {
        state.isActive = true;
        setActiveTheme('dark');
        setActiveSection('journey');
        setActiveSectionIndex('05');
        setIsChromeHidden(true);
        startLoop();
      },
      onEnterBack: () => {
        state.isActive = true;
        setActiveTheme('dark');
        setActiveSection('journey');
        setActiveSectionIndex('05');
        setIsChromeHidden(true);
        startLoop();
      },
      onLeave: () => {
        stopLoop();
        setIsChromeHidden(false);
        setActiveTheme('dark');
        setActiveSection('contact');
        setActiveSectionIndex('06');
      },
      onLeaveBack: () => {
        stopLoop();
        setIsChromeHidden(false);
      },
      onUpdate: (self) => {
        state.targetProgress = self.progress;
        updateProgress('journey', self.progress);
        startLoop();
      },
    });

    stRef.current = st;

    const handleResize = () => {
      updateCanvasSize();
    };
    window.addEventListener('resize', handleResize);

    return () => {
      stopLoop();
      window.removeEventListener('resize', handleResize);
      st.kill();
      stRef.current = null;
      setIsChromeHidden(false);
    };
  }, [
    prefersReducedMotion,
    renderSceneFrame,
    scrollMap,
    setActiveSection,
    setActiveSectionIndex,
    setActiveTheme,
    setIsChromeHidden,
    updateProgress,
  ]);

  /**
   * Jump smoothly to the first entry of a clicked category
   */
  const handleCategoryJump = useCallback(
    (category) => {
      const targetEntryIdx = getFirstEntryIndexByCategory(category);
      if (targetEntryIdx < 0) return;

      if (prefersReducedMotion) {
        const cardEl = cardRefs.current[targetEntryIdx];
        if (cardEl) {
          cardEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        setActiveCategory(category);
        setFocusedIndex(targetEntryIdx);
        return;
      }

      const st = stRef.current;
      if (!st) return;

      const normProgress = entryIndexToScrollProgress(
        targetEntryIdx,
        scrollMap
      );
      const targetScrollY =
        st.start + normProgress * Math.max(1, st.end - st.start);

      const lenis = window.__lenis;
      if (lenis && typeof lenis.scrollTo === 'function') {
        lenis.scrollTo(targetScrollY, {
          duration: 1.2,
          easing: (t) => 1 - Math.pow(1 - t, 3),
        });
      } else {
        window.scrollTo({ top: targetScrollY, behavior: 'smooth' });
      }
    },
    [prefersReducedMotion, scrollMap]
  );

  /**
   * Skip Timeline / Continue -> Smoothly scroll to the Connect section's ScrollTrigger start position
   * (~1.6s, expo ease). Works from start, middle, last card, and outro.
   */
  const handleSkipTimeline = useCallback(
    (e) => {
      if (e) e.preventDefault();

      // Immediately restore navbar chrome and pause the Journey canvas loop on skip
      setIsChromeHidden(false);

      const contactSt = ScrollTrigger.getById('contact');
      const journeySt = stRef.current;
      const targetScrollY =
        (contactSt && typeof contactSt.start === 'number'
          ? contactSt.start
          : null) ??
        (journeySt && typeof journeySt.end === 'number'
          ? journeySt.end
          : null);

      const expoEase = (t) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t));
      const lenis = window.__lenis;

      if (lenis && typeof lenis.scrollTo === 'function' && targetScrollY !== null) {
        lenis.scrollTo(targetScrollY, {
          duration: 1.6,
          easing: expoEase,
          onComplete: () => {
            ScrollTrigger.update();
          },
        });
        return;
      }

      scrollTo('#contact', {
        duration: 1.6,
        easing: expoEase,
      });
    },
    [scrollTo, setIsChromeHidden]
  );

  /**
   * Keyboard navigation when section is in view (ArrowDown / ArrowRight / ArrowUp / ArrowLeft)
   */
  useEffect(() => {
    if (prefersReducedMotion) return undefined;

    const handleKeyDown = (e) => {
      const state = animStateRef.current;
      if (!state.isActive) return;

      // Ignore if focus is inside an input/textarea
      const tag = document.activeElement?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return;

      if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
        e.preventDefault();
        const nextIdx = Math.min(
          JOURNEY_ENTRIES.length - 1,
          state.lastFocusedIdx + 1
        );
        const st = stRef.current;
        if (!st) return;
        const normP = entryIndexToScrollProgress(nextIdx, scrollMap);
        const targetY = st.start + normP * Math.max(1, st.end - st.start);
        if (window.__lenis) {
          window.__lenis.scrollTo(targetY, { duration: 0.75 });
        } else {
          window.scrollTo({ top: targetY, behavior: 'smooth' });
        }
      } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
        e.preventDefault();
        const prevIdx = Math.max(0, state.lastFocusedIdx - 1);
        const st = stRef.current;
        if (!st) return;
        const normP = entryIndexToScrollProgress(prevIdx, scrollMap);
        const targetY = st.start + normP * Math.max(1, st.end - st.start);
        if (window.__lenis) {
          window.__lenis.scrollTo(targetY, { duration: 0.75 });
        } else {
          window.scrollTo({ top: targetY, behavior: 'smooth' });
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [prefersReducedMotion, scrollMap]);

  const currentYearTagline =
    YEAR_MARKERS[activeYear] || YEAR_MARKERS[2022] || 'THE BEGINNING';
  const focusedEntry = JOURNEY_ENTRIES[focusedIndex] || JOURNEY_ENTRIES[0];

  return (
    <section
      ref={sectionRef}
      id="journey"
      data-theme="dark"
      aria-label="05 — The Journey Timeline"
      className={`journey-section ${
        prefersReducedMotion ? 'journey-section--reduced-motion' : ''
      }`}
    >
      {/* Compatibility anchor for #experience links */}
      <div id="experience" className="journey-section__anchor" aria-hidden="true" />

      {/* Subtle radial vignette + static film grain on section backdrop */}
      <div className="journey-section__vignette" aria-hidden="true" />
      <div className="journey-section__grain" aria-hidden="true" />

      {/* 2D Canvas for 3D-projected spline, travelled line, stems, nodes & dust motes */}
      {!prefersReducedMotion && (
        <canvas
          ref={canvasRef}
          className="journey-section__canvas"
          aria-hidden="true"
        />
      )}

      {/* Screen-reader live region announcing the focused milestone */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {focusedEntry
          ? `${focusedEntry.catalogueNumber}, ${focusedEntry.displayDate || focusedEntry.year}: ${focusedEntry.title} (${focusedEntry.category})`
          : ''}
      </div>

      {/* =====================================================================
          EDITORIAL HUD OVERLAY (Pinned Chrome)
          ===================================================================== */}
      <div className="journey-section__hud">
        {/* Top-Left Eyebrow & Dual-Font Section Heading */}
        <header className="journey-section__header">
          <div className="journey-section__eyebrow">
            <span className="journey-section__eyebrow-num">
              {JOURNEY_SECTION_META.index}
            </span>
            <span className="journey-section__eyebrow-sep" aria-hidden="true" />
            <span className="journey-section__eyebrow-label">
              {JOURNEY_SECTION_META.eyebrow}
            </span>
          </div>

          <div ref={headerTitleRef} className="journey-section__title-row">
            <h2 className="journey-section__title">
              <span className="journey-section__title-the">
                {JOURNEY_SECTION_META.titleLine1}
              </span>
              <span className="journey-section__title-journey">
                {JOURNEY_SECTION_META.titleLine2}
              </span>
            </h2>
            <p className="journey-section__subtitle">
              {JOURNEY_SECTION_META.subtitle}
            </p>
          </div>
        </header>

        {/* Top-Right Skip Timeline Pill Button */}
        <button
          type="button"
          onClick={handleSkipTimeline}
          className="journey-section__skip-btn"
          aria-label="Skip timeline to Let's Connect section"
        >
          <span>{JOURNEY_SECTION_META.skipLabel}</span>
          <span className="journey-section__skip-arrow" aria-hidden="true">
            →
          </span>
        </button>

        {/* Left Category Index (Desktop >= 900px) */}
        <nav
          className="journey-categories"
          aria-label="Timeline categories"
        >
          <div className="journey-categories__line" aria-hidden="true">
            <div
              ref={categoryLineFillRef}
              className="journey-categories__line-fill"
            />
          </div>

          {CATEGORY_META.map((cat) => {
            const isActive = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => handleCategoryJump(cat.id)}
                className={`journey-categories__item ${
                  isActive ? 'journey-categories__item--active' : ''
                }`}
                aria-current={isActive ? 'true' : undefined}
              >
                <span className="journey-categories__node" aria-hidden="true">
                  <span className="journey-categories__node-dot" />
                </span>
                <span className="journey-categories__text">
                  <span className="journey-categories__name">{cat.label}</span>
                  <span className="journey-categories__years">{cat.years}</span>
                </span>
              </button>
            );
          })}
        </nav>

        {/* Bottom-Left Year Marker ("2022 / THE BEGINNING") */}
        <div className="journey-year-hud" aria-hidden="true">
          <div key={activeYear} className="journey-year-hud__inner">
            <div className="journey-year-hud__year">{activeYear}</div>
            <div className="journey-year-hud__tagline">
              {currentYearTagline}
            </div>
          </div>
        </div>

        {/* Bottom-Center Scroll Cue (Fades out after ~4% scroll) */}
        {!prefersReducedMotion && (
          <div
            ref={scrollCueWrapRef}
            className="journey-section__scroll-cue"
            aria-hidden="true"
          >
            <ScrollCue />
          </div>
        )}

        {/* Mobile Category Chip Strip (< 900px) */}
        <nav
          className="journey-mobile-chips"
          aria-label="Timeline categories mobile"
        >
          {CATEGORY_META.map((cat) => {
            const isActive = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => handleCategoryJump(cat.id)}
                className={`journey-mobile-chips__btn ${
                  isActive ? 'journey-mobile-chips__btn--active' : ''
                }`}
              >
                <span className="journey-mobile-chips__dot" aria-hidden="true" />
                <span>{cat.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Bottom-Edge Hairline Progress Bar (2px solid #E8283C) */}
        {!prefersReducedMotion && (
          <div
            className="journey-section__bottom-progress"
            aria-hidden="true"
          >
            <div
              ref={bottomProgressFillRef}
              className="journey-section__bottom-progress-fill"
            />
          </div>
        )}
      </div>

      {/* =====================================================================
          SEMANTIC ORDERED LIST (<ol>) OF TIMELINE MILESTONE CARDS
          ===================================================================== */}
      <div ref={stageRef} className="journey-section__stage-wrap">
        {prefersReducedMotion && (
          <svg
            className="journey-reduced-svg-line"
            viewBox="0 0 120 1200"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <path
              d="M 60 0 C 105 200, 15 400, 60 600 C 105 800, 15 1000, 60 1200"
              fill="none"
              stroke="rgba(232, 40, 60, 0.55)"
              strokeWidth="2"
            />
          </svg>
        )}

        <ol className="journey-section__stage">
          {JOURNEY_ENTRIES.map((entry, idx) => (
            <li
              key={entry.id}
              ref={(el) => {
                cardRefs.current[idx] = el;
              }}
              className={`journey-card-item journey-card--major journey-card--layout-${
                entry.layout || 'side'
              } ${idx === 0 ? 'journey-card--focused' : ''}`}
              style={{
                '--card-img-aspect': entry.imageMeta
                  ? entry.imageMeta.aspect
                  : 1.48,
              }}
              data-entry-id={entry.id}
              data-category={entry.category}
              data-layout={entry.layout || 'side'}
            >
              <article
                className="journey-card__article"
                tabIndex={focusedIndex === idx || prefersReducedMotion ? 0 : -1}
                onFocus={() => {
                  if (!prefersReducedMotion) {
                    const st = stRef.current;
                    if (!st) return;
                    const normP = entryIndexToScrollProgress(idx, scrollMap);
                    const targetY =
                      st.start + normP * Math.max(1, st.end - st.start);
                    if (window.__lenis) {
                      window.__lenis.scrollTo(targetY, { duration: 0.7 });
                    } else {
                      window.scrollTo({ top: targetY, behavior: 'smooth' });
                    }
                  }
                }}
              >
                {/* Media Column / Top Image Frame (Real WebP Photo, Framed Certificate, or Fallback SVG) */}
                <PlaceholderArt entry={entry} />

                {/* Editorial Catalogue Typography Column */}
                <div className="journey-card__body">
                  {/* 24px Red Accent Top Tick on Focused Card */}
                  <div
                    className="journey-card__focus-tick"
                    aria-hidden="true"
                  />

                  <div className="journey-card__meta-row">
                    <span className="journey-card__cat-num">
                      {entry.catalogueNumber}
                    </span>
                    <time
                      className="journey-card__year"
                      dateTime={String(entry.date)}
                    >
                      {entry.displayDate || entry.year}
                    </time>
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

                {/* Solid Page-Background (--bg-dark) Depth Fog Overlay (100% Opaque Card Surface) */}
                <div className="journey-card__fog" aria-hidden="true" />

                {/* Bottom Stem Attachment Node */}
                <span
                  className="journey-card__stem-anchor"
                  aria-hidden="true"
                />
              </article>
            </li>
          ))}
        </ol>

        {/* Closing / Outro Frame ("To be continued..." + "CONTINUE ->") */}
        <div
          ref={outroRef}
          className={`journey-outro ${
            prefersReducedMotion ? 'journey-outro--static' : ''
          }`}
        >
          <span className="journey-outro__eyebrow">
            {JOURNEY_OUTRO.eyebrow}
          </span>
          <p className="journey-outro__text">{JOURNEY_OUTRO.line}</p>
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
      </div>

      {/* Soft Dark Exit Crossfade Curtain */}
      <div
        ref={exitCurtainRef}
        className="journey-section__exit-curtain"
        aria-hidden="true"
      />
    </section>
  );
}
