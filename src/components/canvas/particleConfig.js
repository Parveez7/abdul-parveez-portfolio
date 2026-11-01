/**
 * Tunable configuration constants for the persistent Canvas 2D Particle Stage.
 */

// Tunable Hero portrait scale (1.46x meets 90-95% viewport height across desktop resolutions)
export const HERO_PORTRAIT_SCALE = 1.46

// Tunable Hero particle diameter in CSS px (reduced ~42% from ~1.4px for finer, dense detail)
export const HERO_PARTICLE_SIZE = 0.82

export const PARTICLE_CONFIG = {
  // Tunable constants exposed for Hero
  heroPortraitScale: HERO_PORTRAIT_SCALE,
  heroParticleSize: HERO_PARTICLE_SIZE,

  // Per-scene particle counts & visual settings
  scenes: {
    hero: {
      counts: {
        desktop: 42000, // width >= 1024px (1.75x density for smaller dots)
        tablet: 22000,  // 768px <= width < 1024px
        mobile: 12000,  // width < 768px
      },
      particleSize: HERO_PARTICLE_SIZE,
      alphaBoost: 1.18, // Nudge alpha up slightly so smaller dots keep presence & brightness
    },
    about: {
      counts: {
        desktop: 24000, // Keeps exact About poses look
        tablet: 14000,
        mobile: 8000,
      },
      particleSize: 1.35, // Original About particle size
      alphaBoost: 1.0,
    },
  },

  // Fallback floor for quality scaling
  minFallback: 6000,

  // Performance safeguard: scale down if frame delta > 20ms sustained for 2000ms
  perf: {
    maxFrameTimeMs: 20,
    sustainedThresholdMs: 2000,
    scaleDownFactor: 0.75,
    maxDpr: 2,
  },

  // Motion & Spring physics
  physics: {
    stiffness: 0.085,
    damping: 0.82,
    shimmerAmplitude: 0.22,
    shimmerFrequency: 1.6,
    scatterRadiusDesktop: 180,
    scatterRadiusMobile: 95,
  },

  // Cursor interaction
  cursor: {
    baseRadius: 110,        // Scaled relative to 1440px viewport width
    repelStrength: 2.6,
    pointerLerp: 0.18,
  },

  // Theme & Colors
  colors: {
    lightTextRgb: [245, 242, 238], // #F5F2EE (Hero on dark)
    darkInkRgb: [18, 18, 18],      // #121212 (About on paper)
    accentRedRgb: [232, 40, 60],   // #E8283C (Red specks in About)
    bgDarkHex: '#0E0E10',
    bgPaperHex: '#FAFAF8',
    redParticleRatio: 0.042,       // ~4.2% red specks in About scenes
  },

  // Default scene transition timing
  transition: {
    defaultDuration: 1.25,
    defaultStagger: 0.55,
  },
}
