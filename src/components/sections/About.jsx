import React, { useRef, useEffect, useMemo } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useSmoothScroll } from '../../context/SmoothScrollContext'
import { useParticleStage } from '../canvas/ParticleStage'
import ScrollCue from '../common/ScrollCue'
import './About.css'

// Headline lines broken per reference:
// I'm an / AI-focused / developer and / data enthusiast
const HEADLINE_LINES = [
  [
    { text: "I\u2019m", muted: false },
    { text: 'an', muted: false },
  ],
  [{ text: 'AI-focused', muted: false }],
  [
    { text: 'developer', muted: false },
    { text: 'and', muted: true }, // Lighter grey in reference
  ],
  [
    { text: 'data', muted: false },
    { text: 'enthusiast', muted: false },
  ],
]

const HEADLINE_ARIA = "I'm an AI-focused developer and data enthusiast"

const PARAGRAPHS = [
  'Passionate about building intelligent applications and uncovering insights through data.',
  'I enjoy working at the intersection of AI, software development, and analytics; turning complex problems into practical solutions.',
  "From developing AI-powered products to exploring data and building for the web, I'm driven by curiosity, experimentation, and a desire to understand not just how things work, but how to make them work better.",
]

/**
 * Interpolates word colour from pale grey (#CFCFCB -> 207, 207, 203)
 * to full ink (#121212 -> 18, 18, 18) or muted grey (#72706B -> 114, 112, 107).
 */
function computeWordColor(fill, isMutedWord = false) {
  if (fill <= 0.001) return '#CFCFCB'
  const startR = 207
  const startG = 207
  const startB = 203

  const endR = isMutedWord ? 114 : 18
  const endG = isMutedWord ? 112 : 18
  const endB = isMutedWord ? 107 : 18

  if (fill >= 0.999) {
    return isMutedWord ? '#72706B' : '#121212'
  }

  const r = Math.round(startR + (endR - startR) * fill)
  const g = Math.round(startG + (endG - startG) * fill)
  const b = Math.round(startB + (endB - startB) * fill)
  return `rgb(${r},${g},${b})`
}

