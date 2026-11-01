import React, { createContext, useContext, useEffect, useRef, useState, useMemo } from 'react'
import { ParticleEngine } from './ParticleEngine'
import { useSmoothScroll } from '../../context/SmoothScrollContext'
import './ParticleStage.css'

const ParticleStageContext = createContext(null)

/**
 * Updates root CSS variables continuously for 0..1 theme progress
 * so background, Navbar, and SectionIndex interpolate in sync without hard breakpoints.
 */
function applyContinuousThemeVars(t) {
  const root = document.documentElement
  // Background: #0E0E10 (14,14,16) -> #FAFAF8 (250,250,248)
  const bgR = Math.round(14 + (250 - 14) * t)
  const bgG = Math.round(14 + (250 - 14) * t)
  const bgB = Math.round(16 + (248 - 16) * t)

  // Foreground (Navbar & Index text): #F5F2EE (245,242,238) -> #121212 (18,18,18)
  const fgR = Math.round(245 + (18 - 245) * t)
  const fgG = Math.round(242 + (18 - 242) * t)
  const fgB = Math.round(238 + (18 - 238) * t)

  root.style.setProperty('--stage-dynamic-bg', `rgb(${bgR}, ${bgG}, ${bgB})`)
  root.style.setProperty('--chrome-fg', `rgb(${fgR}, ${fgG}, ${fgB})`)
  root.style.setProperty('--chrome-muted', `rgba(${fgR}, ${fgG}, ${fgB}, 0.55)`)
  root.style.setProperty('--chrome-track', `rgba(${fgR}, ${fgG}, ${fgB}, 0.16)`)
  root.style.setProperty('--chrome-glass-bg', `rgba(${bgR}, ${bgG}, ${bgB}, 0.78)`)
  root.style.setProperty('--chrome-border', `rgba(${fgR}, ${fgG}, ${fgB}, 0.06)`)
}

export function ParticleStageProvider({ children }) {
  const canvasRef = useRef(null)
  const engineRef = useRef(null)
  const pendingEntranceRef = useRef(null)
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

  const stageApi = useMemo(
    () => ({
      playHeroEntrance: (opts) => {
        if (engineRef.current) {
          engineRef.current.playHeroEntrance(opts)
        } else {
          pendingEntranceRef.current = opts || {}
        }
      },
      setScene: (name, opts) => {
        engineRef.current?.setScene(name, opts)
      },
      setMorph: (fromName, toName, progress) => {
        engineRef.current?.setMorph(fromName, toName, progress)
      },
      setTheme: (value) => {
        const clamped = Math.max(0, Math.min(1, Number(value) || 0))
        engineRef.current?.setTheme(clamped)
        applyContinuousThemeVars(clamped)
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

    if (pendingEntranceRef.current) {
      engine.playHeroEntrance(pendingEntranceRef.current)
      pendingEntranceRef.current = null
    }

    applyContinuousThemeVars(0)
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
