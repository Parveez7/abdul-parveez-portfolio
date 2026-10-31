import React, { useRef, useEffect, useState, useMemo } from 'react'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useSmoothScroll } from '../../context/SmoothScrollContext'
import {
  SKILL_CATEGORIES,
  MARQUEE_TOOLS,
  SKILLS_STATS,
} from '../../data/skills'
import {
  siPython,
  siTypescript,
  siReact,
  siNextdotjs,
  siNodedotjs,
  siFastapi,
  siPostgresql,
  siSupabase,
  siRedis,
  siTailwindcss,
  siLangchain,
  siGit,
  siThreedotjs,
  siGsap,
  siPandas,
  siNumpy,
  siOpencv,
  siSelenium,
  siMysql,
  siApacheairflow,
  siTemporal,
  siGithub,
} from 'simple-icons'
import './Arsenal.css'

/**
 * Mapping of tool iconKey to simple-icons SVG path definition
 */
const ICON_MAP = {
  siPython,
  siTypescript,
  siReact,
  siNextdotjs,
  siNodedotjs,
  siFastapi,
  siPostgresql,
  siSupabase,
  siRedis,
  siTailwindcss,
  siLangchain,
  siGit,
  siThreedotjs,
  siGsap,
  siPandas,
  siNumpy,
  siOpencv,
  siSelenium,
  siMysql,
  siApacheairflow,
  siTemporal,
  siGithub,
}

const DECODE_GLYPHS = '0123456789ABCDEF!@#$<>{}[]_/'

/**
 * Ultra-performant Text Decode component:
 * Directly updates DOM textContent without causing React cascading re-renders!
 */
function DecodedText({ text, active, duration = 500, delay = 0, className = '' }) {
  const spanRef = useRef(null)
  const isReduced = useRef(false)

  useEffect(() => {
    isReduced.current =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
  }, [])

  useEffect(() => {
    const el = spanRef.current
    if (!el) return

    if (!active || isReduced.current) {
      el.textContent = text
      el.className = 'decoded-resolved'
      return
    }

    el.className = 'decoded-animating'
    const totalChars = text.length
    const steps = Math.min(14, Math.max(6, Math.floor(duration / 40)))
    const stepInterval = duration / steps
    let currentStep = 0

    const timer = setTimeout(() => {
      const intervalId = setInterval(() => {
        currentStep++
        const progress = currentStep / steps
        const resolvedCount = Math.floor(progress * totalChars)

        let result = ''
        for (let i = 0; i < totalChars; i++) {
          const char = text[i]
          if (char === ' ') {
            result += ' '
          } else if (i < resolvedCount) {
            result += char
          } else {
            result += DECODE_GLYPHS[Math.floor(Math.random() * DECODE_GLYPHS.length)]
          }
        }

        if (el) el.textContent = result

        if (currentStep >= steps) {
          clearInterval(intervalId)
          if (el) {
            el.textContent = text
            el.className = 'decoded-resolved'
          }
        }
      }, stepInterval)

      return () => clearInterval(intervalId)
    }, delay)

    return () => clearTimeout(timer)
  }, [active, text, duration, delay])

  return (
    <span className={className} aria-label={text}>
      <span ref={spanRef} aria-hidden="true" className="decoded-resolved">
        {text}
      </span>
    </span>
  )
}

/**
 * Isolated Stats Counter: Direct DOM update to prevent parent re-renders
 */
function StatsCounter({ active }) {
  const domainsRef = useRef(null)
  const toolsRef = useRef(null)

  useEffect(() => {
    if (!active) return
    const isReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    if (isReduced) {
      if (domainsRef.current) domainsRef.current.textContent = String(SKILLS_STATS.domainsCount).padStart(2, '0')
      if (toolsRef.current) toolsRef.current.textContent = String(SKILLS_STATS.toolsCount).padStart(2, '0')
      return
    }

    const duration = 650
    const start = performance.now()
    let rafId = null

    const step = (now) => {
      const progress = Math.min(1, (now - start) / duration)
      const ease = 1 - Math.pow(1 - progress, 3)

      const curDomains = Math.round(SKILLS_STATS.domainsCount * ease)
      const curTools = Math.round(SKILLS_STATS.toolsCount * ease)

      if (domainsRef.current) domainsRef.current.textContent = String(curDomains).padStart(2, '0')
      if (toolsRef.current) toolsRef.current.textContent = String(curTools).padStart(2, '0')

      if (progress < 1) {
        rafId = requestAnimationFrame(step)
      } else {
        if (domainsRef.current) domainsRef.current.textContent = String(SKILLS_STATS.domainsCount).padStart(2, '0')
        if (toolsRef.current) toolsRef.current.textContent = String(SKILLS_STATS.toolsCount).padStart(2, '0')
      }
    }

    rafId = requestAnimationFrame(step)
    return () => {
      if (rafId) cancelAnimationFrame(rafId)
    }
  }, [active])

  return (
    <div className="arsenal-header__stats" aria-label={SKILLS_STATS.headlineStats}>
      <span className="arsenal-header__stats-item">
        <span ref={domainsRef} className="arsenal-header__stats-num">
          00
        </span>{' '}
        DOMAINS
      </span>
      <span className="arsenal-header__stats-dot" aria-hidden="true">
        ·
      </span>
      <span className="arsenal-header__stats-item">
        <span ref={toolsRef} className="arsenal-header__stats-num">
          00
        </span>{' '}
        TOOLS
      </span>
    </div>
  )
}

