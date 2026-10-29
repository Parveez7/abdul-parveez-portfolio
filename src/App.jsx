import React, { useRef } from 'react'
import { SmoothScrollProvider } from './context/SmoothScrollContext'
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
  return (
    <>
      {/* 1. Global Preloader */}
      <Loader />

      {/* 2. Fixed Top Navbar (theme-reactive, monogram crossfade) */}
      <Navbar />

      {/* 3. Fixed Left Section Index (01..05, desktop only) */}
      <SectionIndex />

      {/* 4. Section Shells (Foundational skeleton ready for component content) */}
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
      <PortfolioRoot />
    </SmoothScrollProvider>
  )
}
