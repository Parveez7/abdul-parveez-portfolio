import React, { useEffect, useRef, useState } from 'react'
import './ProjectMocks.css'

/**
 * AI Diet Coach Phone Frame Mock
 * 9s animated sequence:
 * 1. Viewfinder active with concentric plate
 * 2. Scan line sweeps down plate
 * 3. Result card slides up with ~520 kcal, macro breakdown ring, and 2 dietary suggestions
 * 4. Gentle pause, then fade/reset
 */
export function DietCoachMock({ isPaused }) {
  const [phase, setPhase] = useState(0) // 0: scanning, 1: analyzed, 2: result card visible

  useEffect(() => {
    if (isPaused) return

    let isMounted = true
    const loop = () => {
      if (!isMounted) return
      setPhase(0) // scan sweeps
      const t1 = setTimeout(() => {
        if (!isMounted) return
        setPhase(1) // result slides up
      }, 3200)

      const t2 = setTimeout(() => {
        if (!isMounted) return
        setPhase(2) // recommendations highlight
      }, 5400)

      const t3 = setTimeout(() => {
        if (!isMounted) return
        // loop resets at 9000ms
        loop()
      }, 9000)

      return () => {
        clearTimeout(t1)
        clearTimeout(t2)
        clearTimeout(t3)
      }
    }

    const cleanup = loop()
    return () => {
      isMounted = false
      if (cleanup) cleanup()
    }
  }, [isPaused])

  return (
    <div className={`diet-mock ${isPaused ? 'diet-mock--paused' : ''}`}>
      <div className="diet-mock__phone-frame">
        {/* Phone Speaker & Camera Notch */}
        <div className="diet-mock__notch">
          <span className="diet-mock__speaker" />
          <span className="diet-mock__lens" />
        </div>

        {/* Viewfinder Screen Area */}
        <div className="diet-mock__screen">
          {/* Top Bar HUD */}
          <div className="diet-mock__top-bar">
            <span className="diet-mock__live-tag">
              <span className="diet-mock__live-dot" /> LIVE VISION
            </span>
            <span className="diet-mock__lens-mode">MACRO SCAN</span>
          </div>

          {/* Viewfinder Reticle / Corner Brackets */}
          <div className="diet-mock__reticle">
            <div className="diet-mock__bracket diet-mock__bracket--tl" />
            <div className="diet-mock__bracket diet-mock__bracket--tr" />
            <div className="diet-mock__bracket diet-mock__bracket--bl" />
            <div className="diet-mock__bracket diet-mock__bracket--br" />

            {/* Concentric Tonal Plate Graphic */}
            <div className="diet-mock__plate-wrap">
              <svg className="diet-mock__plate-svg" viewBox="0 0 160 160" fill="none">
                {/* Outer Plate Rim */}
                <circle cx="80" cy="80" r="74" stroke="rgba(245, 242, 238, 0.16)" strokeWidth="1.5" />
                <circle cx="80" cy="80" r="62" stroke="rgba(245, 242, 238, 0.08)" strokeWidth="1" strokeDasharray="3 3" />
                {/* Inner Plate Surface */}
                <circle cx="80" cy="80" r="54" fill="rgba(255, 255, 255, 0.02)" />
                {/* Abstract Food Portion Shapes */}
                {/* Portion 1: Protein (Salmon / Tofu Shape) */}
                <path d="M 62 55 Q 85 45 106 60 Q 98 85 75 80 Z" fill="rgba(232, 40, 60, 0.22)" stroke="#E8283C" strokeWidth="1" />
                {/* Portion 2: Rice / Carbs Bowl */}
                <path d="M 52 88 Q 78 82 92 108 Q 62 118 52 88 Z" fill="rgba(245, 242, 238, 0.08)" stroke="rgba(245, 242, 238, 0.26)" strokeWidth="1" />
                {/* Portion 3: Greens / Veggies */}
                <path d="M 94 72 Q 118 78 114 102 Q 88 100 94 72 Z" fill="rgba(80, 180, 120, 0.14)" stroke="rgba(80, 180, 120, 0.45)" strokeWidth="1" />
              </svg>
            </div>

            {/* Scanning Line Sweeper */}
            <div className={`diet-mock__scan-line ${phase === 0 ? 'diet-mock__scan-line--active' : ''}`} />
          </div>

          {/* Sliding Result Bottom Sheet */}
          <div className={`diet-mock__sheet ${phase >= 1 ? 'diet-mock__sheet--visible' : ''}`}>
            <div className="diet-mock__sheet-handle" />

            <div className="diet-mock__sheet-header">
              <div>
                <span className="diet-mock__kcal-label">ESTIMATED MEAL</span>
                <div className="diet-mock__kcal-num">
                  ~520 <span className="diet-mock__kcal-unit">kcal</span>
                </div>
              </div>

              {/* Animated Macro Ring SVG */}
              <div className="diet-mock__macro-ring">
                <svg viewBox="0 0 44 44" className="diet-mock__ring-svg">
                  <circle cx="22" cy="22" r="17" stroke="rgba(245, 242, 238, 0.12)" strokeWidth="3.5" fill="none" />
                  {/* Protein Arc (Red) */}
                  <circle
                    cx="22" cy="22" r="17"
                    stroke="#E8283C" strokeWidth="3.5" fill="none"
                    strokeDasharray="106" strokeDashoffset="68"
                    strokeLinecap="round"
                    transform="rotate(-90 22 22)"
                  />
                  {/* Carbs Arc (Warm Muted) */}
                  <circle
                    cx="22" cy="22" r="17"
                    stroke="rgba(245, 242, 238, 0.55)" strokeWidth="3.5" fill="none"
                    strokeDasharray="106" strokeDashoffset="82"
                    strokeLinecap="round"
                    transform="rotate(40 22 22)"
                  />
                </svg>
                <span className="diet-mock__ring-text">84%</span>
              </div>
            </div>

            {/* Suggestions Block */}
            <div className="diet-mock__suggestions">
              <div className={`diet-mock__sugg-row diet-mock__sugg-row--add ${phase >= 2 ? 'diet-mock__sugg-row--in' : ''}`}>
                <span className="diet-mock__sugg-badge">+</span>
                <span className="diet-mock__sugg-text">Add a protein source</span>
              </div>
              <div className={`diet-mock__sugg-row diet-mock__sugg-row--reduce ${phase >= 2 ? 'diet-mock__sugg-row--in' : ''}`}>
                <span className="diet-mock__sugg-badge">-</span>
                <span className="diet-mock__sugg-text">Reduce the portion of rice</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      <p className="mock-caption">Illustrative preview</p>
    </div>
  )
}

