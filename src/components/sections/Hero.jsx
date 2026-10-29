import React, { useRef, useEffect } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { SITE } from '../../config/site'
import { useSmoothScroll } from '../../context/SmoothScrollContext'
import { useParticleStage } from '../canvas/ParticleStage'
import { useSectionScrollTrigger } from '../../hooks/useSectionScrollTrigger'
import ScrollCue from '../common/ScrollCue'
import './Hero.css'

export default function Hero({ isLoaded = false }) {
  const sectionRef = useRef(null)
  const leftBlockRef = useRef(null)
  const rightBlockRef = useRef(null)
  const cueWrapRef = useRef(null)

  const { updateProgress } = useSmoothScroll()
  const { stage } = useParticleStage()

  // Register section with global theme & section index ('01', dark)
  useSectionScrollTrigger(sectionRef, {
    id: 'hero',
    theme: 'dark',
    index: '01',
  })

  // Entrance animation after Loader finishes (Total < 3.0s)
  useEffect(() => {
    if (!isLoaded) return

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const navEl = document.querySelector('.navbar')

    if (prefersReducedMotion) {
      stage.playHeroEntrance({ duration: 0 })
      gsap.set([leftBlockRef.current, rightBlockRef.current, cueWrapRef.current], {
        opacity: 1,
        y: 0,
      })
      if (navEl) gsap.set(navEl, { opacity: 1 })
      return
    }

    // 1. Trigger top-down particle portrait assembly (~2.2s)
    stage.playHeroEntrance({ duration: 2.2 })

    // Set initial states for text, scroll cue, and navbar
    gsap.set([leftBlockRef.current, rightBlockRef.current], {
      opacity: 0,
      y: 12,
    })
    gsap.set(cueWrapRef.current, { opacity: 0 })
    if (navEl) gsap.set(navEl, { opacity: 0 })

    const tl = gsap.timeline()

    // 2. Name and tagline fade and slide in (12px, 700ms, staggered) at ~1.2s
    tl.to(
      leftBlockRef.current,
      {
        opacity: 1,
        y: 0,
        duration: 0.7,
        ease: 'power3.out',
      },
      1.2
    )
    tl.to(
      rightBlockRef.current,
      {
        opacity: 1,
        y: 0,
        duration: 0.7,
        ease: 'power3.out',
      },
      1.35
    )

    // 3. Scroll cue and nav fade in last (~1.85s -> 2.5s, total < 3s)
    tl.to(
      [cueWrapRef.current, navEl].filter(Boolean),
      {
        opacity: 1,
        duration: 0.65,
        ease: 'power2.out',
      },
      1.85
    )

    return () => {
      tl.kill()
    }
  }, [isLoaded, stage])

  // Define Hero's ScrollTrigger exposing 0..1 progress for the transition into About
  useEffect(() => {
    const el = sectionRef.current
    if (!el) return

    const st = ScrollTrigger.create({
      trigger: el,
      start: 'top top',
      end: 'bottom top',
      scrub: true,
      onUpdate: (self) => {
        // Expose 0..1 transition progress in the non-rerendering store for Prompt 4 (About transition)
        updateProgress('hero-transition', self.progress)
      },
    })

    return () => {
      st.kill()
    }
  }, [updateProgress])

  return (
    <section
      ref={sectionRef}
      id="hero"
      data-theme="dark"
      className="hero-section"
      aria-label={`${SITE.name} — ${SITE.tagline}`}
    >
      {/* Subtle radial center vignette behind the particle stage */}
      <div className="hero-section__vignette" aria-hidden="true" />

      <div className="hero-section__inner">
        {/* Left (Desktop) / Top (Mobile): Thin rule + Name */}
        <div ref={leftBlockRef} className="hero-section__identity">
          <span className="hero-section__rule hero-section__rule--left" aria-hidden="true" />
          <h1 className="hero-section__name">{SITE.name}</h1>
        </div>

        {/* Center spacer reserving clean breathing room for the particle portrait */}
        <div className="hero-section__portrait-zone" aria-hidden="true" />

        {/* Right (Desktop) / Bottom (Mobile): Tagline + Thin rule */}
        <div ref={rightBlockRef} className="hero-section__role">
          <p className="hero-section__tagline">{SITE.tagline}</p>
          <span className="hero-section__rule hero-section__rule--right" aria-hidden="true" />
        </div>
      </div>

      {/* Bottom Centre: Reusable Scroll Cue */}
      <div ref={cueWrapRef} className="hero-section__scroll-wrap">
        <ScrollCue variant="centered" />
      </div>
    </section>
  )
}

