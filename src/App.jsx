import React, { useRef, useState, useCallback } from 'react'
import { SmoothScrollProvider } from './context/SmoothScrollContext'
import { ParticleStageProvider } from './components/canvas/ParticleStage'
import ParticleDebugPanel from './components/canvas/ParticleDebugPanel'
import Navbar from './components/common/Navbar'
import SectionIndex from './components/common/SectionIndex'
import Loader from './components/common/Loader'
import Hero from './components/sections/Hero'
import About from './components/sections/About'
import Filler from './components/sections/Filler'
import Featured from './components/sections/Featured'
import Journey from './components/sections/Journey'
import { useSectionScrollTrigger } from './hooks/useSectionScrollTrigger'

/**
 * Clean Section Container Shell for upcoming sections
 */
function SectionShell({ id, theme, index, children }) {
  const sectionRef = useRef(null)
  useSectionScrollTrigger(sectionRef, { id, theme, index })

  return (
    <section
      ref={sectionRef}
      id={id}
      data-theme={theme}
      className="section-shell"
    >
      {children}
    </section>
  )
}

function PortfolioRoot() {
  const [isLoaded, setIsLoaded] = useState(false)
  const showDebug = typeof window !== 'undefined' && window.location.search.includes('debug')

  const handleLoaderComplete = useCallback(() => {
    setIsLoaded(true)
  }, [])

  return (
    <>
      {/* 1. Global Preloader (releases Hero entrance animation on completion) */}
      <Loader onLoaded={handleLoaderComplete} />

      {/* 2. Fixed Top Navbar (monogram in Hero, crossfades to full name on scroll) */}
      <Navbar />

      {/* 3. Fixed Left Section Index (01..05, hidden on Hero & mobile) */}
      <SectionIndex />

      {/* Optional Debug Panel (available via ?debug query parameter) */}
      {showDebug && <ParticleDebugPanel />}

      {/* 4. Main Content Sections */}
      <main>
        {/* Hero Section */}
        <Hero isLoaded={isLoaded} />

        {/* 01: About Section (Continuous Hero->About transition + Pinned 3-pose narrative) */}
        <About />

        {/* 02: Pinned Philosophy / Filler Section ("Jack of all trades...") */}
        <Filler />

        {/* 03: Featured Work (Apple-style frosted glass cards: Projects, Experience, Exchange) */}
        <Featured />

        {/* 04: The Journey (3D Camera-on-a-Rail Matte Editorial Timeline) */}
        <Journey />

        {/* 05: Contact Shell */}
        <SectionShell id="contact" theme="dark" index="05" />
      </main>
    </>
  )
}

export default function App() {
  return (
    <SmoothScrollProvider>
      <ParticleStageProvider>
        <PortfolioRoot />
      </ParticleStageProvider>
    </SmoothScrollProvider>
  )
}
