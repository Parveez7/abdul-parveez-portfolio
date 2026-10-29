/**
 * Target Builder for the Canvas 2D Particle Engine.
 *
 * Implements buildTargets(image, options):
 * 1. Draws the source image to an offscreen canvas at the appropriate size & position for the current viewport layout.
 * 2. Computes pixel luminance and 3x3 Sobel local contrast (edges) so glasses, hair curls, beard contour, and fabric folds stay sharp.
 * 3. Samples target positions weighted by luminance and edge contrast, returning { x, y, brightness } Float32Arrays.
 */

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
  const isMobile = vw < 700
  const isTablet = vw >= 700 && vw < 1024

  if (sceneName === 'hero') {
    if (isMobile) {
      // Mobile (<700px): Portrait centred at ~75% visible figure width,
      // positioned vertically between the top name and bottom tagline.
      // Note: the subject occupies ~64% of the 16:9 source image width.
      const targetW = Math.min(vw * 1.16, vh * 0.62 * imgAspect)
      const targetH = targetW / imgAspect
      const x = (vw - targetW) * 0.5
      const y = (vh - targetH) * 0.50
      return { x, y, width: targetW, height: targetH }
    }

    // Desktop & Tablet (>=700px):
    // Centred, head and torso visible, fading out toward the bottom edge,
    // constrained on intermediate widths so side text never overlaps the portrait.
    const maxWByViewport = isTablet ? vw * 0.82 : vw * 0.92
    const desiredH = vh * 0.94
    const targetW = Math.min(desiredH * imgAspect, maxWByViewport)
    const targetH = targetW / imgAspect
    const x = (vw - targetW) * 0.5
    const y = vh - targetH * 0.98
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
 * @param {number} [options.threshold=15] - Minimum brightness threshold (0..255)
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

  // Scale offscreen sampling buffer so sampling finishes in < 10ms while keeping crisp detail
  const maxSampleDim = isHero ? 560 : 480
  const scale = Math.min(1, maxSampleDim / Math.max(imgW, imgH))
  const sampleW = Math.max(64, Math.round(imgW * scale))
  const sampleH = Math.max(64, Math.round(imgH * scale))

  const { ctx } = getSamplingCanvas(sampleW, sampleH)
  ctx.clearRect(0, 0, sampleW, sampleH)
  ctx.drawImage(image, 0, 0, sampleW, sampleH)

  const imgData = ctx.getImageData(0, 0, sampleW, sampleH).data
  const totalPixels = sampleW * sampleH

  // Pre-compute luminance, warmth, and chroma buffers
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
  const candU = new Float32Array(totalPixels)
  const candV = new Float32Array(totalPixels)
  const candWeight = new Float32Array(totalPixels)
  const candBright = new Float32Array(totalPixels)
  let candCount = 0

  for (let py = 2; py < sampleH - 2; py++) {
    const v = py / sampleH

    // For hero portrait: smooth vertical fade out near the bottom (v > 0.72 -> 0.96)
    let bottomFade = 1.0
    if (isHero) {
      if (v > 0.96) continue
      if (v > 0.72) {
        const tFade = (v - 0.72) / 0.24
        bottomFade = Math.max(0, 1 - Math.pow(tFade, 1.6))
      }
    }

    const rowOffset = py * sampleW
    for (let px = 2; px < sampleW - 2; px++) {
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
      const edgeMag = Math.sqrt(gx * gx + gy * gy) * 0.25

      let weight = 0
      let brightness = 0

      if (isHero) {
        if (u < 0.18 || u > 0.82) continue
        const warmth = warmthBuf[i]
        const chroma = chromaBuf[i]

        // Reject smooth neutral-grey studio backdrop (w < 14 && c < 15 && lum in 40..158)
        if (warmth < 14 && chroma < 15 && lum > 40 && lum < 158) continue

        // Check if near studio background boundary (2px radius) for crisp silhouette rim
        let nearBg = 0
        const nLeft = i - 2
        const nRight = i + 2
        const nTop = i - sampleW * 2
        const nBot = i + sampleW * 2
        if (
          (warmthBuf[nLeft] < 14 && chromaBuf[nLeft] < 15 && lumBuf[nLeft] > 40 && lumBuf[nLeft] < 158) ||
          (warmthBuf[nRight] < 14 && chromaBuf[nRight] < 15 && lumBuf[nRight] > 40 && lumBuf[nRight] < 158) ||
          (warmthBuf[nTop] < 14 && chromaBuf[nTop] < 15 && lumBuf[nTop] > 40 && lumBuf[nTop] < 158) ||
          (warmthBuf[nBot] < 14 && chromaBuf[nBot] < 15 && lumBuf[nBot] > 40 && lumBuf[nBot] < 158)
        ) {
          nearBg = 1
        }

        const normEdge = Math.min(1, edgeMag / 26)
        const normLum = Math.min(1, lum / 245)

        if (v < 0.54) {
          // Head, curly hair, glasses, beard, neck
          const isHairTop = v < 0.325
          const isGlassesBand = v >= 0.348 && v <= 0.432 && Math.abs(u - 0.49) < 0.082
          const faceCenterDist = Math.hypot((u - 0.49) / 0.068, (v - 0.425) / 0.105)

          if (isHairTop) {
            // Curly hair: rim contour + internal curl edges
            weight = nearBg * 1.65 + normEdge * 1.75 + 0.15
            brightness = Math.min(1, 0.36 + nearBg * 0.45 + normEdge * 0.5)
          } else if (isGlassesBand) {
            // Emphasize dark/metallic glasses frame rim and specular glints, keep lens interior darker
            const isFrameRim = normEdge > 0.25 && (lum < 115 || lum > 170)
            if (isFrameRim) {
              weight = normEdge * 2.25
              brightness = Math.min(1, 0.5 + normEdge * 0.5)
            } else {
              weight = normEdge * 0.22
              brightness = 0.25 + normEdge * 0.25
            }
          } else if (faceCenterDist < 0.92 && !nearBg) {
            // Interior face & beard stays dark and moody with sparse subtle texture
            weight = normEdge * 0.13 + 0.025
            brightness = 0.2 + normEdge * 0.25
          } else {
            // Outer jawline, ears, beard rim, neck shadow
            weight = nearBg * 1.5 + normEdge * 1.15 + 0.1
            brightness = 0.32 + nearBg * 0.42 + normEdge * 0.35
          }
        } else {
          // Sweater, collar, shoulders, arms
          const foldEdge = Math.pow(normEdge, 0.85) * 1.55
          const fabricTone = warmth > 12 ? Math.pow(Math.max(0, (lum - 85) / 170), 1.4) * 0.48 : 0.12
          weight = (nearBg * 1.1 + foldEdge + fabricTone) * bottomFade
          brightness = Math.min(1, (0.28 + normEdge * 0.48 + normLum * 0.32) * bottomFade)
        }
      } else {
        // About poses (pose1, pose2, pose3):
        if (lum < threshold && edgeMag < 12) continue

        const normLum = Math.min(1, (lum - threshold) / (255 - threshold))
        const normEdge = Math.min(1, edgeMag / 55)

        weight = Math.pow(Math.max(0, normLum), 0.75) * 0.58 + normEdge * 0.42
        brightness = Math.min(1, 0.35 + normLum * 0.45 + normEdge * 0.25)
      }

      if (weight > 0.04) {
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
    for (let i = 0; i < count; i++) {
      outX[i] = viewportWidth * 0.5 + (rng() - 0.5) * 200
      outY[i] = viewportHeight * 0.5 + (rng() - 0.5) * 200
      outBrightness[i] = 0.5
    }
    return { x: outX, y: outY, brightness: outBrightness, rawTargetCount: 0, durationMs: 0 }
  }

  const cdf = new Float32Array(candCount)
  let runningSum = 0
  for (let i = 0; i < candCount; i++) {
    runningSum += candWeight[i]
    cdf[i] = runningSum
  }

  const dispersionShare = isHero ? 0.035 : 0.14
  const figureCount = Math.floor(count * (1 - dispersionShare))

  const cellW = rect.width / sampleW
  const cellH = rect.height / sampleH

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
    const stratifiedR = (i + rng()) / figureCount
    const cIdx = pickCandidateIndex(stratifiedR)

    const u = candU[cIdx]
    const v = candV[cIdx]

    const jitterX = (rng() - 0.5) * cellW * 1.35
    const jitterY = (rng() - 0.5) * cellH * 1.35

    outX[i] = rect.x + u * rect.width + jitterX
    outY[i] = rect.y + v * rect.height + jitterY
    outBrightness[i] = candBright[cIdx]
  }

  // Fill remaining atmospheric / dispersion specks
  for (let i = figureCount; i < count; i++) {
    const cIdx = pickCandidateIndex(rng())
    const baseU = candU[cIdx]
    const baseV = candV[cIdx]
    const baseX = rect.x + baseU * rect.width
    const baseY = rect.y + baseV * rect.height

    if (isHero) {
      const angle = rng() * Math.PI * 2
      const dist = (8 + Math.pow(rng(), 2) * 55) * (viewportWidth / 1440)
      outX[i] = baseX + Math.cos(angle) * dist
      outY[i] = baseY + Math.sin(angle) * dist
      outBrightness[i] = 0.16 + rng() * 0.28
    } else {
      const spreadRight = Math.pow(rng(), 1.45) * rect.width * 0.52 + 8
      const spreadVert = (rng() - 0.48) * rect.height * 0.36
      outX[i] = baseX + spreadRight
      outY[i] = baseY + spreadVert
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
