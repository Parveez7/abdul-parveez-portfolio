import React, { useRef, useEffect, useState, useMemo } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useSmoothScroll } from '../../context/SmoothScrollContext'
import { FILLER_DATA } from '../../data/filler'
import ScrollCue from '../common/ScrollCue'
import './Filler.css'

export default function Filler() {
  const {
    setActiveTheme,
    setActiveSection,
    setActiveSectionIndex,
    updateProgress,
  } = useSmoothScroll()

  const sectionRef = useRef(null)
  const line1Ref = useRef(null)
  const line2Ref = useRef(null)
  const phrasesContainerRef = useRef(null)
  const cueRef = useRef(null)

  const [activePhraseIndex, setActivePhraseIndex] = useState(0)
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)

  // Pre-split phrases into characters for performant DOM-level transformation
  const phraseCharacters = useMemo(() => {
    return FILLER_DATA.phrases.map((phrase) => {
      return phrase.split('').map((char, cIdx) => ({
        id: `${phrase}-${cIdx}`,
        char: char === ' ' ? '\u00A0' : char,
        isSpace: char === ' ',
      }))
    })
  }, [])

  useEffect(() => {
    // 1. Reduced motion check
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    setPrefersReducedMotion(mediaQuery.matches)
    if (mediaQuery.matches) {
      // For reduced motion, report section when scrolled into view
      const st = ScrollTrigger.create({
        trigger: sectionRef.current,
        start: 'top 50%',
        end: 'bottom 50%',
        onEnter: () => {
          setActiveSection('filler')
          setActiveSectionIndex('02')
          setActiveTheme('dark')
        },
        onEnterBack: () => {
          setActiveSection('filler')
          setActiveSectionIndex('02')
          setActiveTheme('dark')
        },
      })
      return () => st.kill()
    }

    const sectionEl = sectionRef.current
    if (!sectionEl) return

    const triggers = []

    // -------------------------------------------------------------------------
    // 1. Entrance Reveal (translateY 110% -> 0 for static white lines)
    // -------------------------------------------------------------------------
    const lineInners = [line1Ref.current, line2Ref.current].filter(Boolean)
    gsap.set(lineInners, { yPercent: 115, opacity: 0 })

    const phraseHolders = phrasesContainerRef.current?.querySelectorAll(
      '.filler-section__slot-holder'
    )
    if (phraseHolders && phraseHolders.length > 0) {
      // Hide all except first phrase initially
      phraseHolders.forEach((holder, idx) => {
        if (idx !== 0) {
          gsap.set(holder, { opacity: 0, yPercent: 110, pointerEvents: 'none' })
        } else {
          gsap.set(holder, { opacity: 1, yPercent: 0 })
        }
      })
    }

    let hasRevealed = false
    const entranceSt = ScrollTrigger.create({
      trigger: sectionEl,
      start: 'top 85%',
      once: true,
      onEnter: () => {
        if (hasRevealed) return
        hasRevealed = true

        // Quick mask-up animation: translateY 110% -> 0, ~700ms, stagger ~80ms
        gsap.to(lineInners, {
          yPercent: 0,
          opacity: 1,
          duration: 0.7,
          stagger: 0.08,
          ease: 'power3.out',
        })

        // First red phrase lands last with subtle character reveal
        const firstPhraseChars = phrasesContainerRef.current?.querySelectorAll(
          '.filler-section__slot-holder[data-index="0"] .filler-char'
        )
        if (firstPhraseChars && firstPhraseChars.length > 0) {
          gsap.fromTo(
            firstPhraseChars,
            { yPercent: 90, opacity: 0 },
            {
              yPercent: 0,
              opacity: 1,
              duration: 0.55,
              stagger: 0.012,
              delay: 0.18,
              ease: 'power2.out',
            }
          )
        }
      },
    })
    triggers.push(entranceSt)

    // -------------------------------------------------------------------------
    // 2. Continuous Scrubbed Pinning (~180vh total, ~36vh per phrase for quick response)
    // -------------------------------------------------------------------------
    const phraseCount = FILLER_DATA.phrases.length
    let lastActiveIdx = -1

    const pinnedSt = ScrollTrigger.create({
      trigger: sectionEl,
      start: 'top top',
      end: '+=180%', // Compact ~180vh of scroll for snappy, prompt phrase changes
      pin: true,
      pinSpacing: true,
      scrub: 0.35, // Direct, fluid follow with zero dragging
      onEnter: () => {
        setActiveSection('filler')
        setActiveSectionIndex('02')
        setActiveTheme('dark')
      },
      onEnterBack: () => {
        setActiveSection('filler')
        setActiveSectionIndex('02')
        setActiveTheme('dark')
      },
      onLeaveBack: () => {
        setActiveSection('about')
        setActiveSectionIndex('01')
        setActiveTheme('light')
      },
      onUpdate: (self) => {
        const p = self.progress // 0..1 across the 180vh scroll
        updateProgress('filler', p)

        // Ensure theme & navbar stay in dark mode while scrolling in Filler
        if (p > 0.01 && p < 0.99) {
          setActiveSection('filler')
          setActiveSectionIndex('02')
          setActiveTheme('dark')
        }

        // Active phrase calculation (0..4)
        const currentIdx = Math.max(
          0,
          Math.min(phraseCount - 1, Math.floor(p * phraseCount))
        )
        if (currentIdx !== lastActiveIdx) {
          lastActiveIdx = currentIdx
          setActivePhraseIndex(currentIdx)
        }

        // ScrollCue visibility: visible only during phrase 0, smooth fade out by p = 0.10
        if (cueRef.current) {
          const cueOpacity = Math.max(0, 1 - p / 0.10)
          cueRef.current.style.opacity = String(cueOpacity)
          cueRef.current.style.pointerEvents = cueOpacity > 0.1 ? 'auto' : 'none'
        }

        // ---------------------------------------------------------------------
        // Continuous, glitch-free phrase swapping with character stagger
        // ---------------------------------------------------------------------
        if (!phraseHolders || phraseHolders.length === 0) return

        for (let i = 0; i < phraseCount; i++) {
          const holder = phraseHolders[i]
          const chars = holder.querySelectorAll('.filler-char')

          // Fast, snappy timing windows per phrase (~36vh each)
          const enterStart = i === 0 ? -1 : (i - 1) * 0.20 + 0.13
          const enterEnd = i === 0 ? -1 : (i - 1) * 0.20 + 0.20
          const exitStart = i === phraseCount - 1 ? 2 : i * 0.20 + 0.12
          const exitEnd = i === phraseCount - 1 ? 2 : i * 0.20 + 0.18

          if (i === 0) {
            if (p <= exitStart) {
              // Resting in place
              holder.style.opacity = '1'
              holder.style.transform = 'translate3d(0, 0%, 0)'
              chars.forEach((c) => {
                c.style.transform = 'translate3d(0, 0%, 0)'
                c.style.opacity = '1'
              })
            } else if (p > exitStart && p < exitEnd) {
              // Outgoing slide-up + fade out
              const tOut = (p - exitStart) / (exitEnd - exitStart)
              const easedOut = tOut * tOut
              holder.style.opacity = String(Math.max(0, 1 - tOut * 1.3))
              holder.style.transform = `translate3d(0, ${-easedOut * 115}%, 0)`
            } else {
              // Completely gone above
              holder.style.opacity = '0'
              holder.style.transform = 'translate3d(0, -115%, 0)'
            }
          } else if (i === phraseCount - 1) {
            if (p < enterStart) {
              // Below mask
              holder.style.opacity = '0'
              holder.style.transform = 'translate3d(0, 115%, 0)'
            } else if (p >= enterStart && p < enterEnd) {
              // Incoming slide-up with character stagger
              const tIn = (p - enterStart) / (enterEnd - enterStart)
              const holderAlpha = Math.min(1, tIn * 1.5)
              holder.style.opacity = String(holderAlpha)
              holder.style.transform = 'translate3d(0, 0%, 0)'

              const numChars = chars.length
              chars.forEach((c, cIdx) => {
                const charDelay = (cIdx / Math.max(1, numChars)) * 0.32
                const localT = Math.max(0, Math.min(1, (tIn - charDelay) / 0.68))
                const charEase = 1 - Math.pow(1 - localT, 3)
                c.style.transform = `translate3d(0, ${(1 - charEase) * 105}%, 0)`
                c.style.opacity = String(charEase)
              })
            } else {
              // Resting in place for final phrase (0.85 -> 1.0)
              holder.style.opacity = '1'
              holder.style.transform = 'translate3d(0, 0%, 0)'
              chars.forEach((c) => {
                c.style.transform = 'translate3d(0, 0%, 0)'
                c.style.opacity = '1'
              })
            }
          } else {
            // Intermediate phrases (1, 2, 3)
            if (p < enterStart) {
              // Below mask
              holder.style.opacity = '0'
              holder.style.transform = 'translate3d(0, 115%, 0)'
            } else if (p >= enterStart && p < enterEnd) {
              // Incoming slide-up
              const tIn = (p - enterStart) / (enterEnd - enterStart)
              const holderAlpha = Math.min(1, tIn * 1.5)
              holder.style.opacity = String(holderAlpha)
              holder.style.transform = 'translate3d(0, 0%, 0)'

              const numChars = chars.length
              chars.forEach((c, cIdx) => {
                const charDelay = (cIdx / Math.max(1, numChars)) * 0.32
                const localT = Math.max(0, Math.min(1, (tIn - charDelay) / 0.68))
                const charEase = 1 - Math.pow(1 - localT, 3)
                c.style.transform = `translate3d(0, ${(1 - charEase) * 105}%, 0)`
                c.style.opacity = String(charEase)
              })
            } else if (p >= enterEnd && p <= exitStart) {
              // Resting
              holder.style.opacity = '1'
              holder.style.transform = 'translate3d(0, 0%, 0)'
              chars.forEach((c) => {
                c.style.transform = 'translate3d(0, 0%, 0)'
                c.style.opacity = '1'
              })
            } else if (p > exitStart && p < exitEnd) {
              // Outgoing slide-up + fade out
              const tOut = (p - exitStart) / (exitEnd - exitStart)
              const easedOut = tOut * tOut
              holder.style.opacity = String(Math.max(0, 1 - tOut * 1.3))
              holder.style.transform = `translate3d(0, ${-easedOut * 115}%, 0)`
            } else {
              // Past above
              holder.style.opacity = '0'
              holder.style.transform = 'translate3d(0, -115%, 0)'
            }
          }
        }
      },
    })
    triggers.push(pinnedSt)

    return () => {
      triggers.forEach((t) => t.kill())
    }
  }, [
    setActiveTheme,
    setActiveSection,
    setActiveSectionIndex,
    updateProgress,
  ])

  return (
    <section
      ref={sectionRef}
      id="filler"
      data-theme="dark"
      className="filler-section"
      aria-label="Philosophy"
    >
      {/* 1. Subtle Film Grain & Radial Vignette */}
      <div className="filler-section__grain" aria-hidden="true" />
      <div className="filler-section__vignette" aria-hidden="true" />

      {/* 2. Accessible Hidden Screen-Reader Transcript */}
      <div className="sr-only">
        <p>{FILLER_DATA.screenReaderSummary}</p>
        <ol>
          {FILLER_DATA.phrases.map((phrase, idx) => (
            <li key={idx}>{phrase}</li>
          ))}
        </ol>
      </div>

      {/* 3. Main Stage Content */}
      <div className="filler-section__stage">
        <div className="filler-section__content">
          {/* Static White Line 1: "JACK OF ALL TRADES," */}
          <div className="filler-section__line-mask">
            <span ref={line1Ref} className="filler-section__line-inner">
              {FILLER_DATA.staticLines[0]}
            </span>
          </div>

          {/* Static White Line 2: "MASTER OF" */}
          <div className="filler-section__line-mask">
            <span ref={line2Ref} className="filler-section__line-inner">
              {FILLER_DATA.staticLines[1]}
            </span>
          </div>

          {/* Slot Line: One Red Line Changing Through Five Phrases */}
          {!prefersReducedMotion ? (
            <div
              className="filler-section__slot-wrapper"
              aria-hidden="true"
            >
              <div
                ref={phrasesContainerRef}
                className="filler-section__slot-container"
              >
                {FILLER_DATA.phrases.map((phrase, pIdx) => (
                  <div
                    key={phrase}
                    data-index={pIdx}
                    className="filler-section__slot-holder"
                  >
                    <span className="filler-section__phrase">
                      {phraseCharacters[pIdx].map((item) => (
                        <span
                          key={item.id}
                          className={`filler-char ${
                            item.isSpace ? 'filler-char--space' : ''
                          }`}
                        >
                          {item.char}
                        </span>
                      ))}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            /* Reduced Motion: Unpinned Static Stack in Red */
            <div className="filler-section__reduced-stack">
              {FILLER_DATA.phrases.map((phrase) => (
                <div key={phrase} className="filler-section__reduced-item">
                  {phrase}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 4. Bottom Progress Indicator (5 ticks + counter) */}
      {!prefersReducedMotion && (
        <div className="filler-section__progress" aria-hidden="true">
          <div className="filler-section__ticks">
            {FILLER_DATA.phrases.map((_, tIdx) => (
              <span
                key={tIdx}
                className={`filler-section__tick ${
                  activePhraseIndex === tIdx ? 'filler-section__tick--active' : ''
                }`}
              />
            ))}
          </div>
          <span className="filler-section__counter">
            {String(activePhraseIndex + 1).padStart(2, '0')} / 05
          </span>
        </div>
      )}

      {/* 5. Scroll Cue (shown on first phrase, fades as user scrolls) */}
      {!prefersReducedMotion && (
        <div ref={cueRef} className="filler-section__cue">
          <ScrollCue
            variant="centered"
            persistOnScroll={true}
          />
        </div>
      )}
    </section>
  )
}

