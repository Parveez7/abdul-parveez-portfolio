import React, { createContext, useContext, useEffect, useRef, useState, useMemo } from 'react'
import { ParticleEngine } from './ParticleEngine'
import { useSmoothScroll } from '../../context/SmoothScrollContext'
import './ParticleStage.css'

const ParticleStageContext = createContext(null)

/**
 * Helper to interpolate between #0E0E10 (14,14,16) and #FAFAF8 (250,250,248)
 */
function computeThemeBgColor(t) {
  const r = Math.round(14 + (250 - 14) * t)
  const g = Math.round(14 + (250 - 14) * t)
  const b = Math.round(16 + (248 - 16) * t)
  return `rgb(${r}, ${g}, ${b})`
}

export function ParticleStageProvider({ children }) {
  const canvasRef = useRef(null)
  const engineRef = useRef(null)
  const [telemetry, setTelemetry] = useState({
    fps: 60,
    frameMs: '8.0',
    activeCount: 24000,
    maxCount: 24000,
    scene: 'hero',
    theme: 0,
    scatter: 0,
    lastBuildMs: '0.0',
  })

  const { setActiveTheme } = useSmoothScroll()

  // Public imperative API matching specification:
  // stage.setScene(name, opts), stage.setTheme(value), stage.setScatter(value), stage.setVisibility(0..1), stage.destroy()
  const stageApi = useMemo(
    () => ({
      setScene: (name, opts) => {
        engineRef.current?.setScene(name, opts)
      },
      setTheme: (value) => {
        const clamped = Math.max(0, Math.min(1, Number(value) || 0))
        engineRef.current?.setTheme(clamped)
        // Drive CSS variable for smooth background interpolation alongside particles
        document.documentElement.style.setProperty(
          '--stage-dynamic-bg',
          computeThemeBgColor(clamped)
        )
        setActiveTheme(clamped >= 0.5 ? 'light' : 'dark')
      },
      setScatter: (value) => {
        engineRef.current?.setScatter(value)
      },
      setVisibility: (value) => {
        engineRef.current?.setVisibility(value)
      },
      destroy: () => {
        engineRef.current?.destroy()
      },
      getEngine: () => engineRef.current,
    }),
    [setActiveTheme]
  )

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const engine = new ParticleEngine(canvas, {
      onTelemetry: (data) => {
        setTelemetry(data)
      },
    })
    engineRef.current = engine

    // Initialize default dark background variable
    document.documentElement.style.setProperty('--stage-dynamic-bg', '#0E0E10')

    // Expose on window for console/timeline inspection
    window.__particleStage = stageApi

    return () => {
      engine.destroy()
      engineRef.current = null
      delete window.__particleStage
    }
  }, [stageApi])

  return (
    <ParticleStageContext.Provider value={{ stage: stageApi, telemetry }}>
      <canvas
        ref={canvasRef}
        className="particle-stage-canvas"
        aria-hidden="true"
      />
      {children}
    </ParticleStageContext.Provider>
  )
}

export function useParticleStage() {
  const ctx = useContext(ParticleStageContext)
  if (!ctx) {
    throw new Error('useParticleStage must be used within a ParticleStageProvider')
  }
  return ctx
}
