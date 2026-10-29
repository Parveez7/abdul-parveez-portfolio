import React, { useRef, useEffect } from 'react'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { SmoothScrollProvider } from './context/SmoothScrollContext'
import { ParticleStageProvider, useParticleStage } from './components/canvas/ParticleStage'
import ParticleDebugPanel from './components/canvas/ParticleDebugPanel'
import Navbar from './components/common/Navbar'
import SectionIndex from './components/common/SectionIndex'
import ScrollCue from './components/common/ScrollCue'
import Loader from './components/common/Loader'
import { useSectionScrollTrigger } from './hooks/useSectionScrollTrigger'

/**
 * Clean Section Container Shell
 * Maintains theme attributes, 100svh minimum height, and ScrollTrigger binding
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

  // Connect Hero -> About -> Filler scroll transitions to the Particle Stage
  useEffect(() => {
    const heroEl = document.getElementById('hero')
    const aboutEl = document.getElementById('about')
    const fillerEl = document.getElementById('filler')
    if (!heroEl || !aboutEl) return

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
      {/* 1. Global Preloader */}
      <Loader />

      {/* 2. Fixed Top Navbar (theme-reactive, monogram crossfade) */}
      <Navbar />

      {/* 3. Fixed Left Section Index (01..05, desktop only) */}
      <SectionIndex />

      {/* 4. Temporary Debug Panel for verifying morphs & theme crossover */}
      <ParticleDebugPanel />

      {/* 5. Section Shells */}
      <main>
        {/* 01: Hero (Dark Theme) */}
        <SectionShell id="hero" theme="dark" index="01">
          <ScrollCue variant="centered" />
        </SectionShell>

        {/* 01 (Nav) / 01 (Index): About (Light Paper Theme) */}
        <SectionShell id="about" theme="light" index="01">
          <ScrollCue variant="left" />
        </SectionShell>

        {/* 02: Filler / Jack of all trades (Dark Theme) */}
        <SectionShell id="filler" theme="dark" index="02" />

        {/* 03: Featured Projects (Dark Theme) */}
        <SectionShell id="projects" theme="dark" index="03" />

        {/* 04: Experience & Achievements (Dark Theme) */}
        <SectionShell id="experience" theme="dark" index="04" />

        {/* 05: Contact & Footer (Dark Theme) */}
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
