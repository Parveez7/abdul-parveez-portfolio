import { gsap } from 'gsap'
import { PARTICLE_CONFIG } from './particleConfig'
import { buildTargets } from './buildTargets'

// Import the 4 scene source images via Vite asset pipeline
import heroPhotoUrl from '../../../design-references/portrait-original-photo.png'
import pose1Url from '../../../design-references/about-pose-01-working-laptop.png'
import pose2Url from '../../../design-references/about-pose-02-thinking.png'
import pose3Url from '../../../design-references/about-pose-03-analyzing-tablet.png'

const SCENE_URLS = {
  hero: heroPhotoUrl,
  pose1: pose1Url,
  pose2: pose2Url,
  pose3: pose3Url,
}

const NUM_PRIMARY_BUCKETS = 4
const NUM_RED_BUCKETS = 2

/**
 * High-performance Canvas 2D Particle Stage Engine.
 * - Zero object allocations in the frame loop (100% TypedArrays).
 * - Batched path rendering grouped by colour/alpha bucket.
 * - Synced to gsap.ticker alongside Lenis.
 */
export class ParticleEngine {
  constructor(canvas, options = {}) {
    this.canvas = canvas
    this.ctx = canvas.getContext('2d', { alpha: true })
    this.onTelemetry = options.onTelemetry || null

    // Environment & capabilities
    this.isReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    this.isTouchDevice = window.matchMedia('(pointer: coarse)').matches

    // Viewport & DPR
    this.vw = window.innerWidth
    this.vh = window.innerHeight
    this.dpr = Math.min(PARTICLE_CONFIG.perf.maxDpr, window.devicePixelRatio || 1)

    // Determine initial particle count from viewport breakpoint
    this.maxCount = this._computeTargetCount(this.vw)
    this.activeCount = this.maxCount

    // State values (0..1)
    this.currentScene = 'hero'
    this.theme = 0          // 0 = dark (#0E0E10), 1 = paper (#FAFAF8)
    this.scatter = 0        // 0..1 user/timeline scatter
    this.visibility = 1     // 0..1 overall canvas visibility
    this.isTabHidden = false
    this.isIntersecting = true
    this.isDestroyed = false

    // Scene transition stagger state
    this.transitionTimer = 999
    this.transitionDuration = PARTICLE_CONFIG.transition.defaultDuration
    this.transitionStagger = PARTICLE_CONFIG.transition.defaultStagger
    this.transitionPulse = 0

    // Pointer state (smoothed)
    this.rawPointerX = -9999
    this.rawPointerY = -9999
    this.pointerX = -9999
    this.pointerY = -9999
    this.pointerActive = false

    // Performance & FPS telemetry
    this.lastFrameTime = performance.now()
    this.fps = 60
    this.avgFrameMs = 8.0
    this.slowFrameAccumMs = 0
    this.frameCounter = 0

    // Loaded Image elements & precomputed target cache
    this.images = new Map()
    this.targetCache = new Map()
    this.lastBuildMs = 0

    // Allocate TypedArrays for the particle pool
    this._allocateBuffers(this.maxCount)

    // Setup canvas dimensions, event listeners, and image loading
    this._resizeCanvas()
    this._bindEvents()
    this._initAssets()

    // Register frame loop on gsap.ticker so it shares the exact frame with Lenis
    this._tickerFn = (time, deltaTime) => this._tick(time, deltaTime)
    gsap.ticker.add(this._tickerFn)
  }

  _computeTargetCount(width) {
    if (width >= 1024) return PARTICLE_CONFIG.counts.desktop
    if (width >= 768) return PARTICLE_CONFIG.counts.tablet
    return PARTICLE_CONFIG.counts.mobile
  }

