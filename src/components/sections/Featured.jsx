import React, { useRef, useEffect, useState, useCallback } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useSmoothScroll } from '../../context/SmoothScrollContext'
import { useNavigation } from '../../context/NavigationContext'
import { FEATURED_DATA } from '../../data/featured'
import './Featured.css'

/**
 * Line-art SVG components for the visual area of each card.
 * Thin white strokes with low opacity and curated accent-red highlights.
 */
function ProjectsVisual() {
  return (
    <div className="visual-line-art visual-line-art--projects" aria-hidden="true">
      <svg viewBox="0 0 220 140" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Layer 3 (Bottom Card) */}
        <rect
          x="45"
          y="18"
          width="130"
          height="80"
          rx="10"
          stroke="rgba(245, 242, 238, 0.16)"
          strokeWidth="1.2"
          fill="rgba(255, 255, 255, 0.015)"
        />
        {/* Layer 2 (Middle Card) */}
        <rect
          x="32"
          y="32"
          width="136"
          height="82"
          rx="10"
          stroke="rgba(245, 242, 238, 0.28)"
          strokeWidth="1.2"
          fill="rgba(255, 255, 255, 0.025)"
        />
        {/* Layer 1 (Top Active Card with Accent Highlight) */}
        <rect
          x="18"
          y="46"
          width="142"
          height="84"
          rx="10"
          stroke="rgba(245, 242, 238, 0.55)"
          strokeWidth="1.4"
          fill="rgba(14, 14, 16, 0.65)"
        />
        {/* Top Card UI Details: Window Dots */}
        <circle cx="34" cy="62" r="3" fill="#E8283C" />
        <circle cx="44" cy="62" r="3" fill="rgba(245, 242, 238, 0.3)" />
        <circle cx="54" cy="62" r="3" fill="rgba(245, 242, 238, 0.3)" />
        {/* Minimal Code / UI Block Lines */}
        <line x1="34" y1="78" x2="88" y2="78" stroke="#E8283C" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="34" y1="90" x2="135" y2="90" stroke="rgba(245, 242, 238, 0.32)" strokeWidth="1.2" strokeLinecap="round" />
        <line x1="34" y1="102" x2="110" y2="102" stroke="rgba(245, 242, 238, 0.22)" strokeWidth="1.2" strokeLinecap="round" />
        <line x1="34" y1="114" x2="75" y2="114" stroke="rgba(245, 242, 238, 0.22)" strokeWidth="1.2" strokeLinecap="round" />
        {/* Floating AI Node badge */}
        <rect x="115" y="68" width="35" height="20" rx="5" stroke="rgba(232, 40, 60, 0.6)" strokeWidth="1" fill="rgba(232, 40, 60, 0.08)" />
        <circle cx="125" cy="78" r="2.5" fill="#E8283C" />
        <line x1="131" y1="78" x2="142" y2="78" stroke="#E8283C" strokeWidth="1" strokeLinecap="round" />
      </svg>
    </div>
  )
}