/**
 * Emotion Suggestion App Window Mock
 * 10s animated sequence:
 * 1. Neutral face scan with balanced bars
 * 2. Joy / Focus peak
 * 3. Stress / Negative state triggers accent-red border flash & "Low mood detected" warning
 * 4. Calming uplift recommendation appears, bars settle back down
 */
export function EmotionScannerMock({ isPaused }) {
  const [state, setState] = useState('neutral') // 'neutral' | 'active' | 'warning' | 'uplift'

  useEffect(() => {
    if (isPaused) return

    let isMounted = true
    const loop = () => {
      if (!isMounted) return
      setState('neutral')

      const t1 = setTimeout(() => {
        if (!isMounted) return
        setState('active')
      }, 2500)

      const t2 = setTimeout(() => {
        if (!isMounted) return
        setState('warning')
      }, 5000)

      const t3 = setTimeout(() => {
        if (!isMounted) return
        setState('uplift')
      }, 7200)

      const t4 = setTimeout(() => {
        if (!isMounted) return
        loop()
      }, 10000)

      return () => {
        clearTimeout(t1)
        clearTimeout(t2)
        clearTimeout(t3)
        clearTimeout(t4)
      }
    }

    const cleanup = loop()
    return () => {
      isMounted = false
      if (cleanup) cleanup()
    }
  }, [isPaused])

  const isWarning = state === 'warning'
  const isUplift = state === 'uplift'

  return (
    <div className={`emotion-mock ${isPaused ? 'emotion-mock--paused' : ''}`}>
      <div className={`emotion-mock__window ${isWarning ? 'emotion-mock__window--warning' : ''}`}>
        {/* Window Header */}
        <div className="emotion-mock__titlebar">
          <div className="emotion-mock__dots">
            <span className="emotion-mock__dot emotion-mock__dot--close" />
            <span className="emotion-mock__dot" />
            <span className="emotion-mock__dot" />
          </div>
          <span className="emotion-mock__title">emotion_track_v2.py — 60 FPS</span>
          <span className="emotion-mock__status-chip">
            {isWarning ? 'ALERT' : 'TRACKING'}
          </span>
        </div>

        {/* Window Body: Left Face Wireframe + Right Emotion Bars */}
        <div className="emotion-mock__body">
          {/* Left Column: Hairline Wireframe Face with Corner Brackets */}
          <div className="emotion-mock__viewport">
            <div className="emotion-mock__bracket emotion-mock__bracket--tl" />
            <div className="emotion-mock__bracket emotion-mock__bracket--tr" />
            <div className="emotion-mock__bracket emotion-mock__bracket--bl" />
            <div className="emotion-mock__bracket emotion-mock__bracket--br" />

            <svg viewBox="0 0 160 180" className="emotion-mock__face-svg" fill="none">
              {/* Head Contour Oval */}
              <ellipse
                cx="80" cy="90" rx="52" ry="68"
                stroke={isWarning ? '#E8283C' : 'rgba(245, 242, 238, 0.45)'}
                strokeWidth="1.2"
                strokeDasharray={isWarning ? 'none' : '4 2'}
              />
              {/* Eyebrows */}
              <path
                d={isWarning ? 'M 54 68 Q 66 74 74 72' : 'M 54 70 Q 66 67 74 70'}
                stroke="rgba(245, 242, 238, 0.65)" strokeWidth="1.4" strokeLinecap="round"
              />
              <path
                d={isWarning ? 'M 106 68 Q 94 74 86 72' : 'M 106 70 Q 94 67 86 70'}
                stroke="rgba(245, 242, 238, 0.65)" strokeWidth="1.4" strokeLinecap="round"
              />
              {/* Eyes */}
              <ellipse cx="64" cy="80" rx="5.5" ry="3.5" stroke="rgba(245, 242, 238, 0.75)" strokeWidth="1.2" />
              <circle cx="64" cy="80" r="1.5" fill={isWarning ? '#E8283C' : '#F5F2EE'} />
              <ellipse cx="96" cy="80" rx="5.5" ry="3.5" stroke="rgba(245, 242, 238, 0.75)" strokeWidth="1.2" />
              <circle cx="96" cy="80" r="1.5" fill={isWarning ? '#E8283C' : '#F5F2EE'} />
              {/* Nose Bridge */}
              <path d="M 80 82 L 80 102 L 85 105" stroke="rgba(245, 242, 238, 0.35)" strokeWidth="1.1" strokeLinecap="round" />
              {/* Mouth: Neutral -> Smile -> Downward Curve in Warning -> Soft Curve in Uplift */}
              <path
                d={
                  isWarning
                    ? 'M 64 126 Q 80 118 96 126'
                    : state === 'active'
                    ? 'M 64 122 Q 80 132 96 122'
                    : 'M 65 124 Q 80 126 95 124'
                }
                stroke={isWarning ? '#E8283C' : 'rgba(245, 242, 238, 0.75)'}
                strokeWidth="1.5"
                strokeLinecap="round"
              />
              {/* Mesh Coordinate Nodes (Points) */}
              {[
                [80, 50], [60, 60], [100, 60], [45, 90], [115, 90],
                [60, 110], [100, 110], [80, 138], [80, 96]
              ].map(([px, py], idx) => (
                <circle
                  key={idx}
                  cx={px}
                  cy={py}
                  r="1.4"
                  fill={isWarning ? '#E8283C' : 'rgba(245, 242, 238, 0.55)'}
                />
              ))}
            </svg>

            {/* Wireframe Scanning Bar */}
            <div className={`emotion-mock__grid-scan ${isWarning ? 'emotion-mock__grid-scan--warn' : ''}`} />
          </div>

          {/* Right Column: Emotion Readout Meters */}
          <div className="emotion-mock__readout">
            <span className="emotion-mock__readout-header">LIVE VALENCE</span>

            {/* 4 Labelled Bars */}
            <div className="emotion-mock__bar-group">
              <div className="emotion-mock__bar-row">
                <span className="emotion-mock__bar-name">Neutral</span>
                <div className="emotion-mock__bar-track">
                  <div
                    className="emotion-mock__bar-fill"
                    style={{
                      width: state === 'neutral' ? '74%' : isWarning ? '22%' : '45%',
                    }}
                  />
                </div>
              </div>

              <div className="emotion-mock__bar-row">
                <span className="emotion-mock__bar-name">Joy</span>
                <div className="emotion-mock__bar-track">
                  <div
                    className="emotion-mock__bar-fill"
                    style={{
                      width: state === 'active' ? '82%' : isWarning ? '12%' : '48%',
                    }}
                  />
                </div>
              </div>

              <div className="emotion-mock__bar-row">
                <span className={`emotion-mock__bar-name ${isWarning ? 'emotion-mock__bar-name--warn' : ''}`}>
                  Stress
                </span>
                <div className="emotion-mock__bar-track">
                  <div
                    className={`emotion-mock__bar-fill ${isWarning ? 'emotion-mock__bar-fill--warn' : ''}`}
                    style={{
                      width: isWarning ? '88%' : state === 'active' ? '18%' : '26%',
                    }}
                  />
                </div>
              </div>

              <div className="emotion-mock__bar-row">
                <span className="emotion-mock__bar-name">Focus</span>
                <div className="emotion-mock__bar-track">
                  <div
                    className="emotion-mock__bar-fill"
                    style={{
                      width: isUplift ? '76%' : isWarning ? '30%' : '65%',
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Dynamic Event / Uplift Box */}
            <div className="emotion-mock__toast-area">
              {isWarning && (
                <div className="emotion-mock__alert-chip">
                  <span className="emotion-mock__alert-dot" />
                  <span>Low mood detected</span>
                </div>
              )}

              {isUplift && (
                <div className="emotion-mock__uplift-box">
                  <span className="emotion-mock__uplift-tag">UPLIFT ACTION</span>
                  <p className="emotion-mock__uplift-msg">
                    Take a breath. Here's something to lift your mood.
                  </p>
                </div>
              )}

              {!isWarning && !isUplift && (
                <div className="emotion-mock__idle-msg">
                  Tracking facial landmarks…
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      <p className="mock-caption">Illustrative preview</p>
    </div>
  )
}

