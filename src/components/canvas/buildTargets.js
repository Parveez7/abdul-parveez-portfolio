/**
 * Target Builder for the Canvas 2D Particle Engine.
 *
 * Implements buildTargets(image, options):
 * 1. Draws the source image to an offscreen canvas at the appropriate size & position for the current viewport layout.
 * 2. Computes pixel luminance and 3x3 Sobel local contrast (edges) so glasses, hair curls, beard contour, and fabric folds stay sharp.
 * 3. Samples target positions weighted by luminance and edge contrast, returning { x, y, brightness } Float32Arrays.
 */

// Reusable offscreen canvas for sampling
let sharedOffscreenCanvas = null
let sharedOffscreenCtx = null

function getSamplingCanvas(width, height) {
  if (!sharedOffscreenCanvas) {
    sharedOffscreenCanvas = document.createElement('canvas')
    sharedOffscreenCtx = sharedOffscreenCanvas.getContext('2d', {
      willReadFrequently: true,
    })
  }
  if (sharedOffscreenCanvas.width !== width || sharedOffscreenCanvas.height !== height) {
    sharedOffscreenCanvas.width = width
    sharedOffscreenCanvas.height = height
  }
  return { canvas: sharedOffscreenCanvas, ctx: sharedOffscreenCtx }
}

/**
 * Deterministic pseudo-random generator (Mulberry32) so target sampling is stable across resizes.
 */
