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
    this.heroEntrancePlayed = false
    this.heroEntranceQueued = false

    // Scene transition stagger state
    this.transitionTimer = 999
    this.transitionDuration = PARTICLE_CONFIG.transition.defaultDuration
    this.transitionStagger = PARTICLE_CONFIG.transition.defaultStagger
    this.transitionPulse = 0

    // Pointer state (smoothed) & subtle portrait parallax (8-12px)
    this.rawPointerX = -9999
    this.rawPointerY = -9999
    this.pointerX = -9999
    this.pointerY = -9999
    this.pointerActive = false
    this.parallaxX = 0
    this.parallaxY = 0

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
    this.x = new Float32Array(n)
    this.y = new Float32Array(n)
    this.vx = new Float32Array(n)
    this.vy = new Float32Array(n)

    this.tx = new Float32Array(n)
    this.ty = new Float32Array(n)
    this.nextTx = new Float32Array(n)
    this.nextTy = new Float32Array(n)

    this.size = new Float32Array(n)
    this.alpha = new Float32Array(n)
    this.targetAlpha = new Float32Array(n)
    this.nextAlpha = new Float32Array(n)
    this.delay = new Float32Array(n)
    this.seed = new Float32Array(n)

    this.type = new Uint8Array(n)
    this.pendingRetarget = new Uint8Array(n)

    this.primaryBuckets = Array.from({ length: NUM_PRIMARY_BUCKETS }, () => new Int32Array(n))
    this.primaryBucketCounts = new Int32Array(NUM_PRIMARY_BUCKETS)

    this.redBuckets = Array.from({ length: NUM_RED_BUCKETS }, () => new Int32Array(n))
    this.redBucketCounts = new Int32Array(NUM_RED_BUCKETS)

    const cx = this.vw * 0.5
    const cy = this.vh * 0.52
    const redRatio = PARTICLE_CONFIG.colors.redParticleRatio

    for (let i = 0; i < n; i++) {
      const angle = Math.random() * Math.PI * 2
      const radius = (0.15 + Math.sqrt(Math.random()) * 0.65) * Math.max(this.vw, this.vh) * 0.55
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

      if (isRed) {
        this.size[i] = 1.25 + Math.pow(Math.random(), 1.6) * 2.1
      } else {
        this.size[i] = 0.85 + Math.pow(Math.random(), 2.0) * 1.45
      }

      this.alpha[i] = 0.0
      this.targetAlpha[i] = 0.0
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

    this._onVisibilityChange = () => {
      this.isTabHidden = document.hidden
      this.lastFrameTime = performance.now()
    }

    this._resizeTimer = null
    this._onResize = () => {
      clearTimeout(this._resizeTimer)
      this._resizeTimer = setTimeout(() => {
        if (this.isDestroyed) return
        const prevW = this.vw
        const prevH = this.vh
        this._resizeCanvas()

        const desiredCount = this._computeTargetCount(this.vw)
        this.activeCount = Math.min(this.maxCount, desiredCount)

        const scaleX = this.vw / Math.max(1, prevW)
        const scaleY = this.vh / Math.max(1, prevH)
        for (let i = 0; i < this.maxCount; i++) {
          this.x[i] *= scaleX
          this.y[i] *= scaleY
        }

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
      const heroImg = await this._loadImage(SCENE_URLS.hero)
      if (this.isDestroyed) return
      this.images.set('hero', heroImg)

      this._buildSceneTargetsSync('hero')

      if (this.isReducedMotion) {
        this._applyTargetsImmediate('hero')
        this._renderStaticFrame()
      } else if (this.heroEntranceQueued || this.heroEntrancePlayed) {
        this.playHeroEntrance()
      } else {
        this._prepareScatteredHeroStart()
      }

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

  _prepareScatteredHeroStart() {
    const targets = this._buildSceneTargetsSync('hero')
    if (!targets) return
    const { x, y, brightness } = targets
    const n = this.maxCount
    const spreadScale = Math.min(this.vw, this.vh) * 0.32

    for (let i = 0; i < n; i++) {
      const angle = this.seed[i] * 2.3
      const dist = (0.3 + Math.random() * 0.7) * spreadScale
      const sx = x[i] + Math.cos(angle) * dist
      const sy = y[i] + Math.sin(angle) * dist - 35

      this.x[i] = sx
      this.y[i] = sy
      this.tx[i] = sx
      this.ty[i] = sy
      this.nextTx[i] = x[i]
      this.nextTy[i] = y[i]
      this.alpha[i] = brightness[i] * 0.18
      this.targetAlpha[i] = brightness[i] * 0.18
      this.nextAlpha[i] = brightness[i]
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
   * Plays the Hero Entrance assembly (~2.2s):
   * Particles start scattered and assemble into the portrait with stagger and ease-out,
   * beginning at the head (top Y) and moving downward toward the torso/arms.
   */
  playHeroEntrance(opts = {}) {
    if (this.isDestroyed) return
    this.heroEntranceQueued = true

    const targets = this._buildSceneTargetsSync('hero')
    if (!targets) return

    this.heroEntrancePlayed = true
    this.currentScene = 'hero'

    if (this.isReducedMotion) {
      this._applyTargetsImmediate('hero')
      this._renderStaticFrame()
      return
    }

    const duration = opts.duration ?? 2.2
    const { x, y, brightness } = targets
    const n = this.maxCount

    let minY = Infinity
    let maxY = -Infinity
    for (let i = 0; i < n; i++) {
      if (y[i] < minY) minY = y[i]
      if (y[i] > maxY) maxY = y[i]
    }
    const spanY = Math.max(1, maxY - minY)
    const spreadScale = Math.min(this.vw, this.vh) * 0.28

    this.transitionDuration = duration
    this.transitionStagger = 1.15
    this.transitionTimer = 0
    this.transitionPulse = 0.65

    for (let i = 0; i < n; i++) {
      const normY = Math.max(0, Math.min(1, (y[i] - minY) / spanY))
      const angle = this.seed[i] * 2.3
      const dist = (0.25 + Math.random() * 0.75) * spreadScale

      const sx = x[i] + Math.cos(angle) * dist
      const sy = y[i] + Math.sin(angle) * dist - 28

      this.x[i] = sx
      this.y[i] = sy
      this.tx[i] = sx
      this.ty[i] = sy
      this.nextTx[i] = x[i]
      this.nextTy[i] = y[i]

      this.alpha[i] = brightness[i] * 0.15
      this.targetAlpha[i] = brightness[i] * 0.22
      this.nextAlpha[i] = brightness[i]

      this.delay[i] = normY * 0.92 + Math.random() * 0.22
      this.pendingRetarget[i] = 1
    }
  }

  /**
   * Morphs particles to a named scene ('hero' | 'pose1' | 'pose2' | 'pose3')
   * with randomised per-particle stagger so the figure dissolves and reforms like a cloud.
   */
  setScene(name, opts = {}) {
    if (!SCENE_URLS[name] || this.isDestroyed) return
    if (this.currentScene === name && this.transitionTimer > 0.6 && !opts.force) return

    const duration = opts.duration ?? PARTICLE_CONFIG.transition.defaultDuration
    const stagger = opts.stagger ?? PARTICLE_CONFIG.transition.defaultStagger
    const scatterBump = opts.scatterBump ?? 0.25

    this.currentScene = name
    const targets = this._buildSceneTargetsSync(name)
    if (!targets) return

    const { x, y, brightness } = targets
    const n = this.maxCount

    this.transitionDuration = duration
    this.transitionStagger = stagger
    this.transitionTimer = 0
    this.transitionPulse = Math.max(this.transitionPulse, scatterBump * 3.5)

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
   * Continuously scrubs particle targets between two scenes (0..1) with per-particle stagger.
   * Ensures 100% reversible, butter-smooth scroll transitions (e.g. Hero <-> About Pose 01).
   */
  setMorph(fromName, toName, progress) {
    if (this.isDestroyed) return
    const t = Math.max(0, Math.min(1, Number(progress) || 0))
    if (this.lastMorphT !== undefined && Math.abs(t - this.lastMorphT) < 0.002 && t > 0.001 && t < 0.999) return
    this.lastMorphT = t

    const fromTargets = this._buildSceneTargetsSync(fromName)
    const toTargets = this._buildSceneTargetsSync(toName)
    if (!fromTargets || !toTargets) return

    this.currentScene = t >= 0.5 ? toName : fromName

    const fx = fromTargets.x
    const fy = fromTargets.y
    const fb = fromTargets.brightness
    const txArr = toTargets.x
    const tyArr = toTargets.y
    const tb = toTargets.brightness

    const n = this.maxCount
    const staggerSpan = 0.42
    const invSpan = 1 / (1 - staggerSpan)

    for (let i = 0; i < n; i++) {
      // Deterministic per-particle stagger from seed (0..0.42)
      const pStagger = (this.seed[i] * 0.15915494) * staggerSpan
      const localT = Math.max(0, Math.min(1, (t - pStagger) * invSpan))
      // Smoothstep easing per particle
      const easeT = localT * localT * (3 - 2 * localT)

      this.tx[i] = fx[i] + (txArr[i] - fx[i]) * easeT
      this.ty[i] = fy[i] + (tyArr[i] - fy[i]) * easeT
      this.targetAlpha[i] = fb[i] + (tb[i] - fb[i]) * easeT
      this.pendingRetarget[i] = 0

      if (this.isReducedMotion) {
        this.x[i] = this.tx[i]
        this.y[i] = this.ty[i]
        this.alpha[i] = this.targetAlpha[i]
      }
    }

    if (this.isReducedMotion) {
      this._renderStaticFrame()
    }
  }

  /**
   * Sets global theme value (0 = dark background, 1 = paper background).
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
    this.transitionPulse = Math.max(0, this.transitionPulse - dtSec * 1.15)

    // Smooth pointer coordinates with lerp & compute subtle portrait parallax (9px Hero, 12px About)
    if (this.pointerActive && !this.isTouchDevice) {
      const lerp = PARTICLE_CONFIG.cursor.pointerLerp
      if (this.pointerX < -1000) {
        this.pointerX = this.rawPointerX
        this.pointerY = this.rawPointerY
      } else {
        this.pointerX += (this.rawPointerX - this.pointerX) * lerp
        this.pointerY += (this.rawPointerY - this.pointerY) * lerp
      }

      const maxParallaxX = 9.0 + this.theme * 3.0 // 9px in Hero -> 12px in About
      const maxParallaxY = 7.0 + this.theme * 2.5
      const normX = (this.rawPointerX / Math.max(1, this.vw) - 0.5) * 2
      const normY = (this.rawPointerY / Math.max(1, this.vh) - 0.5) * 2
      const targetPx = normX * maxParallaxX
      const targetPy = normY * maxParallaxY
      this.parallaxX += (targetPx - this.parallaxX) * 0.06
      this.parallaxY += (targetPy - this.parallaxY) * 0.06
    } else {
      this.pointerX = -9999
      this.pointerY = -9999
      this.parallaxX += (0 - this.parallaxX) * 0.06
      this.parallaxY += (0 - this.parallaxY) * 0.06
    }

    const tTheme = this.theme
    const midCrossover = 4 * tTheme * (1 - tTheme)
    const crossoverScatter = 0.6 * Math.pow(midCrossover, 1.35)
    const effectiveScatter = Math.max(this.scatter, crossoverScatter) + this.transitionPulse * 0.18

    this._stepPhysics(time, effectiveScatter)
    this._drawBatches(midCrossover)

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
      parallaxX,
      parallaxY,
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

    const cursorRadius = PARTICLE_CONFIG.cursor.baseRadius * Math.max(0.65, this.vw / 1440)
    const cursorRadiusSq = cursorRadius * cursorRadius
    const repelStrength = PARTICLE_CONFIG.cursor.repelStrength
    const px = this.pointerX
    const py = this.pointerY
    const hasPointer = this.pointerActive && !this.isTouchDevice

    for (let i = 0; i < n; i++) {
      const s = seed[i]

      if (pendingRetarget[i] === 1 && tTimer >= delay[i]) {
        pendingRetarget[i] = 0
        tx[i] = nextTx[i]
        ty[i] = nextTy[i]
        targetAlpha[i] = nextAlpha[i]

        const curlAngle = s + time * 1.5
        vx[i] += Math.cos(curlAngle) * 3.4
        vy[i] += Math.sin(curlAngle) * 3.4
      }

      const depthMod = 0.65 + targetAlpha[i] * 0.45
      let destX = tx[i] + parallaxX * depthMod
      let destY = ty[i] + parallaxY * depthMod

      if (scatterDist > 0.25) {
        const noiseAngle = s * 3.0 + time * 1.35
        const radialMod = 0.45 + 0.55 * Math.sin(s * 7.1 + time * 0.9)
        destX += Math.cos(noiseAngle) * scatterDist * radialMod
        destY += Math.sin(noiseAngle * 1.15) * scatterDist * radialMod
      }

      const dx = destX - x[i]
      const dy = destY - y[i]
      const phase = s + timeFreq

      let nvx = (vx[i] + dx * stiffness + Math.cos(phase) * shimmerAmp) * damping
      let nvy = (vy[i] + dy * stiffness + Math.sin(phase) * shimmerAmp) * damping

      if (hasPointer) {
        const cdx = x[i] - px
        if (cdx > -cursorRadius && cdx < cursorRadius) {
          const cdy = y[i] - py
          if (cdy > -cursorRadius && cdy < cursorRadius) {
            const distSq = cdx * cdx + cdy * cdy
            if (distSq < cursorRadiusSq && distSq > 0.01) {
              const dist = Math.sqrt(distSq)
              const falloff = 1 - dist / cursorRadius
              const force = falloff * falloff * repelStrength
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

      alpha[i] += (targetAlpha[i] - alpha[i]) * 0.085
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

    for (let b = 0; b < NUM_PRIMARY_BUCKETS; b++) primaryBucketCounts[b] = 0
    for (let b = 0; b < NUM_RED_BUCKETS; b++) redBucketCounts[b] = 0

    const t = this.theme
    const u = Math.max(0, Math.min(1, (t - 0.22) / 0.56))
    const colorMix = u * u * (3 - 2 * u)

    const [rLight, gLight, bLight] = PARTICLE_CONFIG.colors.lightTextRgb
    const [rInk, gInk, bInk] = PARTICLE_CONFIG.colors.darkInkRgb
    const [rRed, gRed, bRed] = PARTICLE_CONFIG.colors.accentRedRgb

    const pR = Math.round(rLight + (rInk - rLight) * colorMix)
    const pG = Math.round(gLight + (gInk - gLight) * colorMix)
    const pB = Math.round(bLight + (bInk - bLight) * colorMix)

    const redMix = Math.max(0, Math.min(1, (t - 0.15) / 0.65))
    const redR = Math.round(rLight + (rRed - rLight) * redMix)
    const redG = Math.round(gLight + (gRed - gLight) * redMix)
    const redB = Math.round(bLight + (bRed - bLight) * redMix)
    const useRedBuckets = redMix > 0.05

    // On mobile (< 900px), reduce particle opacity behind About text to ~0.35 so text stays legible
    const isMobileAbout = this.vw < 900 && t > 0.1
    const mobileAttenuation = isMobileAbout ? 1 - t * 0.65 : 1.0

    const opacityBoost = (1.0 + t * 0.35 + midCrossover * 0.22) * mobileAttenuation
    const sizeBoost = 1.0 + midCrossover * 0.36

    for (let i = 0; i < n; i++) {
      const a = alpha[i] * opacityBoost
      if (a < 0.04) continue

      if (useRedBuckets && type[i] === 1) {
        const rb = a > 0.55 ? 1 : 0
        redBuckets[rb][redBucketCounts[rb]++] = i
      } else {
        let pb = (a * NUM_PRIMARY_BUCKETS) | 0
        if (pb >= NUM_PRIMARY_BUCKETS) pb = NUM_PRIMARY_BUCKETS - 1
        primaryBuckets[pb][primaryBucketCounts[pb]++] = i
      }
    }

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

    if (useRedBuckets) {
      const redAlphas = [0.52, 0.92]
      for (let rb = 0; rb < NUM_RED_BUCKETS; rb++) {
        const count = redBucketCounts[rb]
        if (count === 0) continue

        const list = redBuckets[rb]
        const rAlpha = (redAlphas[rb] * redMix * mobileAttenuation).toFixed(2)
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