/**
 * Single Marquee Mark Item
 */
function MarqueeMark({ tool }) {
  const icon = tool.iconKey ? ICON_MAP[tool.iconKey] : null

  return (
    <div className="arsenal-marquee__item" tabIndex={0} role="group" aria-label={tool.name}>
      {/* Tiny Red Accent Dot above hovered mark */}
      <span className="arsenal-marquee__dot" aria-hidden="true" />

      {/* Visual: SVG or Typographic Wordmark */}
      <div className="arsenal-marquee__visual">
        {icon ? (
          <svg
            viewBox="0 0 24 24"
            className="arsenal-marquee__svg"
            aria-hidden="true"
            fill="currentColor"
          >
            <path d={icon.path} />
          </svg>
        ) : (
          <span className="arsenal-marquee__wordmark" aria-hidden="true">
            {tool.wordmark || tool.name}
          </span>
        )}
      </div>

      {/* Tracked caps tool name on hover */}
      <span className="arsenal-marquee__label" aria-hidden="true">
        {tool.name}
      </span>
    </div>
  )
}

export default function Arsenal() {
  const sectionRef = useRef(null)
  const spotlightRef = useRef(null)
  const headerRef = useRef(null)
  const gridContainerRef = useRef(null)

  const {
    setActiveTheme,
    setActiveSection,
    setActiveSectionIndex,
    updateProgress,
  } = useSmoothScroll()

  const [headerTriggered, setHeaderTriggered] = useState(false)
  const [blocksTriggered, setBlocksTriggered] = useState(false)
  const [spotlightedCat, setSpotlightedCat] = useState(null)
  const [isOffscreen, setIsOffscreen] = useState(true)

  // Lightweight hardware-accelerated cursor spotlight (GPU transform translate3d, 0 mask re-rasterization!)
  useEffect(() => {
    const sectionEl = sectionRef.current
    const spotEl = spotlightRef.current
    if (!sectionEl || !spotEl) return

    const isPointerFine = window.matchMedia('(hover: hover) and (pointer: fine)').matches
    if (!isPointerFine) return

    let mouseX = -999
    let mouseY = -999
    let currentX = -999
    let currentY = -999
    let rafId = null
    let isMoving = false

    const onPointerMove = (e) => {
      const rect = sectionEl.getBoundingClientRect()
      mouseX = e.clientX - rect.left
      mouseY = e.clientY - rect.top

      if (!isMoving) {
        isMoving = true
        renderSpotlight()
      }
    }

    const onPointerLeave = () => {
      isMoving = false
      if (rafId) cancelAnimationFrame(rafId)
      if (spotEl) spotEl.style.opacity = '0'
    }

    const onPointerEnter = () => {
      if (spotEl) spotEl.style.opacity = '1'
    }

    const renderSpotlight = () => {
      if (currentX === -999) {
        currentX = mouseX
        currentY = mouseY
      } else {
        currentX += (mouseX - currentX) * 0.18
        currentY += (mouseY - currentY) * 0.18
      }

      spotEl.style.transform = `translate3d(${currentX.toFixed(1)}px, ${currentY.toFixed(1)}px, 0) translate(-50%, -50%)`

      const dist = Math.hypot(mouseX - currentX, mouseY - currentY)
      if (isMoving || dist > 0.5) {
        rafId = requestAnimationFrame(renderSpotlight)
      } else {
        isMoving = false
      }
    }

    sectionEl.addEventListener('pointerenter', onPointerEnter, { passive: true })
    sectionEl.addEventListener('pointermove', onPointerMove, { passive: true })
    sectionEl.addEventListener('pointerleave', onPointerLeave, { passive: true })

    return () => {
      sectionEl.removeEventListener('pointerenter', onPointerEnter)
      sectionEl.removeEventListener('pointermove', onPointerMove)
      sectionEl.removeEventListener('pointerleave', onPointerLeave)
      if (rafId) cancelAnimationFrame(rafId)
    }
  }, [])

  // ScrollTrigger for Section Navigation and Entrance Transitions
  useEffect(() => {
    const sectionEl = sectionRef.current
    if (!sectionEl) return

    // 1. Section navigation and active index tracking
    const stSection = ScrollTrigger.create({
      trigger: sectionEl,
      start: 'top 55%',
      end: 'bottom 45%',
      onEnter: () => {
        setIsOffscreen(false)
        setActiveSection('skills')
        setActiveSectionIndex('05')
        setActiveTheme('dark')
      },
      onEnterBack: () => {
        setIsOffscreen(false)
        setActiveSection('skills')
        setActiveSectionIndex('05')
        setActiveTheme('dark')
      },
      onLeave: () => {
        setIsOffscreen(true)
      },
      onLeaveBack: () => {
        setIsOffscreen(true)
      },
      onUpdate: (self) => {
        updateProgress('skills', self.progress)
      },
    })

    // 2. Heading entrance trigger
    const stHeader = ScrollTrigger.create({
      trigger: headerRef.current,
      start: 'top 85%',
      once: true,
      onEnter: () => {
        setHeaderTriggered(true)
      },
    })

    // 3. Category Grid Blocks entrance trigger
    const stGrid = ScrollTrigger.create({
      trigger: gridContainerRef.current,
      start: 'top 82%',
      once: true,
      onEnter: () => {
        setBlocksTriggered(true)
      },
    })

    return () => {
      stSection.kill()
      stHeader.kill()
      stGrid.kill()
    }
  }, [
    setActiveSection,
    setActiveSectionIndex,
    setActiveTheme,
    updateProgress,
  ])

  // All marquee tool names flattened for the visually-hidden screen reader list
  const screenReaderTools = useMemo(() => {
    return MARQUEE_TOOLS.flat().map((t) => t.name)
  }, [])

  return (
    <section
      ref={sectionRef}
      id="skills"
      data-theme="dark"
      className={`arsenal-section ${isOffscreen ? 'arsenal-section--offscreen' : ''}`}
      aria-label="05 Technical Arsenal"
    >
      {/* Anchor alias so #arsenal or #technical-arsenal links resolve here */}
      <span id="arsenal" className="arsenal-section__anchor" aria-hidden="true" />
      <span id="technical-arsenal" className="arsenal-section__anchor" aria-hidden="true" />

      {/* 1. Backdrop Vignette & Static Film Grain (Normal Blend Mode = 0 GPU Overload) */}
      <div className="arsenal-section__vignette" aria-hidden="true" />
      <div className="arsenal-section__grain" aria-hidden="true" />

      {/* 2. Precision Blueprint Grid & Hardware-Accelerated Cursor Spotlight */}
      <div className="arsenal-grid--base" aria-hidden="true" />
      <div
        ref={spotlightRef}
        className="arsenal-grid__spotlight"
        aria-hidden="true"
      />

      <div className="arsenal-section__container">
        {/* 3. Centered Editorial Heading */}
        <header ref={headerRef} className="arsenal-header">
          {/* Eyebrow flanked by thin hairlines */}
          <div className="arsenal-header__eyebrow-wrap">
            <span className="arsenal-header__rule" aria-hidden="true" />
            <span className="arsenal-header__eyebrow">
              <DecodedText
                text="05   TECHNICAL ARSENAL"
                active={headerTriggered}
                duration={450}
              />
            </span>
            <span className="arsenal-header__rule" aria-hidden="true" />
          </div>

          {/* Title on two lines with short red underline */}
          <h2 className="arsenal-header__title">
            <span className="arsenal-header__title-technical">
              <DecodedText
                text="TECHNICAL"
                active={headerTriggered}
                duration={550}
                delay={60}
              />
            </span>
            <span className="arsenal-header__title-arsenal">Arsenal</span>
          </h2>

          <div className="arsenal-header__underline" aria-hidden="true" />

          {/* Supporting Copy */}
          <p className="arsenal-header__subtitle">
            The tools, frameworks and languages I use to turn ideas into working products.
          </p>

          {/* Dynamic Stats Line (Isolated from Parent Render Loop) */}
          <StatsCounter active={headerTriggered} />
        </header>

        {/* 4. Two-Row Seamless Monochrome Logo Marquee */}
        <div className="arsenal-marquee-wrap" aria-label="Tool Marquee">
          {/* Visually hidden semantic tool list for accessibility */}
          <ul className="sr-only">
            {screenReaderTools.map((tool) => (
              <li key={tool}>{tool}</li>
            ))}
          </ul>

          <div className="arsenal-marquee" aria-hidden="true">
            {/* Row 1: Leftward Scrolling (~70s) */}
            <div className="arsenal-marquee__row arsenal-marquee__row--top">
              <div className="arsenal-marquee__track arsenal-marquee__track--left">
                {[...MARQUEE_TOOLS[0], ...MARQUEE_TOOLS[0]].map((tool, idx) => (
                  <MarqueeMark key={`row1-${tool.name}-${idx}`} tool={tool} />
                ))}
              </div>
            </div>

            {/* Row 2: Rightward Scrolling (~90s, slightly smaller & dimmer) */}
            <div className="arsenal-marquee__row arsenal-marquee__row--bottom">
              <div className="arsenal-marquee__track arsenal-marquee__track--right">
                {[...MARQUEE_TOOLS[1], ...MARQUEE_TOOLS[1]].map((tool, idx) => (
                  <MarqueeMark key={`row2-${tool.name}-${idx}`} tool={tool} />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* 5. Categorized "Spec Sheet" Grid (2 cols x 3 rows on Desktop, 1 col Mobile) */}
        <div
          ref={gridContainerRef}
          className={`arsenal-grid ${
            spotlightedCat ? 'arsenal-grid--has-spotlight' : ''
          }`}
        >
          {SKILL_CATEGORIES.map((cat, idx) => {
            const isLeftCol = idx % 2 === 0
            const colDelay = isLeftCol ? 0 : 80
            const isSpotlighted = spotlightedCat === cat.id

            return (
              <article
                key={cat.id}
                tabIndex={0}
                onMouseEnter={() => setSpotlightedCat(cat.id)}
                onMouseLeave={() => setSpotlightedCat(null)}
                onFocus={() => setSpotlightedCat(cat.id)}
                onBlur={() => setSpotlightedCat(null)}
                className={`spec-block ${
                  isSpotlighted ? 'spec-block--spotlight' : ''
                } ${blocksTriggered ? 'spec-block--entered' : ''}`}
                style={{
                  '--col-delay': `${colDelay}ms`,
                }}
              >
                {/* 1px Animated Top Hairline */}
                <div
                  className="spec-block__hairline"
                  style={{
                    transitionDelay: `${colDelay}ms`,
                  }}
                  aria-hidden="true"
                />

                {/* Corner Hairline L-Ticks (Top-Left & Bottom-Right) */}
                <span className="spec-block__tick spec-block__tick--tl" aria-hidden="true" />
                <span className="spec-block__tick spec-block__tick--br" aria-hidden="true" />

                {/* Category Header: "01 — TITLE" + Tabular Item Count */}
                <header className="spec-block__header">
                  <div className="spec-block__eyebrow">
                    <span className="spec-block__index">{cat.index}</span>
                    <span className="spec-block__dash" aria-hidden="true" />
                    <h3 className="spec-block__title">
                      <DecodedText
                        text={cat.title.toUpperCase()}
                        active={blocksTriggered}
                        duration={380}
                        delay={colDelay + 40}
                      />
                    </h3>
                  </div>
                  <span className="spec-block__count" aria-label={`${cat.items.length} items`}>
                    {String(cat.items.length).padStart(2, '0')}
                  </span>
                </header>

                {/* Skill Chips: Solid Matte #131316, 1px Border, 6px Radius, Leading Dot */}
                <ul className="spec-block__chips" aria-label={`${cat.title} skills`}>
                  {cat.items.map((skill, chipIdx) => {
                    const chipDelay = colDelay + 100 + Math.min(chipIdx * 20, 360)
                    return (
                      <li
                        key={skill}
                        className="spec-chip"
                        style={{
                          '--chip-delay': `${chipDelay}ms`,
                        }}
                      >
                        <span className="spec-chip__dot" aria-hidden="true" />
                        <span className="spec-chip__text">{skill}</span>
                      </li>
                    )
                  })}
                </ul>
              </article>
            )
          })}
        </div>
      </div>
    </section>
  )
}
