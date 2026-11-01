import React, { useRef, useEffect, useMemo } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useSmoothScroll } from '../../context/SmoothScrollContext'
import { useParticleStage } from '../canvas/ParticleStage'
import { ABOUT_DATA } from '../../data/about'
import ScrollCue from '../common/ScrollCue'
import './About.css'

/**
 * Interpolates word colour:
 * 1) Unread: pale grey (#CFCFCB -> 207, 207, 203)
 * 2) Active reading cursor: turns vibrant RED (--accent #E8283C -> 232, 40, 60)
 * 3) Settled / read: full ink (#121212 -> 18, 18, 18) for emphasis phrases,
 *    or slightly softer ink (#5B5B57 -> 91, 91, 87) for connecting words.
 * Both final states strictly exceed WCAG AA contrast on the paper background.
 */
function computeWordColor(fill, isEmphasis = false) {
  if (fill <= 0.001) return '#CFCFCB'
  if (fill >= 0.999) return isEmphasis ? '#121212' : '#5B5B57'

  // Stage 1: Unread Grey -> Vibrant Red Cursor (0.0 -> 0.45)
  if (fill < 0.45) {
    const t = fill / 0.45
    const r = Math.round(207 + (232 - 207) * t)
    const g = Math.round(207 + (40 - 207) * t)
    const b = Math.round(203 + (60 - 203) * t)
    return `rgb(${r},${g},${b})`
  }

  // Peak Red Highlight (0.45 -> 0.55)
  if (fill <= 0.55) {
    return '#E8283C'
  }

  // Stage 2: Vibrant Red -> Settled Ink / Softer Ink (0.55 -> 1.0)
  const t = (fill - 0.55) / 0.45
  const endR = isEmphasis ? 18 : 91
  const endG = isEmphasis ? 18 : 91
  const endB = isEmphasis ? 18 : 87

  const r = Math.round(232 + (endR - 232) * t)
  const g = Math.round(40 + (endG - 40) * t)
  const b = Math.round(60 + (endB - 60) * t)
  return `rgb(${r},${g},${b})`
}