function ExperienceVisual() {
  return (
    <div className="visual-line-art visual-line-art--experience" aria-hidden="true">
      <svg viewBox="0 0 220 140" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Vertical Timeline Track */}
        <line x1="42" y1="20" x2="42" y2="120" stroke="rgba(245, 242, 238, 0.18)" strokeWidth="1.5" strokeDasharray="3 3" />
        {/* Point 1: Future / Modern */}
        <circle cx="42" cy="35" r="5" stroke="#E8283C" strokeWidth="1.8" fill="rgba(232, 40, 60, 0.2)" />
        <circle cx="42" cy="35" r="2" fill="#E8283C" />
        <line x1="58" y1="31" x2="120" y2="31" stroke="rgba(245, 242, 238, 0.65)" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="58" y1="40" x2="95" y2="40" stroke="#E8283C" strokeWidth="1.2" strokeLinecap="round" />
        {/* Point 2: Active Journey */}
        <circle cx="42" cy="70" r="4.5" stroke="rgba(245, 242, 238, 0.45)" strokeWidth="1.5" fill="rgba(14, 14, 16, 0.9)" />
        <circle cx="42" cy="70" r="1.5" fill="rgba(245, 242, 238, 0.8)" />
        <line x1="58" y1="66" x2="145" y2="66" stroke="rgba(245, 242, 238, 0.45)" strokeWidth="1.4" strokeLinecap="round" />
        <line x1="58" y1="75" x2="108" y2="75" stroke="rgba(245, 242, 238, 0.25)" strokeWidth="1.2" strokeLinecap="round" />
        {/* Point 3: Foundations */}
        <circle cx="42" cy="105" r="4" stroke="rgba(245, 242, 238, 0.25)" strokeWidth="1.5" fill="rgba(14, 14, 16, 0.9)" />
        <line x1="58" y1="101" x2="130" y2="101" stroke="rgba(245, 242, 238, 0.3)" strokeWidth="1.3" strokeLinecap="round" />
        <line x1="58" y1="110" x2="88" y2="110" stroke="rgba(245, 242, 238, 0.18)" strokeWidth="1.2" strokeLinecap="round" />
      </svg>
    </div>
  )
}

function ExchangeVisual() {
  return (
    <div className="visual-line-art visual-line-art--exchange" aria-hidden="true">
      <svg viewBox="0 0 220 140" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Horizon Baseline */}
        <line x1="20" y1="118" x2="200" y2="118" stroke="rgba(245, 242, 238, 0.22)" strokeWidth="1.2" />
        {/* Subtle Crescent Moon / Sun */}
        <circle cx="168" cy="38" r="9" stroke="#E8283C" strokeWidth="1.4" fill="rgba(232, 40, 60, 0.12)" />
        {/* Dubai Skyline: Burj Silhouette & Towers */}
        {/* Burj Khalifa Silhouette */}
        <path
          d="M108 118 L108 26 L110 14 L112 26 L112 118"
          stroke="rgba(245, 242, 238, 0.65)"
          strokeWidth="1.4"
          fill="rgba(255, 255, 255, 0.02)"
        />
        <line x1="110" y1="14" x2="110" y2="7" stroke="#E8283C" strokeWidth="1.5" />
        {/* Stepped tiers of Burj */}
        <line x1="104" y1="62" x2="116" y2="62" stroke="rgba(245, 242, 238, 0.45)" strokeWidth="1" />
        <line x1="101" y1="84" x2="119" y2="84" stroke="rgba(245, 242, 238, 0.35)" strokeWidth="1" />
        <line x1="97" y1="102" x2="123" y2="102" stroke="rgba(245, 242, 238, 0.25)" strokeWidth="1" />
        {/* Left Towers */}
        <rect x="52" y="74" width="22" height="44" rx="2" stroke="rgba(245, 242, 238, 0.3)" strokeWidth="1.2" fill="rgba(255, 255, 255, 0.015)" />
        <rect x="76" y="58" width="18" height="60" rx="2" stroke="rgba(245, 242, 238, 0.4)" strokeWidth="1.2" fill="rgba(255, 255, 255, 0.02)" />
        {/* Right Towers (Dubai Frame / Gate Style) */}
        <path d="M132 118 L132 68 L154 68 L154 118" stroke="rgba(245, 242, 238, 0.35)" strokeWidth="1.2" fill="none" />
        <line x1="132" y1="80" x2="154" y2="80" stroke="#E8283C" strokeWidth="1" />
        <rect x="160" y="82" width="20" height="36" rx="2" stroke="rgba(245, 242, 238, 0.24)" strokeWidth="1.2" fill="rgba(255, 255, 255, 0.01)" />
      </svg>
    </div>
  )
}

/**
 * Single Apple-style Frosted Glass Card with 3D Tilt, Radial Spotlight & Inner Parallax
 */
