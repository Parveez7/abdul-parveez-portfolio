import React, { useState, useEffect } from 'react'
import { gsap } from 'gsap'
import { useParticleStage } from './ParticleStage'
import './ParticleDebugPanel.css'

const SCENES = [
  { id: 'hero', label: 'Hero Portrait', defaultTheme: 0 },
  { id: 'pose1', label: 'Pose 01 (Laptop)', defaultTheme: 1 },
  { id: 'pose2', label: 'Pose 02 (Thinking)', defaultTheme: 1 },
  { id: 'pose3', label: 'Pose 03 (Tablet)', defaultTheme: 1 },
]

export default function ParticleDebugPanel() {
  const { stage, telemetry } = useParticleStage()
  const [visible, setVisible] = useState(true)
  const [activeScene, setActiveScene] = useState('hero')
  const [themeVal, setThemeVal] = useState(0)
  const [scatterVal, setScatterVal] = useState(0)

  // Allow toggling debug panel with 'D' key
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return
      if (e.key === 'd' || e.key === 'D') {
        setVisible((v) => !v)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  if (!visible) return null

  const handleSceneSelect = (sceneId) => {
    setActiveScene(sceneId)
    stage.setVisibility(1)
    stage.setScene(sceneId, { duration: 1.25, stagger: 0.55 })
  }

  const handleThemeChange = (e) => {
    const val = parseFloat(e.target.value)
    setThemeVal(val)
    stage.setTheme(val)
  }

  const handleScatterChange = (e) => {
    const val = parseFloat(e.target.value)
    setScatterVal(val)
    stage.setScatter(val)
  }

  const handleAnimateCrossover = () => {
    const targetTheme = themeVal < 0.5 ? 1 : 0
    const nextScene = targetTheme === 1 ? 'pose1' : 'hero'
    setActiveScene(nextScene)
    stage.setScene(nextScene, { duration: 1.35, stagger: 0.55 })

    const proxy = { t: themeVal }
    gsap.to(proxy, {
      t: targetTheme,
      duration: 1.15,
      ease: 'power2.inOut',
      onUpdate: () => {
        setThemeVal(Number(proxy.t.toFixed(2)))
        stage.setTheme(proxy.t)
      },
    })
  }

  return (
    <aside className="particle-debug" aria-label="Particle Stage Debug Panel">
      <div className="particle-debug__header">
        <span className="particle-debug__title">PARTICLE ENGINE DEBUG</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span className="particle-debug__badge">
            {telemetry.fps} FPS ({telemetry.frameMs}ms)
          </span>
          <button
            type="button"
            onClick={() => setVisible(false)}
            title="Hide Debug Panel (press D to toggle)"
            style={{
              color: 'rgba(245,242,238,0.6)',
              fontSize: '14px',
              lineHeight: 1,
              padding: '0 2px',
            }}
          >
            &times;
          </button>
        </div>
      </div>

      <div className="particle-debug__stats">
        <div>
          <span>Particles:</span>{' '}
          <strong>
            {telemetry.activeCount.toLocaleString()} / {telemetry.maxCount.toLocaleString()}
          </strong>
        </div>
        <div>
          <span>Target sample:</span> <strong>{telemetry.lastBuildMs}ms</strong>
        </div>
      </div>

      {/* Scene Switcher Buttons */}
      <div className="particle-debug__group">
        <span className="particle-debug__label">Scene Target</span>
        <div className="particle-debug__buttons">
          {SCENES.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => handleSceneSelect(s.id)}
              className={`particle-debug__btn ${
                activeScene === s.id ? 'particle-debug__btn--active' : ''
              }`}
            >
              {s.id}
            </button>
          ))}
        </div>
      </div>

      {/* Theme 0..1 Slider */}
      <div className="particle-debug__group">
        <div className="particle-debug__row">
          <label htmlFor="debug-theme-slider" className="particle-debug__label">
            Theme (0 Dark &rarr; 1 Paper)
          </label>
          <span className="particle-debug__val">{themeVal.toFixed(2)}</span>
        </div>
        <input
          id="debug-theme-slider"
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={themeVal}
          onChange={handleThemeChange}
          className="particle-debug__slider"
        />
      </div>

      {/* Scatter 0..1 Slider */}
      <div className="particle-debug__group">
        <div className="particle-debug__row">
          <label htmlFor="debug-scatter-slider" className="particle-debug__label">
            Scatter (0..1)
          </label>
          <span className="particle-debug__val">{scatterVal.toFixed(2)}</span>
        </div>
        <input
          id="debug-scatter-slider"
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={scatterVal}
          onChange={handleScatterChange}
          className="particle-debug__slider"
        />
      </div>

      {/* Smooth Transition Test Button */}
      <button
        type="button"
        onClick={handleAnimateCrossover}
        className="particle-debug__action"
      >
        Test Hero &harr; About Crossover
      </button>
    </aside>
  )
}
