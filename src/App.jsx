import React, { useState, useCallback } from 'react'
import { SmoothScrollProvider } from './context/SmoothScrollContext'
import { ParticleStageProvider } from './components/canvas/ParticleStage'
import { NavigationProvider, useNavigation } from './context/NavigationContext'
import ParticleDebugPanel from './components/canvas/ParticleDebugPanel'
import Navbar from './components/common/Navbar'
import SectionIndex from './components/common/SectionIndex'
import Loader from './components/common/Loader'
import Hero from './components/sections/Hero'
import About from './components/sections/About'
import Filler from './components/sections/Filler'
import Featured from './components/sections/Featured'
import Journey from './components/sections/Journey'
import Arsenal from './components/sections/Arsenal'
import Connect from './components/sections/Connect'
import ProjectsPage from './components/pages/ProjectsPage'
import ExperiencePage from './components/pages/ExperiencePage'
import ExchangePage from './components/pages/ExchangePage'

function PortfolioRoot() {
  const [isLoaded, setIsLoaded] = useState(() => {
    return typeof window !== 'undefined' && sessionStorage.getItem('portfolio_initial_loaded') === 'true'
  })
  const { currentPath } = useNavigation()
  const showDebug = typeof window !== 'undefined' && window.location.search.includes('debug')

  const handleLoaderComplete = useCallback(() => {
    setIsLoaded(true)
    try {
      sessionStorage.setItem('portfolio_initial_loaded', 'true')
    } catch {
      // ignore
    }
  }, [])

  // 1. Detail Page Route: /projects
  if (currentPath === '/projects' || currentPath.startsWith('/projects/')) {
    return (
      <>
        <Navbar />
        <ProjectsPage />
      </>
    )
  }

  // 2. Detail Page Route: /experience
  if (currentPath === '/experience' || currentPath.startsWith('/experience/')) {
    return (
      <>
        <Navbar />
        <ExperiencePage />
      </>
    )
  }

  // 3. Detail Page Route: /exchange
  if (currentPath === '/exchange' || currentPath.startsWith('/exchange/')) {
    return (
      <>
        <Navbar />
        <ExchangePage />
      </>
    )
  }

  // 4. Default: Homepage (Hero -> About -> Filler -> Arsenal -> Featured -> Journey -> Connect)
  return (
    <>
      {/* 1. Global Preloader (only on first initial site visit) */}
      {!isLoaded && <Loader onLoaded={handleLoaderComplete} />}

      {/* 2. Fixed Top Navbar (monogram in Hero, crossfades to full name on scroll) */}
      <Navbar />

      {/* 3. Fixed Left Section Index (01..06, hidden on Hero, Connect & mobile) */}
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

        {/* 03: Technical Arsenal (Precision Blueprint Spec Sheet & Logo Marquee) */}
        <Arsenal />

        {/* 04: Featured Work (Apple-style frosted glass cards: Projects, Experience, Exchange) */}
        <Featured />

        {/* 05: The Journey (3D Camera-on-a-Rail Matte Editorial Timeline) */}
        <Journey />

        {/* 06: Let's Connect (3D Orbiting Social Icons & Interactive Editorial Section) */}
        <Connect />
      </main>
    </>
  )
}

export default function App() {
  return (
    <NavigationProvider>
      <SmoothScrollProvider>
        <ParticleStageProvider>
          <PortfolioRoot />
        </ParticleStageProvider>
      </SmoothScrollProvider>
    </NavigationProvider>
  )
}