export default function About() {
  const sectionRef = useRef(null)
  const contentWrapRef = useRef(null)
  const eyebrowRef = useRef(null)
  const statementsWrapRef = useRef(null)
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

  // Format statements with global word indexing & emphasis markers
  const formattedStatements = useMemo(() => {
    let globalCounter = 0
    return ABOUT_DATA.statements.map((statementStr) => {
      const words = statementStr.split(' ').map((wordText) => {
        const currIdx = globalCounter++
        const isEmphasis = ABOUT_DATA.emphasisRanges.some(
          ([start, end]) => currIdx >= start && currIdx <= end
        )
        return {
          text: wordText,
          globalIndex: currIdx,
          isEmphasis,
        }
      })
      return { words }
    })
  }, [])

  useEffect(() => {
    const aboutEl = sectionRef.current
    const heroEl = document.getElementById('hero')
    const fillerEl = document.getElementById('filler')
    if (!aboutEl || !heroEl) return

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    // Collect all word spans in DOM order
    const wordNodes = Array.from(aboutEl.querySelectorAll('.about-word'))
    wordSpansRef.current = wordNodes.map((node) => ({
      el: node,
      isEmphasis: node.getAttribute('data-emphasis') === 'true',
    }))
    lastWordFillRef.current = new Float32Array(wordNodes.length).fill(-1)

    /**
     * Equal Reading Time Per Pose:
     * Pinned range is divided into 3 equal segments (130vh each, 390vh total).
     * Segment 0: Beat 1 (words 0..10)  -> Pose 1 (working-laptop)
     * Segment 1: Beat 2 (words 11..20) -> Pose 2 (thinking)
     * Segment 2: Beat 3 (words 21..28) -> Pose 3 (analyzing-tablet)
     *
     * Within each segment:
     * - 0-15%: Pose morphs in (skipped for beat 1 as pose 1 arrived during Hero transition)
     * - 15-75%: Beat words fill from grey to ink at constant pace with soft leading edge
     * - 75-100%: HOLD with text fully filled and pose settled
     */
    const applyWordFillProgress = (p) => {
      const words = wordSpansRef.current
      const totalWords = words.length
      if (totalWords === 0) return

      const fills = new Float32Array(totalWords)

      for (let bIdx = 0; bIdx < ABOUT_DATA.beats.length; bIdx++) {
        const [startIdx, endIdx] = ABOUT_DATA.beats[bIdx].wordRange
        const nWords = endIdx - startIdx + 1

        const segStart = bIdx / 3.0
        const segEnd = (bIdx + 1) / 3.0

        let bProg = 0.0
        if (p < segStart) {
          bProg = 0.0
        } else if (p >= segEnd) {
          bProg = 1.0
        } else {
          const pLocal = (p - segStart) * 3.0
          if (pLocal < 0.15) {
            bProg = 0.0
          } else if (pLocal > 0.75) {
            bProg = 1.0
          } else {
            bProg = (pLocal - 0.15) / 0.60
          }
        }

        const softEdgeWidth = 2.2
        const cursor = bProg * (nWords + softEdgeWidth)

        for (let j = 0; j < nWords; j++) {
          const raw = (cursor - j) / softEdgeWidth
          const val = raw <= 0 ? 0 : raw >= 1 ? 1 : raw
          fills[startIdx + j] = val
        }
      }

      for (let i = 0; i < totalWords; i++) {
        const fill = fills[i]
        if (Math.abs(fill - lastWordFillRef.current[i]) > 0.012) {
          lastWordFillRef.current[i] = fill
          words[i].el.style.color = computeWordColor(fill, words[i].isEmphasis)
        }
      }
    }

    if (prefersReducedMotion) {
      applyWordFillProgress(1.0)
    } else {
      applyWordFillProgress(0.0)
    }

    const triggers = []

    // =========================================================================
    // PART A: CONTINUOUS TRANSITION (Hero -> About)
    // Triggered on heroEl from 'top top' to 'bottom top' (~100vh of scroll).
    // Decoupled from aboutEl's pin-spacer to eliminate trackpad hitching.
    // =========================================================================
    const heroIdentity = heroEl.querySelector('.hero-section__identity')
    const heroRole = heroEl.querySelector('.hero-section__role')
    const heroCue = heroEl.querySelector('.hero-section__scroll-wrap')
    const heroVignette = heroEl.querySelector('.hero-section__vignette')
    const aboutRevealTargets = [
      eyebrowRef.current,
      statementsWrapRef.current,
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

        // 1) 0-25%: Hero name and tagline fade and drift upward; scroll cue fades out
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

        // 2) 15-70%: Background & Navbar/Index interpolate from dark to paper
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
    // PART B: PINNED, SCROLL-LINKED BEHAVIOUR (~390vh of scroll = 3x 130vh)
    // =========================================================================
    const pinnedSt = ScrollTrigger.create({
      id: 'about',
      trigger: aboutEl,
      start: 'top top',
      end: '+=390%',
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

        // 2) Sequential Text Colour Progression per beat with hold periods
        if (!prefersReducedMotion) {
          applyWordFillProgress(p)
        }

        // 3) Equal Reading Time Pose Transitions:
        // Morphs start at exactly 1/3 and 2/3 of pinned range
        let desiredPose = 'pose1'
        if (p >= 0.6667) {
          desiredPose = 'pose3'
        } else if (p >= 0.3333) {
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
    // PART C: EXIT (About -> Dark Filler Section)
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
        {/* Left Column (~52% width, max-width ~580px for balanced editorial layout) */}
        <div className="about-section__left">
          {/* Eyebrow: "01   ABOUT ME" + thin rule */}
          <div ref={eyebrowRef} className="about-section__eyebrow">
            <span className="about-section__eyebrow-num">{ABOUT_DATA.eyebrow.number}</span>
            <span className="about-section__eyebrow-label">{ABOUT_DATA.eyebrow.label}</span>
            <span className="about-section__eyebrow-rule" aria-hidden="true" />
          </div>

          {/* Unified Statement Paragraphs in Single Italic Serif Size */}
          <div ref={statementsWrapRef} className="about-section__statements">
            {formattedStatements.map((stmt, sIdx) => (
              <p
                key={sIdx}
                className="about-section__statement"
                aria-label={ABOUT_DATA.statements[sIdx]}
              >
                {stmt.words.map((wordObj) => (
                  <React.Fragment key={wordObj.globalIndex}>
                    <span
                      className={`about-word ${
                        wordObj.isEmphasis ? 'about-word--serif' : 'about-word--grotesk'
                      }`}
                      data-index={wordObj.globalIndex}
                      data-emphasis={wordObj.isEmphasis ? 'true' : 'false'}
                      aria-hidden="true"
                    >
                      {wordObj.text}
                    </span>
                    {' '}
                  </React.Fragment>
                ))}
              </p>
            ))}
          </div>
        </div>

        {/* Right Half: Reserved visual stage for the particle figure */}
        <div className="about-section__right" aria-hidden="true" />

        {/* Bottom-Left: "SCROLL TO EXPLORE" with thin horizontal rules */}
        <div ref={footerCueRef} className="about-section__footer">
          <ScrollCue variant="left" persistOnScroll />
        </div>
      </div>
    </section>
  )
}