function createRng(seed = 1337) {
  let s = seed >>> 0
  return function rng() {
    s += 0x6d2b79f5
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * Computes the bounding rectangle on the viewport for a given scene.
 */
export function computeSceneLayoutRect(sceneName, vw, vh, imgWidth, imgHeight) {
  const imgAspect = imgWidth / Math.max(1, imgHeight)
  const isMobile = vw < 768
  const isTablet = vw >= 768 && vw < 1024

  if (sceneName === 'hero') {
    // Centred, head and torso, anchored near bottom
    const targetH = isMobile ? vh * 0.78 : vh * 0.94
    const targetW = targetH * imgAspect
    const x = (vw - targetW) * 0.5
    const y = isMobile ? vh * 0.18 : vh * 0.06
    return { x, y, width: targetW, height: targetH }
  }

  // About Poses ('pose1', 'pose2', 'pose3'):
  // Sit in the right half of the viewport on desktop (matching about-section-inspiration.png)
  if (isMobile) {
    const size = Math.min(vw * 0.92, vh * 0.62)
    return {
      x: (vw - size) * 0.5,
      y: vh * 0.34,
      width: size,
      height: size,
    }
  }

  if (isTablet) {
    const size = Math.min(vw * 0.56, vh * 0.76)
    return {
      x: vw * 0.44,
      y: (vh - size) * 0.52,
      width: size,
      height: size,
    }
  }

  // Desktop: right half of viewport
  const size = Math.min(vw * 0.50, vh * 0.88)
  const centerX = vw * 0.67
  const centerY = vh * 0.52
  return {
    x: centerX - size * 0.5,
    y: centerY - size * 0.5,
    width: size,
    height: size,
  }
}

/**
 * Builds particle target arrays for a scene image.
 *
 * @param {HTMLImageElement|ImageBitmap} image - Loaded source image
 * @param {Object} options
 * @param {string} options.sceneName - 'hero' | 'pose1' | 'pose2' | 'pose3'
 * @param {number} options.count - Number of particles in the pool (N)
 * @param {number} options.viewportWidth - Current viewport width in CSS px
 * @param {number} options.viewportHeight - Current viewport height in CSS px
 * @param {number} [options.threshold=16] - Minimum brightness threshold (0..255)
 * @returns {{ x: Float32Array, y: Float32Array, brightness: Float32Array, rawTargetCount: number, durationMs: number }}
 */
export function buildTargets(image, options = {}) {
  const t0 = performance.now()
  const {
    sceneName = 'hero',
    count = 24000,
    viewportWidth = window.innerWidth,
    viewportHeight = window.innerHeight,
    threshold = 15,
  } = options

  const isHero = sceneName === 'hero'
  const imgW = image.naturalWidth || image.width || 1200
  const imgH = image.naturalHeight || image.height || 1200

  // 1. Compute target layout rectangle in viewport coordinates
  const rect = computeSceneLayoutRect(sceneName, viewportWidth, viewportHeight, imgW, imgH)

  // Scale offscreen sampling buffer so sampling always finishes in < 15ms while keeping fine detail
  const maxSampleDim = isHero ? 540 : 480
  const scale = Math.min(1, maxSampleDim / Math.max(imgW, imgH))
  const sampleW = Math.max(64, Math.round(imgW * scale))
  const sampleH = Math.max(64, Math.round(imgH * scale))

  const { ctx } = getSamplingCanvas(sampleW, sampleH)
  ctx.clearRect(0, 0, sampleW, sampleH)
  ctx.drawImage(image, 0, 0, sampleW, sampleH)

  const imgData = ctx.getImageData(0, 0, sampleW, sampleH).data
  const totalPixels = sampleW * sampleH

  // Pre-compute luminance and chroma buffers
  const lumBuf = new Float32Array(totalPixels)
  const warmthBuf = new Float32Array(totalPixels)
  const chromaBuf = new Float32Array(totalPixels)

  for (let i = 0; i < totalPixels; i++) {
    const idx = i * 4
    const r = imgData[idx]
    const g = imgData[idx + 1]
    const b = imgData[idx + 2]
    const a = imgData[idx + 3]

    if (a < 32) {
      lumBuf[i] = 0
      continue
    }

    lumBuf[i] = 0.299 * r + 0.587 * g + 0.114 * b
    warmthBuf[i] = Math.max(0, r - b)
    const maxC = r > g ? (r > b ? r : b) : (g > b ? g : b)
    const minC = r < g ? (r < b ? r : b) : (g < b ? g : b)
    chromaBuf[i] = maxC - minC
  }

  // 2. Compute 3x3 Sobel local contrast (edges) & candidate importance weights
  // Store candidate pixels that pass the threshold
  const candU = new Float32Array(totalPixels)
  const candV = new Float32Array(totalPixels)
  const candWeight = new Float32Array(totalPixels)
  const candBright = new Float32Array(totalPixels)
  let candCount = 0

  for (let py = 1; py < sampleH - 1; py++) {
    const v = py / sampleH

    // For hero portrait: smooth vertical fade out near the bottom (v > 0.72 -> 0.96)
    let bottomFade = 1.0
    if (isHero) {
      if (v > 0.96) continue
      if (v > 0.70) {
        const tFade = (v - 0.70) / 0.26
        bottomFade = Math.max(0, 1 - tFade * tFade)
      }
    }

    const rowOffset = py * sampleW
    for (let px = 1; px < sampleW - 1; px++) {
      const u = px / sampleW
      const i = rowOffset + px
      const lum = lumBuf[i]

      // 3x3 Sobel gradient for local edge contrast
      const tl = lumBuf[i - sampleW - 1]
      const tc = lumBuf[i - sampleW]
      const tr = lumBuf[i - sampleW + 1]
      const ml = lumBuf[i - 1]
      const mr = lumBuf[i + 1]
      const bl = lumBuf[i + sampleW - 1]
      const bc = lumBuf[i + sampleW]
      const br = lumBuf[i + sampleW + 1]

      const gx = -tl + tr - 2 * ml + 2 * mr - bl + br
      const gy = -tl - 2 * tc - tr + bl + 2 * bc + br
      const edgeMag = Math.sqrt(gx * gx + gy * gy) * 0.25 // Normalized ~0..255

      let weight = 0
      let brightness = 0

      if (isHero) {
        // portrait-original-photo.png has a smooth neutral-grey studio backdrop.
        // Reject studio backdrop: low warmth, low chroma, low edge contrast, or outside figure bounds.
        const warmth = warmthBuf[i]
        const chroma = chromaBuf[i]

        // Distance from center horizontally (person sits inside u in [0.18..0.82])
        const dxCenter = Math.abs(u - 0.5)
        if (dxCenter > 0.34) continue

        // Head ellipse check (u ~ 0.5, v ~ 0.36)
        const headDist = Math.hypot((u - 0.495) / 0.11, (v - 0.35) / 0.19)
        const inHeadOrTorso =
          headDist < 1.05 ||
          (v > 0.46 && dxCenter < 0.14 + (v - 0.46) * 0.42)

        // Studio backdrop is neutral grey (warmth < 13 && chroma < 14) and smooth (edgeMag < 11)
        const isStudioGrey = warmth < 13 && chroma < 14 && edgeMag < 11 && lum > 34 && lum < 120
        if (isStudioGrey || !inHeadOrTorso) continue

        // Emphasize edges (glasses, curly hair, beard contour, collar, sleeve folds)
        // while keeping interior face dark and moody (matching hero-particle-inspiration.png)
        const normEdge = Math.min(1, edgeMag / 42)
        const normLum = Math.min(1, lum / 240)

        if (v < 0.50) {
          // Head, hair, glasses, beard region:
          // Strong boost for edges (glasses rim, hair curls, beard edge) and rim highlights
          const isGlassesZone = v > 0.33 && v < 0.43 && dxCenter < 0.075
          const edgeBoost = isGlassesZone ? normEdge * 2.2 : normEdge * 1.65

          // Suppress flat mid-tone skin in center of face so face stays sculptural and dark
          const isFlatFaceSkin = headDist < 0.72 && normEdge < 0.18 && lum > 65 && lum < 175
          if (isFlatFaceSkin) {
            weight = normEdge * 0.25
          } else {
            // Hair curls & rim highlights
            weight = edgeBoost + (lum > 130 ? normLum * 0.65 : 0) + (lum < 32 && normEdge > 0.12 ? 0.35 : 0)
          }
          brightness = Math.min(1, 0.35 + normEdge * 0.55 + normLum * 0.25)
        } else {
          // Torso & sweater region:
          // Combine fabric fold edges + warm sweater luminance texture
          const sweaterTex = warmth > 15 ? Math.pow(normLum, 1.3) * 0.52 : 0
          weight = (normEdge * 1.45 + sweaterTex) * bottomFade
          brightness = Math.min(1, (0.3 + normEdge * 0.45 + normLum * 0.35) * bottomFade)
        }
      } else {
        // About poses (pose1, pose2, pose3):
        // Already rendered on pure black background; sample where lum > threshold
        if (lum < threshold && edgeMag < 12) continue

        const normLum = Math.min(1, (lum - threshold) / (255 - threshold))
        const normEdge = Math.min(1, edgeMag / 55)

        weight = Math.pow(Math.max(0, normLum), 0.75) * 0.58 + normEdge * 0.42
        brightness = Math.min(1, 0.35 + normLum * 0.45 + normEdge * 0.25)
      }

      if (weight > 0.06) {
        candU[candCount] = u
        candV[candCount] = v
        candWeight[candCount] = weight
        candBright[candCount] = Math.max(0.15, Math.min(1, brightness))
        candCount++
      }
    }
  }

  // 3. Build target x, y, and brightness Float32Arrays of length `count`
  const outX = new Float32Array(count)
  const outY = new Float32Array(count)
  const outBrightness = new Float32Array(count)
  const rng = createRng(sceneName.charCodeAt(0) * 997 + count)

  if (candCount === 0) {
    // Fallback safety if image wasn't ready
    for (let i = 0; i < count; i++) {
      outX[i] = viewportWidth * 0.5 + (rng() - 0.5) * 200
      outY[i] = viewportHeight * 0.5 + (rng() - 0.5) * 200
      outBrightness[i] = 0.5
    }
    return { x: outX, y: outY, brightness: outBrightness, rawTargetCount: 0, durationMs: 0 }
  }

  // Build cumulative distribution (CDF) for importance-weighted sampling
  const cdf = new Float32Array(candCount)
  let runningSum = 0
  for (let i = 0; i < candCount; i++) {
    runningSum += candWeight[i]
    cdf[i] = runningSum
  }

  // Reserve a portion of particles for atmospheric effect:
  // - Hero: ~4% subtle halo dust around portrait
  // - About Poses: ~14% rightward dissolving speck cloud (matching about-section-inspiration.png)
  const dispersionShare = isHero ? 0.04 : 0.14
  const figureCount = Math.floor(count * (1 - dispersionShare))

  const cellW = rect.width / sampleW
  const cellH = rect.height / sampleH

  // Binary search helper on CDF
  const pickCandidateIndex = (rVal) => {
    const targetVal = rVal * runningSum
    let low = 0
    let high = candCount - 1
    while (low < high) {
      const mid = (low + high) >>> 1
      if (cdf[mid] < targetVal) {
        low = mid + 1
      } else {
        high = mid
      }
    }
    return low
  }

  // Fill primary figure targets using stratified importance sampling
  for (let i = 0; i < figureCount; i++) {
    // Stratified step + small jitter for even coverage across head, glasses, torso, legs
    const stratifiedR = (i + rng()) / figureCount
    const cIdx = pickCandidateIndex(stratifiedR)

    const u = candU[cIdx]
    const v = candV[cIdx]

    // Sub-cell organic jitter so particles never align on a visible pixel grid
    const jitterX = (rng() - 0.5) * cellW * 1.35
    const jitterY = (rng() - 0.5) * cellH * 1.35

    outX[i] = rect.x + u * rect.width + jitterX
    outY[i] = rect.y + v * rect.height + jitterY
    outBrightness[i] = candBright[cIdx]
  }

  // Fill remaining particles (dispersion / drifting specks)
  for (let i = figureCount; i < count; i++) {
    const cIdx = pickCandidateIndex(rng())
    const baseU = candU[cIdx]
    const baseV = candV[cIdx]
    const baseX = rect.x + baseU * rect.width
    const baseY = rect.y + baseV * rect.height

    if (isHero) {
      // Soft halo specks around shoulders and hair
      const angle = rng() * Math.PI * 2
      const dist = (12 + Math.pow(rng(), 2) * 85) * (viewportWidth / 1440)
      outX[i] = baseX + Math.cos(angle) * dist
      outY[i] = baseY + Math.sin(angle) * dist
      outBrightness[i] = 0.18 + rng() * 0.35
    } else {
      // About poses: Dissolving speck cloud drifting off to the right (see about-section-inspiration.png)
      const spreadRight = Math.pow(rng(), 1.45) * rect.width * 0.52 + 8
      const spreadVert = (rng() - 0.48) * rect.height * 0.36
      outX[i] = baseX + spreadRight
      outY[i] = baseY + spreadVert
      // Dissolving specks have varied opacity so some look crisp and some soft
      outBrightness[i] = 0.25 + rng() * 0.65
    }
  }

  const durationMs = performance.now() - t0
  return {
    x: outX,
    y: outY,
    brightness: outBrightness,
    rawTargetCount: candCount,
    durationMs,
  }
}