export default function About() {
  const sectionRef = useRef(null)
  const contentWrapRef = useRef(null)
  const eyebrowRef = useRef(null)
  const headlineRef = useRef(null)
  const paragraphsRef = useRef(null)
  const footerCueRef = useRef(null)

  const wordSpansRef = useRef([])
  const lastWordFillRef = useRef([])
  const activePoseRef = useRef('pose1')

  const {
    setActiveSection,
    setActiveSectionIndex,
    updateProgress,
  } = useSmoothScroll()
  const { stage } = useParticleStage()

  const splitParagraphs = useMemo(
    () => PARAGRAPHS.map((p) => p.split(' ')),
    []
  )

  useEffect(() => {
    const aboutEl = sectionRef.current
    const heroEl = document.getElementById('hero')
    const fillerEl = document.getElementById('filler')
    if (!aboutEl || !heroEl) return

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    // Collect all word spans in DOM order (Headline first, then P1, P2, P3)
    const wordNodes = Array.from(aboutEl.querySelectorAll('.about-word'))
    wordSpansRef.current = wordNodes.map((node) => ({
      el: node,
      isMuted: node.getAttribute('data-muted') === 'true',
    }))
    lastWordFillRef.current = new Float32Array(wordNodes.length).fill(-1)

    const applyWordFillProgress = (textProg) => {
      const words = wordSpansRef.current
      const totalWords = words.length
      if (totalWords === 0) return

      const softEdgeWidth = 3.0
      const cursor = textProg * (totalWords + softEdgeWidth)

      for (let i = 0; i < totalWords; i++) {
        const raw = (cursor - i) / softEdgeWidth
        const fill = raw <= 0 ? 0 : raw >= 1 ? 1 : raw
        if (Math.abs(fill - lastWordFillRef.current[i]) > 0.015) {
          lastWordFillRef.current[i] = fill
          words[i].el.style.color = computeWordColor(fill, words[i].isMuted)
        }
      }
    }

    if (prefersReducedMotion) {
      applyWordFillProgress(1)
    } else {
      applyWordFillProgress(0)
    }

    const triggers = []

    // =========================================================================
    // PART A: CONTINUOUS TRANSITION (Hero -> About)
    // Triggered on heroEl from 'top top' to 'bottom top' (~100vh of scroll).
    // Using heroEl as the trigger decouples it completely from aboutEl's pin-spacer,
    // eliminating trackpad scroll locking and hitching!
    // =========================================================================
    const heroIdentity = heroEl.querySelector('.hero-section__identity')
    const heroRole = heroEl.querySelector('.hero-section__role')
    const heroCue = heroEl.querySelector('.hero-section__scroll-wrap')
    const heroVignette = heroEl.querySelector('.hero-section__vignette')
    const aboutRevealTargets = [
      eyebrowRef.current,
      headlineRef.current,
      paragraphsRef.current,
      footerCueRef.current,
    ].filter(Boolean)

    if (!prefersReducedMotion) {
      gsap.set(aboutRevealTargets, { opacity: 0, y: 24 })
    }

    const transitionSt = ScrollTrigger.create({
      trigger: heroEl,
      start: 'top top',
      end: 'bottom top',
      scrub: 0.6,
      onEnterBack: () => {
        stage.setVisibility(1)
      },
      onLeaveBack: () => {
        setActiveSection('hero')
        setActiveSectionIndex('01')
        stage.setTheme(0)
        stage.setScatter(0)
        stage.setMorph('hero', 'pose1', 0)
        if (heroIdentity && heroRole) {
          heroIdentity.style.opacity = '1'
          heroIdentity.style.transform = 'translate3d(0, 0, 0)'
          heroRole.style.opacity = '1'
          heroRole.style.transform = 'translate3d(0, 0, 0)'
        }
        if (heroCue) heroCue.style.opacity = '1'
        if (heroVignette) heroVignette.style.opacity = '1'
      },
      onUpdate: (self) => {
        const p = self.progress // 0..1 as hero leaves and about arrives

        if (p >= 0.45) {
          setActiveSection('about')
          setActiveSectionIndex('01')
        } else {
          setActiveSection('hero')
        }

        // 1) 0-25%: Hero name and tagline fade and drift upward; scroll cue disappears
        const heroOutT = Math.min(1, p / 0.25)
        if (heroIdentity && heroRole) {
          const heroAlpha = 1 - heroOutT
          const heroY = -22 * heroOutT
          heroIdentity.style.opacity = String(heroAlpha)
          heroIdentity.style.transform = `translate3d(0, ${heroY}px, 0)`
          heroRole.style.opacity = String(heroAlpha)
          heroRole.style.transform = `translate3d(0, ${heroY}px, 0)`
        }
        if (heroCue) {
          heroCue.style.opacity = String(Math.max(0, 1 - p / 0.18))
        }

        // 2) 15-70%: Background & Navbar/Index interpolate from --bg-dark to --bg-paper
        const themeT = Math.max(0, Math.min(1, (p - 0.15) / 0.55))
        stage.setTheme(themeT)
        if (heroVignette) {
          heroVignette.style.opacity = String(1 - themeT)
        }

        // 3) Particle morph from hero to pose1 with peak scatter at midpoint
        const morphT = Math.max(0, Math.min(1, (p - 0.12) / 0.82))
        stage.setMorph('hero', 'pose1', morphT)
        const midArc = Math.sin(morphT * Math.PI)
        stage.setScatter(midArc * 0.6)

        // 4) 60-100%: About text elements fade and slide up into place
        if (!prefersReducedMotion) {
          aboutRevealTargets.forEach((el, idx) => {
            const staggerStart = 0.60 + idx * 0.05
            const span = 1.0 - staggerStart
            const localA = Math.max(0, Math.min(1, (p - staggerStart) / span))
            const easedA = 1 - Math.pow(1 - localA, 3)
            el.style.opacity = String(easedA)
            el.style.transform = `translate3d(0, ${(1 - easedA) * 24}px, 0)`
          })
        }
      },
    })
    triggers.push(transitionSt)

    // =========================================================================
    // PART C: PINNED, SCROLL-LINKED BEHAVIOUR (~380vh of scroll)
    // =========================================================================
    const pinnedSt = ScrollTrigger.create({
      trigger: aboutEl,
      start: 'top top',
      end: '+=380%',
      pin: true,
      pinSpacing: true,
      scrub: 0.5,
      onEnter: () => {
        setActiveSection('about')
        setActiveSectionIndex('01')
        stage.setVisibility(1)
        stage.setTheme(1)
        stage.setScatter(0)
        activePoseRef.current = 'pose1'
        stage.setScene('pose1', { duration: 0.8, stagger: 0.35, scatterBump: 0.05 })
      },
      onEnterBack: () => {
        setActiveSection('about')
        setActiveSectionIndex('01')
        stage.setVisibility(1)
        stage.setTheme(1)
        stage.setScatter(0)
        activePoseRef.current = 'pose3'
        stage.setScene('pose3', { duration: 0.9, stagger: 0.38, scatterBump: 0.15, force: true })
      },
      onUpdate: (self) => {
        const p = self.progress

        // 1) Section Index 01 segment fills in proportion to scroll progress
        updateProgress('about', p)

        // 2) Sequential Text Colour Progression (0% -> 88% of pinned scroll)
        if (!prefersReducedMotion) {
          const textProg = Math.max(0, Math.min(1, p / 0.88))
          applyWordFillProgress(textProg)
        }

        // 3) Pose Morphs tied to progress
        let desiredPose = 'pose1'
        if (p >= 0.70) {
          desiredPose = 'pose3'
        } else if (p >= 0.35) {
          desiredPose = 'pose2'
        }

        if (desiredPose !== activePoseRef.current) {
          activePoseRef.current = desiredPose
          stage.setScene(desiredPose, {
            duration: 1.15,
            stagger: 0.48,
            scatterBump: 0.25,
            force: true,
          })
        }
      },
    })
    triggers.push(pinnedSt)

    // =========================================================================
    // PART D: EXIT (About -> Dark Filler Section)
    // =========================================================================
    if (fillerEl) {
      const exitSt = ScrollTrigger.create({
        trigger: fillerEl,
        start: 'top bottom',
        end: 'top 15%',
        scrub: 0.6,
        onLeaveBack: () => {
          stage.setVisibility(1)
          stage.setTheme(1)
          stage.setScatter(0)
        },
        onUpdate: (self) => {
          const ep = self.progress
          stage.setScatter(ep * 0.72)
          stage.setVisibility(Math.max(0, 1 - ep * 1.1))
          stage.setTheme(1 - ep)
        },
      })
      triggers.push(exitSt)
    }

    return () => {
      triggers.forEach((t) => t.kill())
    }
  }, [
    stage,
    setActiveSection,
    setActiveSectionIndex,
    updateProgress,
    splitParagraphs,
  ])

  return (
    <section
      ref={sectionRef}
      id="about"
      data-theme="light"
      className="about-section"
      aria-label="01 About Me"
    >
      <div ref={contentWrapRef} className="about-section__container">
        {/* Left Column (~52% width, max-width 52ch for balanced editorial layout) */}
        <div className="about-section__left">
          {/* Eyebrow: "01   ABOUT ME" + thin rule */}
          <div ref={eyebrowRef} className="about-section__eyebrow">
            <span className="about-section__eyebrow-num">01</span>
            <span className="about-section__eyebrow-label">ABOUT ME</span>
            <span className="about-section__eyebrow-rule" aria-hidden="true" />
          </div>

          {/* Headline in Italic Serif */}
          <h2
            ref={headlineRef}
            className="about-section__headline"
            aria-label={HEADLINE_ARIA}
          >
            {HEADLINE_LINES.map((lineWords, lineIdx) => (
              <span key={lineIdx} className="about-section__headline-line" aria-hidden="true">
                {lineWords.map((wObj, wIdx) => (
                  <React.Fragment key={wIdx}>
                    <span
                      className="about-word about-word--headline"
                      data-muted={wObj.muted ? 'true' : 'false'}
                    >
                      {wObj.text}
                    </span>
                    {wIdx < lineWords.length - 1 && ' '}
                  </React.Fragment>
                ))}
              </span>
            ))}
          </h2>

          {/* Three Short Paragraphs: Stretched to 52ch, filling the empty gap */}
          <div ref={paragraphsRef} className="about-section__paragraphs">
            {PARAGRAPHS.map((fullText, pIdx) => (
              <p
                key={pIdx}
                className="about-section__paragraph"
                aria-label={fullText}
              >
                {splitParagraphs[pIdx].map((word, wIdx, arr) => (
                  <React.Fragment key={wIdx}>
                    <span
                      className="about-word about-word--body"
                      data-muted="false"
                      aria-hidden="true"
                    >
                      {word}
                    </span>
                    {wIdx < arr.length - 1 && ' '}
                  </React.Fragment>
                ))}
              </p>
            ))}
          </div>
        </div>

        {/* Right Half: Reserved visual stage for the particle figure (Shifted Right) */}
        <div className="about-section__right" aria-hidden="true" />

        {/* Bottom-Left: "SCROLL TO EXPLORE" with thin horizontal rules */}
        <div ref={footerCueRef} className="about-section__footer">
          <ScrollCue variant="left" persistOnScroll />
        </div>
      </div>
    </section>
  )
}
