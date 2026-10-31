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
 * Text Decode component: resolves characters from random glyphs to final text
 */
function DecodedText({ text, active, duration = 650, delay = 0, className = '' }) {
  const [displayText, setDisplayText] = useState(text)
  const [isResolved, setIsResolved] = useState(false)
  const isReduced = useRef(false)

  useEffect(() => {
    isReduced.current =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
  }, [])

  useEffect(() => {
    if (!active) return
    if (isReduced.current) {
      setDisplayText(text)
      setIsResolved(true)
      return
    }

    let start = null
    let animFrame = null
    const timer = setTimeout(() => {
      const step = (now) => {
        if (!start) start = now
        const elapsed = now - start
        const progress = Math.min(1, elapsed / duration)

        const totalChars = text.length
        const resolvedCount = Math.floor(progress * totalChars)

        let result = ''
        for (let i = 0; i < totalChars; i++) {
          const char = text[i]
          if (char === ' ') {
            result += ' '
          } else if (i < resolvedCount) {
            result += char
          } else {
            const randomGlyph =
              DECODE_GLYPHS[Math.floor(Math.random() * DECODE_GLYPHS.length)]
            result += randomGlyph
          }
        }

        setDisplayText(result)

        if (progress < 1) {
          animFrame = requestAnimationFrame(step)
        } else {
          setDisplayText(text)
          setIsResolved(true)
        }
      }
      animFrame = requestAnimationFrame(step)
    }, delay)

    return () => {
      clearTimeout(timer)
      if (animFrame) cancelAnimationFrame(animFrame)
    }
  }, [active, text, duration, delay])

  return (
    <span className={className} aria-label={text}>
      <span aria-hidden="true" className={isResolved ? 'decoded-resolved' : 'decoded-animating'}>
        {displayText}
      </span>
    </span>
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
  const gridRevealRef = useRef(null)
  const headerRef = useRef(null)
  const blocksRef = useRef([])

  const {
    setActiveTheme,
    setActiveSection,
    setActiveSectionIndex,
    updateProgress,
  } = useSmoothScroll()

  const [headerTriggered, setHeaderTriggered] = useState(false)
  const [blocksTriggered, setBlocksTriggered] = useState(false)
  const [spotlightedCat, setSpotlightedCat] = useState(null)
  const [statsCount, setStatsCount] = useState({ domains: 0, tools: 0 })
  const [isOffscreen, setIsOffscreen] = useState(false)

  // Cursor blueprint grid reveal with lerped follow (desktop pointer only)
  useEffect(() => {
    const sectionEl = sectionRef.current
    const revealEl = gridRevealRef.current
    if (!sectionEl || !revealEl) return

    const isPointerFine = window.matchMedia('(hover: hover) and (pointer: fine)').matches
    if (!isPointerFine) return

    let mouseX = 0
    let mouseY = 0
    let currentX = 0
    let currentY = 0
    let rafId = null
    let isMoving = false

    const onPointerMove = (e) => {
      const rect = sectionEl.getBoundingClientRect()
      mouseX = e.clientX - rect.left
      mouseY = e.clientY - rect.top

      if (!isMoving) {
        isMoving = true
        renderGrid()
      }
    }

    const onPointerLeave = () => {
      isMoving = false
      if (rafId) cancelAnimationFrame(rafId)
    }

    const renderGrid = () => {
      currentX += (mouseX - currentX) * 0.15
      currentY += (mouseY - currentY) * 0.15

      revealEl.style.setProperty('--mouse-x', `${currentX.toFixed(1)}px`)
      revealEl.style.setProperty('--mouse-y', `${currentY.toFixed(1)}px`)

      const dist = Math.hypot(mouseX - currentX, mouseY - currentY)
      if (isMoving || dist > 0.5) {
        rafId = requestAnimationFrame(renderGrid)
      } else {
        isMoving = false
      }
    }

    sectionEl.addEventListener('pointermove', onPointerMove, { passive: true })
    sectionEl.addEventListener('pointerleave', onPointerLeave, { passive: true })

    return () => {
      sectionEl.removeEventListener('pointermove', onPointerMove)
      sectionEl.removeEventListener('pointerleave', onPointerLeave)
      if (rafId) cancelAnimationFrame(rafId)
    }
  }, [])

  // Stats number count-up animation when heading enters viewport
  useEffect(() => {
    if (!headerTriggered) return
    const isReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (isReduced) {
      setStatsCount({
        domains: SKILLS_STATS.domainsCount,
        tools: SKILLS_STATS.toolsCount,
      })
      return
    }

    const duration = 750
    const start = performance.now()

    const step = (now) => {
      const progress = Math.min(1, (now - start) / duration)
      // Ease out cubic
      const ease = 1 - Math.pow(1 - progress, 3)

      setStatsCount({
        domains: Math.round(SKILLS_STATS.domainsCount * ease),
        tools: Math.round(SKILLS_STATS.toolsCount * ease),
      })

      if (progress < 1) {
        requestAnimationFrame(step)
      } else {
        setStatsCount({
          domains: SKILLS_STATS.domainsCount,
          tools: SKILLS_STATS.toolsCount,
        })
      }
    }

    requestAnimationFrame(step)
  }, [headerTriggered])

  // ScrollTrigger for Section Progress, Header Decode, and Category Blocks Entrance
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

    // 2. Heading entrance trigger (at ~85% viewport)
    const stHeader = ScrollTrigger.create({
      trigger: headerRef.current,
      start: 'top 85%',
      once: true,
      onEnter: () => {
        setHeaderTriggered(true)
      },
    })

    // 3. Category Grid Blocks entrance trigger (at ~80% viewport)
    const stGrid = ScrollTrigger.create({
      trigger: sectionEl.querySelector('.arsenal-grid'),
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

      {/* 1. Backdrop Vignette & Static Film Grain */}
      <div className="arsenal-section__vignette" aria-hidden="true" />
      <div className="arsenal-section__grain" aria-hidden="true" />

      {/* 2. Blueprint Grid: 1px lines every 64px (Base 4% + Interactive 14% Cursor Reveal) */}
      <div className="arsenal-grid--base" aria-hidden="true" />
      <div
        ref={gridRevealRef}
        className="arsenal-grid--reveal"
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
                duration={550}
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
                duration={700}
                delay={80}
              />
            </span>
            <span className="arsenal-header__title-arsenal">Arsenal</span>
          </h2>

          <div className="arsenal-header__underline" aria-hidden="true" />

          {/* Supporting Copy */}
          <p className="arsenal-header__subtitle">
            The tools, frameworks and languages I use to turn ideas into working products.
          </p>

          {/* Tracked Caps Dynamic Stats Line */}
          <div className="arsenal-header__stats" aria-label={SKILLS_STATS.headlineStats}>
            <span className="arsenal-header__stats-item">
              <span className="arsenal-header__stats-num">
                {String(statsCount.domains).padStart(2, '0')}
              </span>{' '}
              DOMAINS
            </span>
            <span className="arsenal-header__stats-dot" aria-hidden="true">
              ·
            </span>
            <span className="arsenal-header__stats-item">
              <span className="arsenal-header__stats-num">
                {String(statsCount.tools).padStart(2, '0')}
              </span>{' '}
              TOOLS
            </span>
          </div>
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
            {/* Fade masks at left and right edges */}
            <div className="arsenal-marquee__mask" />

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
          className={`arsenal-grid ${
            spotlightedCat ? 'arsenal-grid--has-spotlight' : ''
          }`}
        >
          {SKILL_CATEGORIES.map((cat, idx) => {
            const isLeftCol = idx % 2 === 0
            const colDelay = isLeftCol ? 0 : 90
            const isSpotlighted = spotlightedCat === cat.id

            return (
              <article
                key={cat.id}
                ref={(el) => (blocksRef.current[idx] = el)}
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
                        duration={450}
                        delay={colDelay + 60}
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
                    const chipDelay = colDelay + 140 + Math.min(chipIdx * 25, 450)
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