  _allocateBuffers(n) {
    // Positions & velocities
    this.x = new Float32Array(n)
    this.y = new Float32Array(n)
    this.vx = new Float32Array(n)
    this.vy = new Float32Array(n)

    // Active targets & queued scene targets (for staggered morphs)
    this.tx = new Float32Array(n)
    this.ty = new Float32Array(n)
    this.nextTx = new Float32Array(n)
    this.nextTy = new Float32Array(n)

    // Appearance & stagger delay
    this.size = new Float32Array(n)
    this.alpha = new Float32Array(n)
    this.targetAlpha = new Float32Array(n)
    this.nextAlpha = new Float32Array(n)
    this.delay = new Float32Array(n)
    this.seed = new Float32Array(n)

    // Type flag: 0 = primary (white/ink), 1 = red speck (~4.2% in About scenes)
    this.type = new Uint8Array(n)
    // Pending flag: 1 = waiting for per-particle stagger delay to elapse
    this.pendingRetarget = new Uint8Array(n)

    // Pre-allocate batch rendering bucket index arrays (zero GC in render loop)
    this.primaryBuckets = Array.from({ length: NUM_PRIMARY_BUCKETS }, () => new Int32Array(n))
    this.primaryBucketCounts = new Int32Array(NUM_PRIMARY_BUCKETS)

    this.redBuckets = Array.from({ length: NUM_RED_BUCKETS }, () => new Int32Array(n))
    this.redBucketCounts = new Int32Array(NUM_RED_BUCKETS)

    // Initialize particles with organic spread around center
    const cx = this.vw * 0.5
    const cy = this.vh * 0.52
    const redRatio = PARTICLE_CONFIG.colors.redParticleRatio

    for (let i = 0; i < n; i++) {
      const angle = Math.random() * Math.PI * 2
      const radius = Math.sqrt(Math.random()) * Math.min(this.vw, this.vh) * 0.45
      const px = cx + Math.cos(angle) * radius
      const py = cy + Math.sin(angle) * radius

      this.x[i] = px
      this.y[i] = py
      this.tx[i] = px
      this.ty[i] = py
      this.nextTx[i] = px
      this.nextTy[i] = py

      this.seed[i] = Math.random() * Math.PI * 2
      const isRed = Math.random() < redRatio ? 1 : 0
      this.type[i] = isRed

      // Red accent specks and occasional foreground specks get slightly larger sizes
      if (isRed) {
        this.size[i] = 1.25 + Math.pow(Math.random(), 1.6) * 2.1
      } else {
        this.size[i] = 0.85 + Math.pow(Math.random(), 2.0) * 1.45
      }

      this.alpha[i] = 0.0
      this.targetAlpha[i] = 0.45
      this.nextAlpha[i] = 0.45
    }
  }

