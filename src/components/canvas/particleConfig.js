/**
 * Tunable configuration constants for the persistent Canvas 2D Particle Stage.
 */
export const PARTICLE_CONFIG = {
  // Pool size by viewport breakpoint
  counts: {
    desktop: 24000, // width >= 1024px
    tablet: 14000,  // 768px <= width < 1024px
    mobile: 8000,   // width < 768px
    minFallback: 5000,
  },

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