function FeaturedCard({ item, index, prefersReducedMotion }) {
  const cardRef = useRef(null)
  const visualRef = useRef(null)
  const rafRef = useRef(null)

  // Target and current lerped values for butter-smooth tilt & spotlight
  const mouseState = useRef({
    currentX: 0,
    currentY: 0,
    targetX: 0,
    targetY: 0,
    isHovering: false,
  })

  const updateCardTransform = useCallback(() => {
    if (!cardRef.current || prefersReducedMotion) return

    const ms = mouseState.current
    // Smooth lerp (factor: 0.12)
    ms.currentX += (ms.targetX - ms.currentX) * 0.12
    ms.currentY += (ms.targetY - ms.currentY) * 0.12

    if (ms.isHovering) {
      // Subtle 3D tilt: max ~3.8 degrees with slight lift
      const rotateX = -ms.currentY * 3.8
      const rotateY = ms.currentX * 3.8
      cardRef.current.style.transform = `perspective(1200px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) translate3d(0, -6px, 0) scale(1.015)`

      // Inner parallax: visual area moves in opposite direction
      if (visualRef.current) {
        visualRef.current.style.transform = `translate3d(${-ms.currentX * 6}px, ${-ms.currentY * 6}px, 0)`
      }
    } else {
      // Smooth decay back to zero
      cardRef.current.style.transform = `perspective(1200px) rotateX(0deg) rotateY(0deg) translate3d(0, 0px, 0) scale(1)`
      if (visualRef.current) {
        visualRef.current.style.transform = 'translate3d(0, 0, 0)'
      }
    }

    if (ms.isHovering || Math.abs(ms.currentX) > 0.005 || Math.abs(ms.currentY) > 0.005) {
      rafRef.current = requestAnimationFrame(updateCardTransform)
    }
  }, [prefersReducedMotion])

  const handleMouseMove = useCallback((e) => {
    if (prefersReducedMotion || !cardRef.current) return

    const rect = cardRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    // Update CSS custom properties for radial spotlight highlight
    cardRef.current.style.setProperty('--mx', `${x}px`)
    cardRef.current.style.setProperty('--my', `${y}px`)

    // Normalized coordinates (-1 .. +1)
    mouseState.current.targetX = (x / rect.width) * 2 - 1
    mouseState.current.targetY = (y / rect.height) * 2 - 1

    if (!mouseState.current.isHovering) {
      mouseState.current.isHovering = true
      cancelAnimationFrame(rafRef.current)
      rafRef.current = requestAnimationFrame(updateCardTransform)
    }
  }, [prefersReducedMotion, updateCardTransform])

  const handleMouseEnter = useCallback(() => {
    if (prefersReducedMotion) return
    mouseState.current.isHovering = true
    cancelAnimationFrame(rafRef.current)
    rafRef.current = requestAnimationFrame(updateCardTransform)
  }, [prefersReducedMotion, updateCardTransform])

  const handleMouseLeave = useCallback(() => {
    if (prefersReducedMotion) return
    mouseState.current.isHovering = false
    mouseState.current.targetX = 0
    mouseState.current.targetY = 0
    cancelAnimationFrame(rafRef.current)
    rafRef.current = requestAnimationFrame(updateCardTransform)
  }, [prefersReducedMotion, updateCardTransform])

  const { navigate } = useNavigation()

  // Click handler: records scroll state and navigates to detail collection page
  const handleClick = (e) => {
    e.preventDefault()
    try {
      sessionStorage.setItem('portfolio_pending_target', 'featured-work')
      sessionStorage.setItem('portfolio_return_section', 'featured')
      sessionStorage.setItem('portfolio_return_scroll', String(window.scrollY))
      sessionStorage.setItem('portfolio_active_card', item.id)
    } catch {
      // Ignore sessionStorage exceptions in private browsing
    }
    navigate(item.route)
  }

  // Render visual based on card ID
  const renderVisual = () => {
    if (item.id === 'projects') return <ProjectsVisual />
    if (item.id === 'experience') return <ExperienceVisual />
    if (item.id === 'exchange') return <ExchangeVisual />
    return null
  }

  return (
    <a
      ref={cardRef}
      href={item.route}
      onClick={handleClick}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`featured-card featured-card--${item.id}`}
      aria-label={`${item.eyebrow}: ${item.cta}`}
      data-index={index}
    >
      {/* 1. Dynamic Cursor Spotlight Layer */}
      <div className="featured-card__spotlight" aria-hidden="true" />

      {/* 2. Accent-Red Border Glow on Hover */}
      <div className="featured-card__border-glow" aria-hidden="true" />

      {/* 3. Top Row: Index + Eyebrow and Circular Arrow Button */}
      <div className="featured-card__top">
        <div className="featured-card__eyebrow-wrap">
          <span className="featured-card__index">{item.index}</span>
          <span className="featured-card__eyebrow">{item.eyebrow}</span>
        </div>
        <div className="featured-card__arrow-btn" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none">
            <line x1="7" y1="17" x2="17" y2="7" />
            <polyline points="7 7 17 7 17 17" />
          </svg>
        </div>
      </div>

      {/* 4. Text Content: Confident Title & Muted Description */}
      <div className="featured-card__content">
        <h3 className="featured-card__title">{item.title}</h3>
        <p className="featured-card__description">{item.description}</p>
      </div>

      {/* 5. Middle Visual Area (Line-art illustration with inner parallax) */}
      <div ref={visualRef} className="featured-card__visual">
        {renderVisual()}
      </div>

      {/* 6. Bottom Row: Optional Count (left) & CTA Link (right) */}
      <div className="featured-card__bottom">
        {item.count ? (
          <span className="featured-card__count">{item.count}</span>
        ) : (
          <span className="featured-card__count" aria-hidden="true" />
        )}
        <div className="featured-card__cta">
          <span>{item.cta}</span>
          <svg className="featured-card__cta-arrow" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <line x1="5" y1="12" x2="19" y2="12" />
            <polyline points="12 5 19 12 12 19" />
          </svg>
        </div>
      </div>
    </a>
  )
}