  _resizeCanvas() {
    this.vw = window.innerWidth
    this.vh = window.innerHeight
    this.dpr = Math.min(PARTICLE_CONFIG.perf.maxDpr, window.devicePixelRatio || 1)

    this.canvas.width = Math.round(this.vw * this.dpr)
    this.canvas.height = Math.round(this.vh * this.dpr)
    this.canvas.style.width = `${this.vw}px`
    this.canvas.style.height = `${this.vh}px`

    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0)
  }

  _bindEvents() {
    // Pointer events on window (since canvas has pointer-events: none)
    this._onPointerMove = (e) => {
      if (this.isTouchDevice) return
      this.rawPointerX = e.clientX
      this.rawPointerY = e.clientY
      this.pointerActive = true
    }

    this._onPointerLeave = () => {
      this.pointerActive = false
      this.rawPointerX = -9999
      this.rawPointerY = -9999
    }

    // Pause when browser tab is hidden
    this._onVisibilityChange = () => {
      this.isTabHidden = document.hidden
      this.lastFrameTime = performance.now()
    }

    // Debounced window resize -> rebuild scene targets cleanly
    this._resizeTimer = null
    this._onResize = () => {
      clearTimeout(this._resizeTimer)
      this._resizeTimer = setTimeout(() => {
        if (this.isDestroyed) return
        const prevW = this.vw
        const prevH = this.vh
        this._resizeCanvas()

        // Update activeCount cap for breakpoint (clamped to allocated maxCount)
        const desiredCount = this._computeTargetCount(this.vw)
        this.activeCount = Math.min(this.maxCount, desiredCount)

        // Proportionally shift current particles immediately so there's zero jump
        const scaleX = this.vw / Math.max(1, prevW)
        const scaleY = this.vh / Math.max(1, prevH)
        for (let i = 0; i < this.maxCount; i++) {
          this.x[i] *= scaleX
          this.y[i] *= scaleY
        }

        // Clear target cache & rebuild active scene immediately, others in idle callback
        this.targetCache.clear()
        this._buildSceneTargetsSync(this.currentScene)
        this._applyTargetsImmediate(this.currentScene)
        this._scheduleIdlePrecompute()

        if (this.isReducedMotion) {
          this._renderStaticFrame()
        }
      }, 180)
    }

    window.addEventListener('pointermove', this._onPointerMove, { passive: true })
    window.addEventListener('pointerleave', this._onPointerLeave, { passive: true })
    document.addEventListener('visibilitychange', this._onVisibilityChange)
    window.addEventListener('resize', this._onResize, { passive: true })

    // IntersectionObserver on canvas
    if ('IntersectionObserver' in window) {
      this._io = new IntersectionObserver(
        (entries) => {
          if (entries[0]) {
            this.isIntersecting = entries[0].isIntersecting
          }
        },
        { threshold: 0.01 }
      )
      this._io.observe(this.canvas)
    }
  }

  _loadImage(url) {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.onload = () => resolve(img)
      img.onerror = (err) => reject(err)
      img.src = url
    })
  }

  async _initAssets() {
    try {
      // 1. Load hero portrait first for immediate startup
      const heroImg = await this._loadImage(SCENE_URLS.hero)
      if (this.isDestroyed) return
      this.images.set('hero', heroImg)

      this._buildSceneTargetsSync('hero')
      this._applyTargetsImmediate('hero')

      if (this.isReducedMotion) {
        this._renderStaticFrame()
      }

      // 2. Load & precompute About poses (pose1, pose2, pose3) in background
      const poseNames = ['pose1', 'pose2', 'pose3']
      await Promise.all(
        poseNames.map(async (name) => {
          const img = await this._loadImage(SCENE_URLS[name])
          if (!this.isDestroyed) {
            this.images.set(name, img)
          }
        })
      )

      if (!this.isDestroyed) {
        this._scheduleIdlePrecompute()
      }
    } catch (err) {
      console.error('[ParticleEngine] Asset load error:', err)
    }
  }

  _buildSceneTargetsSync(sceneName) {
    if (this.targetCache.has(sceneName)) {
      return this.targetCache.get(sceneName)
    }
    const img = this.images.get(sceneName)
    if (!img) return null

    const targets = buildTargets(img, {
      sceneName,
      count: this.maxCount,
      viewportWidth: this.vw,
      viewportHeight: this.vh,
    })
    this.lastBuildMs = targets.durationMs
    this.targetCache.set(sceneName, targets)
    return targets
  }

  _scheduleIdlePrecompute() {
    const queue = ['pose1', 'pose2', 'pose3', 'hero'].filter(
      (name) => this.images.has(name) && !this.targetCache.has(name)
    )
    if (queue.length === 0) return

    const schedule = window.requestIdleCallback || ((cb) => setTimeout(cb, 32))
    const processNext = () => {
      if (this.isDestroyed || queue.length === 0) return
      const nextScene = queue.shift()
      this._buildSceneTargetsSync(nextScene)
      if (queue.length > 0) {
        schedule(processNext)
      }
    }
    schedule(processNext)
  }

  _applyTargetsImmediate(sceneName) {
    const targets = this._buildSceneTargetsSync(sceneName)
    if (!targets) return

    const { x, y, brightness } = targets
    const n = this.maxCount

    for (let i = 0; i < n; i++) {
      this.tx[i] = x[i]
      this.ty[i] = y[i]
      this.nextTx[i] = x[i]
      this.nextTy[i] = y[i]
      this.targetAlpha[i] = brightness[i]
      this.nextAlpha[i] = brightness[i]
      this.pendingRetarget[i] = 0

      if (this.isReducedMotion) {
        this.x[i] = x[i]
        this.y[i] = y[i]
        this.alpha[i] = brightness[i]
      }
    }
  }

  /* =========================================================================
     PUBLIC API
     ========================================================================= */

  /**
   * Morphs particles to a named scene ('hero' | 'pose1' | 'pose2' | 'pose3')
   * with randomised per-particle stagger so the figure dissolves and reforms like a cloud.
   */
  setScene(name, opts = {}) {
    if (!SCENE_URLS[name] || this.isDestroyed) return

    const duration = opts.duration ?? PARTICLE_CONFIG.transition.defaultDuration
    const stagger = opts.stagger ?? PARTICLE_CONFIG.transition.defaultStagger

    this.currentScene = name
    const targets = this._buildSceneTargetsSync(name)
    if (!targets) return

    const { x, y, brightness } = targets
    const n = this.maxCount

    this.transitionDuration = duration
    this.transitionStagger = stagger
    this.transitionTimer = 0
    this.transitionPulse = 1.0

    for (let i = 0; i < n; i++) {
      this.nextTx[i] = x[i]
      this.nextTy[i] = y[i]
      this.nextAlpha[i] = brightness[i]
      this.delay[i] = Math.random() * stagger
      this.pendingRetarget[i] = 1
    }

    if (this.isReducedMotion) {
      this._applyTargetsImmediate(name)
      this._renderStaticFrame()
    }
  }

  /**
   * Sets global theme value (0 = dark background, 1 = paper background).
   * Drives particle colour (#F5F2EE -> #121212 + #E8283C red specks)
   * with an S-curve and mid-flight scatter boost to avoid mid-grey invisibility.
   */
  setTheme(value) {
    const clamped = Math.max(0, Math.min(1, Number(value) || 0))
    this.theme = clamped
    if (this.isReducedMotion) {
      this._renderStaticFrame()
    }
  }

  /**
   * Sets global scatter value (0..1) pushing particles outward with curl/noise motion.
   */
  setScatter(value) {
    this.scatter = Math.max(0, Math.min(1, Number(value) || 0))
  }

  /**
   * Sets overall stage visibility (0..1). Pauses loop when 0.
   */
  setVisibility(value) {
    this.visibility = Math.max(0, Math.min(1, Number(value) ?? 1))
    this.canvas.style.opacity = String(this.visibility)
  }

  /**
   * Cleans up ticker, observers, listeners, and buffers.
   */
  destroy() {
    this.isDestroyed = true
    clearTimeout(this._resizeTimer)
    gsap.ticker.remove(this._tickerFn)
    window.removeEventListener('pointermove', this._onPointerMove)
    window.removeEventListener('pointerleave', this._onPointerLeave)
    document.removeEventListener('visibilitychange', this._onVisibilityChange)
    window.removeEventListener('resize', this._onResize)
    if (this._io) {
      this._io.disconnect()
    }
  }

  /* =========================================================================
     INTERNAL SIMULATION & BATCH RENDER LOOP
     ========================================================================= */

  _renderStaticFrame() {
    if (this.isDestroyed) return
    this._drawBatches(0)
  }

  _tick(time) {
    if (this.isDestroyed || this.isTabHidden || !this.isIntersecting || this.visibility <= 0.001) {
      this.lastFrameTime = performance.now()
      return
    }

    if (this.isReducedMotion) {
      return
    }

    const now = performance.now()
    const dtMs = Math.min(100, now - this.lastFrameTime)
    this.lastFrameTime = now

    // Exponential moving average of frame time & automatic particle count downscaling
    this.avgFrameMs = this.avgFrameMs * 0.92 + dtMs * 0.08
    this.fps = Math.round(1000 / Math.max(1, this.avgFrameMs))

    if (dtMs > PARTICLE_CONFIG.perf.maxFrameTimeMs) {
      this.slowFrameAccumMs += dtMs
      if (this.slowFrameAccumMs >= PARTICLE_CONFIG.perf.sustainedThresholdMs) {
        this.slowFrameAccumMs = 0
        const nextCount = Math.max(
          PARTICLE_CONFIG.counts.minFallback,
          Math.floor(this.activeCount * PARTICLE_CONFIG.perf.scaleDownFactor)
        )
        this.activeCount = nextCount
      }
    } else {
      this.slowFrameAccumMs = Math.max(0, this.slowFrameAccumMs - dtMs * 0.5)
    }

    const dtSec = Math.min(0.05, dtMs * 0.001)
    this.transitionTimer += dtSec
    this.transitionPulse = Math.max(0, this.transitionPulse - dtSec * 1.35)

    // Smooth pointer coordinates with lerp
    if (this.pointerActive) {
      const lerp = PARTICLE_CONFIG.cursor.pointerLerp
      if (this.pointerX < -1000) {
        this.pointerX = this.rawPointerX
        this.pointerY = this.rawPointerY
      } else {
        this.pointerX += (this.rawPointerX - this.pointerX) * lerp
        this.pointerY += (this.rawPointerY - this.pointerY) * lerp
      }
    } else {
      this.pointerX = -9999
      this.pointerY = -9999
    }

    // Mid-theme crossover factor: peaks at theme = 0.5 (4 * t * (1 - t))
    // Pushes scatter to ~0.6 at midpoint so particles are mid-flight while colour flips
    const tTheme = this.theme
    const midCrossover = 4 * tTheme * (1 - tTheme)
    const crossoverScatter = 0.6 * Math.pow(midCrossover, 1.35)
    const effectiveScatter = Math.max(this.scatter, crossoverScatter) + this.transitionPulse * 0.22

    this._stepPhysics(time, effectiveScatter)
    this._drawBatches(midCrossover)

    // Periodic telemetry callback (~every 15 frames)
    this.frameCounter++
    if (this.onTelemetry && this.frameCounter % 15 === 0) {
      this.onTelemetry({
        fps: this.fps,
        frameMs: this.avgFrameMs.toFixed(1),
        activeCount: this.activeCount,
        maxCount: this.maxCount,
        scene: this.currentScene,
        theme: this.theme,
        scatter: effectiveScatter,
        lastBuildMs: this.lastBuildMs.toFixed(1),
      })
    }
  }

  _stepPhysics(time, effectiveScatter) {
    const n = this.activeCount
    const {
      x,
      y,
      vx,
      vy,
      tx,
      ty,
      nextTx,
      nextTy,
      alpha,
      targetAlpha,
      nextAlpha,
      delay,
      seed,
      pendingRetarget,
    } = this

    const stiffness = PARTICLE_CONFIG.physics.stiffness
    const damping = PARTICLE_CONFIG.physics.damping
    const shimmerAmp = PARTICLE_CONFIG.physics.shimmerAmplitude
    const timeFreq = time * PARTICLE_CONFIG.physics.shimmerFrequency
    const tTimer = this.transitionTimer

    const scatterDist =
      (this.vw < 768
        ? PARTICLE_CONFIG.physics.scatterRadiusMobile
        : PARTICLE_CONFIG.physics.scatterRadiusDesktop) * effectiveScatter

    // Cursor repulsion parameters
    const cursorRadius = PARTICLE_CONFIG.cursor.baseRadius * Math.max(0.65, this.vw / 1440)
    const cursorRadiusSq = cursorRadius * cursorRadius
    const repelStrength = PARTICLE_CONFIG.cursor.repelStrength
    const px = this.pointerX
    const py = this.pointerY
    const hasPointer = this.pointerActive && !this.isTouchDevice

    for (let i = 0; i < n; i++) {
      const s = seed[i]

      // 1. Check staggered scene retargeting
      if (pendingRetarget[i] === 1 && tTimer >= delay[i]) {
        pendingRetarget[i] = 0
        tx[i] = nextTx[i]
        ty[i] = nextTy[i]
        targetAlpha[i] = nextAlpha[i]

        // Apply organic curl impulse when particle begins its flight to new pose
        const curlAngle = s + time * 1.5
        vx[i] += Math.cos(curlAngle) * 4.5
        vy[i] += Math.sin(curlAngle) * 4.5
      }

      // 2. Compute target with optional curl/noise scatter offset
      let destX = tx[i]
      let destY = ty[i]

      if (scatterDist > 0.25) {
        const noiseAngle = s * 3.0 + time * 1.35
        const radialMod = 0.45 + 0.55 * Math.sin(s * 7.1 + time * 0.9)
        destX += Math.cos(noiseAngle) * scatterDist * radialMod
        destY += Math.sin(noiseAngle * 1.15) * scatterDist * radialMod
      }

      // 3. Spring force + idle noise shimmer
      const dx = destX - x[i]
      const dy = destY - y[i]
      const phase = s + timeFreq

      let nvx = (vx[i] + dx * stiffness + Math.cos(phase) * shimmerAmp) * damping
      let nvy = (vy[i] + dy * stiffness + Math.sin(phase) * shimmerAmp) * damping

      // 4. Cursor repulsion (fast bounding-box pre-check rejects ~97% of particles)
      if (hasPointer) {
        const cdx = x[i] - px
        if (cdx > -cursorRadius && cdx < cursorRadius) {
          const cdy = y[i] - py
          if (cdy > -cursorRadius && cdy < cursorRadius) {
            const distSq = cdx * cdx + cdy * cdy
            if (distSq < cursorRadiusSq && distSq > 0.01) {
              const dist = Math.sqrt(distSq)
              const force = (1 - dist / cursorRadius) * repelStrength
              nvx += (cdx / dist) * force
              nvy += (cdy / dist) * force
            }
          }
        }
      }

      vx[i] = nvx
      vy[i] = nvy
      x[i] += nvx
      y[i] += nvy

      // Smooth alpha interpolation
      alpha[i] += (targetAlpha[i] - alpha[i]) * 0.08
    }
  }

  _drawBatches(midCrossover = 0) {
    const ctx = this.ctx
    const n = this.activeCount
    const {
      x,
      y,
      size,
      alpha,
      type,
      primaryBuckets,
      primaryBucketCounts,
      redBuckets,
      redBucketCounts,
    } = this

    ctx.clearRect(0, 0, this.vw, this.vh)

    // Reset bucket counters
    for (let b = 0; b < NUM_PRIMARY_BUCKETS; b++) primaryBucketCounts[b] = 0
    for (let b = 0; b < NUM_RED_BUCKETS; b++) redBucketCounts[b] = 0

    // 1. Eased S-curve for theme colour to avoid lingering in mid-grey
    const t = this.theme
    const u = Math.max(0, Math.min(1, (t - 0.22) / 0.56))
    const colorMix = u * u * (3 - 2 * u) // Steep S-curve: 0 on dark, 1 on paper

    const [rLight, gLight, bLight] = PARTICLE_CONFIG.colors.lightTextRgb
    const [rInk, gInk, bInk] = PARTICLE_CONFIG.colors.darkInkRgb
    const [rRed, gRed, bRed] = PARTICLE_CONFIG.colors.accentRedRgb

    const pR = Math.round(rLight + (rInk - rLight) * colorMix)
    const pG = Math.round(gLight + (gInk - gLight) * colorMix)
    const pB = Math.round(bLight + (bInk - bLight) * colorMix)

    // Red share fades in smoothly with theme value (0 in Hero, full #E8283C in About)
    const redMix = Math.max(0, Math.min(1, (t - 0.15) / 0.65))
    const redR = Math.round(rLight + (rRed - rLight) * redMix)
    const redG = Math.round(gLight + (gRed - gLight) * redMix)
    const redB = Math.round(bLight + (bRed - bLight) * redMix)
    const useRedBuckets = redMix > 0.05

    // Opacity boost on paper so ink dots read as rich texture, plus slight boost during crossover
    const opacityBoost = 1.0 + t * 0.35 + midCrossover * 0.22
    // Particles are slightly larger at the mid-crossover point while in flight
    const sizeBoost = 1.0 + midCrossover * 0.36

    // 2. Partition particles into alpha/colour buckets
    for (let i = 0; i < n; i++) {
      const a = alpha[i] * opacityBoost
      if (a < 0.05) continue

      if (useRedBuckets && type[i] === 1) {
        const rb = a > 0.55 ? 1 : 0
        redBuckets[rb][redBucketCounts[rb]++] = i
      } else {
        let pb = (a * NUM_PRIMARY_BUCKETS) | 0
        if (pb >= NUM_PRIMARY_BUCKETS) pb = NUM_PRIMARY_BUCKETS - 1
        primaryBuckets[pb][primaryBucketCounts[pb]++] = i
      }
    }

    // 3. Batch-draw Primary Buckets (only 4 fill() calls total!)
    const bucketAlphas = [0.22, 0.44, 0.68, 0.92]
    for (let b = 0; b < NUM_PRIMARY_BUCKETS; b++) {
      const count = primaryBucketCounts[b]
      if (count === 0) continue

      const list = primaryBuckets[b]
      const bAlpha = Math.min(1, bucketAlphas[b] * opacityBoost).toFixed(2)
      ctx.fillStyle = `rgba(${pR},${pG},${pB},${bAlpha})`
      ctx.beginPath()

      for (let k = 0; k < count; k++) {
        const i = list[k]
        const s = size[i] * sizeBoost
        const half = s * 0.5
        ctx.rect(x[i] - half, y[i] - half, s, s)
      }
      ctx.fill()
    }

    // 4. Batch-draw Red Speck Buckets (only 2 fill() calls total!)
    if (useRedBuckets) {
      const redAlphas = [0.52, 0.92]
      for (let rb = 0; rb < NUM_RED_BUCKETS; rb++) {
        const count = redBucketCounts[rb]
        if (count === 0) continue

        const list = redBuckets[rb]
        const rAlpha = (redAlphas[rb] * redMix).toFixed(2)
        ctx.fillStyle = `rgba(${redR},${redG},${redB},${rAlpha})`
        ctx.beginPath()

        for (let k = 0; k < count; k++) {
          const i = list[k]
          const r = size[i] * sizeBoost * 0.65
          const px = x[i]
          const py = y[i]
          ctx.moveTo(px + r, py)
          ctx.arc(px, py, r, 0, Math.PI * 2)
        }
        ctx.fill()
      }
    }
  }
}
