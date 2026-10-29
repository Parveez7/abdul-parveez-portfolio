import React, { useRef, useState, useEffect, useCallback } from 'react'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { SmoothScrollProvider } from './context/SmoothScrollContext'
import { ParticleStageProvider, useParticleStage } from './components/canvas/ParticleStage'
import ParticleDebugPanel from './components/canvas/ParticleDebugPanel'
import Navbar from './components/common/Navbar'
import SectionIndex from './components/common/SectionIndex'
import ScrollCue from './components/common/ScrollCue'
import Loader from './components/common/Loader'
import Hero from './components/sections/Hero'
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
  const { stage } = useParticleStage()
  const [isLoaded, setIsLoaded] = useState(false)
  const showDebug = typeof window !== 'undefined' && window.location.search.includes('debug')

  const handleLoaderComplete = useCallback(() => {
    setIsLoaded(true)
  }, [])

  // Connect Hero -> About -> Filler scroll transitions to the Particle Stage
  useEffect(() => {
    const aboutEl = document.getElementById('about')
    const fillerEl = document.getElementById('filler')
    if (!aboutEl) return

    const triggers = []

    // Transition from Hero (dark, theme 0, scene 'hero') into About (paper, theme 1, scene 'pose1')
    triggers.push(
      ScrollTrigger.create({
        trigger: aboutEl,
        start: 'top 85%',
        end: 'top 20%',
        scrub: true,
        onEnter: () => {
          stage.setVisibility(1)
          stage.setScene('pose1', { duration: 1.25, stagger: 0.55 })
        },
        onLeaveBack: () => {
          stage.setVisibility(1)
          stage.setScene('hero', { duration: 1.25, stagger: 0.55 })
        },
        onUpdate: (self) => {
          stage.setTheme(self.progress)
        },
      })
    )

    // Fade out particle stage when entering Filler section below About
    if (fillerEl) {
      triggers.push(
        ScrollTrigger.create({
          trigger: fillerEl,
          start: 'top 85%',
          end: 'top 30%',
          scrub: true,
          onUpdate: (self) => {
            stage.setVisibility(1 - self.progress)
            stage.setTheme(1 - self.progress)
          },
        })
      )
    }

    return () => {
      triggers.forEach((t) => t.kill())
    }
  }, [stage])

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

        {/* 01: About Shell (built in Prompt 4) */}
        <SectionShell id="about" theme="light" index="01">
          <ScrollCue variant="left" />
        </SectionShell>

        {/* 02: Filler Shell */}
        <SectionShell id="filler" theme="dark" index="02" />

        {/* 03: Projects Shell */}
        <SectionShell id="projects" theme="dark" index="03" />

        {/* 04: Experience & Achievements Shell */}
        <SectionShell id="experience" theme="dark" index="04" />

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