export default function Featured() {
  const sectionRef = useRef(null)
  const headerRef = useRef(null)
  const gridRef = useRef(null)

  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)
  const [isPaused, setIsPaused] = useState(false)

  const {
    setActiveTheme,
    setActiveSection,
    setActiveSectionIndex,
    updateProgress,
  } = useSmoothScroll()

  useEffect(() => {
    // Check reduced motion
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    setPrefersReducedMotion(mediaQuery.matches)

    const sectionEl = sectionRef.current
    if (!sectionEl) return

    const triggers = []

    // 0. Scroll Anchor for navigation
    const anchorSt = ScrollTrigger.create({
      id: 'featured-work',
      trigger: sectionEl,
      start: 'top top',
    })
    triggers.push(anchorSt)

    const projectsSt = ScrollTrigger.create({
      id: 'projects',
      trigger: sectionEl,
      start: 'top top',
    })
    triggers.push(projectsSt)

    // Handle returning to Featured Work from detail subpages (/projects, /experience, /exchange)
    let pendingTarget = null
    try {
      pendingTarget = sessionStorage.getItem('portfolio_pending_target')
    } catch {
      pendingTarget = null
    }

    if (pendingTarget === 'featured-work' || pendingTarget === 'projects') {
      try {
        sessionStorage.removeItem('portfolio_pending_target')
      } catch {
        // ignore
      }

      const executeFeaturedJump = (retries = 15) => {
        ScrollTrigger.refresh()
        const el = document.getElementById('projects') || sectionEl
        const rect = el.getBoundingClientRect()
        const currentTop = rect.top + window.scrollY
        const aboutSpacer = document.querySelector('.pin-spacer')

        // If About and Filler pin-spacers are not yet in place, retry next animation frame
        if ((!aboutSpacer || currentTop < 3800) && retries > 0) {
          requestAnimationFrame(() => executeFeaturedJump(retries - 1))
          return
        }

        if (window.__lenis) {
          window.__lenis.scrollTo(currentTop, { immediate: true })
        } else {
          window.scrollTo({ top: currentTop, behavior: 'instant' })
        }

        requestAnimationFrame(() => {
          ScrollTrigger.refresh()
        })
      }

      requestAnimationFrame(() => {
        executeFeaturedJump(15)
      })
    }

    // -------------------------------------------------------------------------
    // 1. Section Activation & Dark Navbar/Index (Index 03: Projects)
    // -------------------------------------------------------------------------
    const sectionSt = ScrollTrigger.create({
      trigger: sectionEl,
      start: 'top 55%',
      end: 'bottom 45%',
      onEnter: () => {
        setActiveSection('projects')
        setActiveSectionIndex('04')
        setActiveTheme('dark')
        setIsPaused(false)
      },
      onEnterBack: () => {
        setActiveSection('projects')
        setActiveSectionIndex('04')
        setActiveTheme('dark')
        setIsPaused(false)
      },
      onLeave: () => {
        setIsPaused(true)
      },
      onLeaveBack: () => {
        setIsPaused(true)
      },
      onUpdate: (self) => {
        updateProgress('projects', self.progress)
      },
    })
    triggers.push(sectionSt)

    // -------------------------------------------------------------------------
    // 2. Entrance Animation: Staggered Header & Cards Reveal
    // -------------------------------------------------------------------------
    if (!mediaQuery.matches) {
      const headerEl = headerRef.current
      const cardEls = gridRef.current?.querySelectorAll('.featured-card')

      if (headerEl) {
        gsap.fromTo(
          headerEl,
          { y: 28, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: 0.75,
            ease: 'power3.out',
            scrollTrigger: {
              trigger: sectionEl,
              start: 'top 82%',
              once: true,
            },
          }
        )
      }

      if (cardEls && cardEls.length > 0) {
        gsap.fromTo(
          cardEls,
          { y: 44, opacity: 0, scale: 0.98 },
          {
            y: 0,
            opacity: 1,
            scale: 1,
            duration: 0.85,
            stagger: 0.12, // 120ms apart
            ease: 'power3.out',
            scrollTrigger: {
              trigger: gridRef.current,
              start: 'top 86%',
              once: true,
            },
          }
        )

        // Desktop subtle scroll parallax: middle card sits ~16px higher
        if (window.innerWidth > 1024 && cardEls[1]) {
          gsap.to(cardEls[1], {
            y: -16,
            ease: 'none',
            scrollTrigger: {
              trigger: gridRef.current,
              start: 'top bottom',
              end: 'bottom top',
              scrub: true,
            },
          })
        }
      }
    }

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
      id="projects"
      data-theme="dark"
      className={`featured-section ${isPaused ? 'featured-section--paused' : ''}`}
      aria-label="04 Featured Work"
    >
      {/* 1. Ambient Background Layer: Drifting Blurred Color Orbs & Grain */}
      <div className="featured-section__ambient" aria-hidden="true">
        <div className="featured-orb featured-orb--accent" />
        <div className="featured-orb featured-orb--cool" />
        <div className="featured-orb featured-orb--warm" />
        <div className="featured-section__grain" />
      </div>

      <div className="featured-section__container">
        {/* 2. Header: Grotesk + Italic Serif Pairing */}
        <header ref={headerRef} className="featured-section__header">
          <div className="featured-section__eyebrow">
            <span className="featured-section__eyebrow-num">04</span>
            <span className="featured-section__eyebrow-label">FEATURED WORK</span>
            <span className="featured-section__eyebrow-rule" aria-hidden="true" />
          </div>
          <h2 className="featured-section__heading">
            <span className="featured-section__heading-featured">Featured</span>
            <span className="featured-section__heading-work">Work</span>
          </h2>
          <p className="featured-section__subtitle">
            Three ways to explore what I've built, done and learned.
          </p>
        </header>

        {/* 3. Three Apple-Style Frosted Glass Cards */}
        <div ref={gridRef} className="featured-section__grid">
          {FEATURED_DATA.map((item, idx) => (
            <FeaturedCard
              key={item.id}
              item={item}
              index={idx}
              prefersReducedMotion={prefersReducedMotion}
            />
          ))}
        </div>
      </div>
    </section>
  )
}
