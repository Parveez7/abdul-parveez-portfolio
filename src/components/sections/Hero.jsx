import React, { useRef, useEffect, useState, useCallback } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { SITE } from '../../config/site'
import { useSmoothScroll } from '../../context/SmoothScrollContext'
import { useParticleStage } from '../canvas/ParticleStage'
import { useSectionScrollTrigger } from '../../hooks/useSectionScrollTrigger'
import ScrollCue from '../common/ScrollCue'
import './Hero.css'

function copyTextFallback(text) {
  try {
    const textarea = document.createElement('textarea')
    textarea.value = text
    textarea.setAttribute('readonly', '')
    textarea.style.position = 'fixed'
    textarea.style.top = '-9999px'
    textarea.style.left = '-9999px'
    textarea.style.opacity = '0'
    document.body.appendChild(textarea)
    textarea.select()
    const successful = document.execCommand('copy')
    document.body.removeChild(textarea)
    return successful
  } catch {
    return false
  }
}

export default function Hero({ isLoaded = false }) {
  const sectionRef = useRef(null)
  const leftBlockRef = useRef(null)
  const rightBlockRef = useRef(null)
  const cueWrapRef = useRef(null)
  const cursorHintRef = useRef(null)
  const ripplesContainerRef = useRef(null)

  const { updateProgress } = useSmoothScroll()
  const { stage } = useParticleStage()

  // Copy Feedback State
  const [copyStatus, setCopyStatus] = useState('idle') // 'idle' | 'copied' | 'failed'
  const [showToast, setShowToast] = useState(false)
  const [srAnnouncement, setSrAnnouncement] = useState('')

  // Cursor Tracking Refs (no React re-renders per frame)
  const pointerPosRef = useRef({ x: -999, y: -999 })
  const hintPosRef = useRef({ x: -999, y: -999 })
  const isInsideHeroRef = useRef(false)
  const isOverInteractiveRef = useRef(false)
  const stillnessTimerRef = useRef(null)
  const rafIdRef = useRef(null)
  const pointerDownPosRef = useRef({ x: 0, y: 0, time: 0 })

  // Register section with global theme & section index ('01', dark)
  useSectionScrollTrigger(sectionRef, {
    id: 'hero',
    theme: 'dark',
    index: '01',
  })

  // Copy Execution Handler
  const executeCopy = useCallback(async (isTouch = false) => {
    let succeeded = false
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(SITE.email)
        succeeded = true
      } else {
        succeeded = copyTextFallback(SITE.email)
      }
    } catch {
      succeeded = copyTextFallback(SITE.email)
    }

    if (succeeded) {
      setCopyStatus('copied')
      setSrAnnouncement(`Email address ${SITE.email} copied to clipboard`)
      if (isTouch) {
        setShowToast(true)
        setTimeout(() => setShowToast(false), 2000)
      }
      setTimeout(() => {
        setCopyStatus('idle')
      }, 1800)
    } else {
      setCopyStatus('failed')
      setSrAnnouncement("Couldn't copy email address. Tap to open mail.")
      setTimeout(() => {
        setCopyStatus('idle')
      }, 3000)
    }
    return succeeded
  }, [])

  // Trigger ripple ring animation from click coordinates
  const triggerRipple = useCallback((clientX, clientY) => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (prefersReducedMotion || !sectionRef.current || !ripplesContainerRef.current) return

    const rect = sectionRef.current.getBoundingClientRect()
    const x = clientX - rect.left
    const y = clientY - rect.top

    const ripple = document.createElement('div')
    ripple.className = 'hero-ripple'
    ripple.style.left = `${x}px`
    ripple.style.top = `${y}px`
    ripplesContainerRef.current.appendChild(ripple)

    setTimeout(() => {
      if (ripple.parentNode) {
        ripple.parentNode.removeChild(ripple)
      }
    }, 650)
  }, [])

  // Smooth Cursor Follower RAF Loop (Pointer devices only)
  useEffect(() => {
    const isFinePointer = window.matchMedia('(pointer: fine)').matches
    if (!isFinePointer) return undefined

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const lerpFactor = prefersReducedMotion ? 1 : 0.22

    const tick = () => {
      const hintEl = cursorHintRef.current
      if (hintEl) {
        const target = pointerPosRef.current
        const curr = hintPosRef.current

        if (curr.x === -999) {
          curr.x = target.x
          curr.y = target.y
        } else {
          curr.x += (target.x - curr.x) * lerpFactor
          curr.y += (target.y - curr.y) * lerpFactor
        }

        hintEl.style.transform = `translate3d(${curr.x + 16}px, ${curr.y + 16}px, 0)`

        const shouldShow =
          isInsideHeroRef.current &&
          !isOverInteractiveRef.current &&
          target.x > -100

        hintEl.style.opacity = shouldShow ? '1' : '0'
      }
      rafIdRef.current = requestAnimationFrame(tick)
    }

    rafIdRef.current = requestAnimationFrame(tick)
    return () => {
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current)
    }
  }, [])

  // Pointer Interaction Handlers for Hero
  const handlePointerEnter = useCallback((e) => {
    if (e.pointerType === 'touch') return
    isInsideHeroRef.current = true
    pointerPosRef.current = { x: e.clientX, y: e.clientY }
  }, [])

  const handlePointerMove = useCallback((e) => {
    if (e.pointerType === 'touch') return
    isInsideHeroRef.current = true
    pointerPosRef.current = { x: e.clientX, y: e.clientY }

    // Check if hovering interactive controls (navbar, links, buttons, scroll cue)
    const isInteractive = Boolean(
      e.target.closest('a, button, nav, .navbar, .scroll-cue, .hero-section__scroll-wrap')
    )
    isOverInteractiveRef.current = isInteractive

    // Reset 2.5s stillness timer
    if (stillnessTimerRef.current) clearTimeout(stillnessTimerRef.current)
    if (cursorHintRef.current && !isInteractive) {
      cursorHintRef.current.style.opacity = '1'
    }

    stillnessTimerRef.current = setTimeout(() => {
      if (cursorHintRef.current) {
        cursorHintRef.current.style.opacity = '0'
      }
    }, 2500)
  }, [])

  const handlePointerLeave = useCallback(() => {
    isInsideHeroRef.current = false
    if (stillnessTimerRef.current) clearTimeout(stillnessTimerRef.current)
    if (cursorHintRef.current) {
      cursorHintRef.current.style.opacity = '0'
    }
  }, [])

  const handlePointerDown = useCallback((e) => {
    pointerDownPosRef.current = {
      x: e.clientX,
      y: e.clientY,
      time: Date.now(),
    }
  }, [])

  const handlePointerUp = useCallback(
    async (e) => {
      // 1. Check if click is on an interactive element (nav, links, buttons, scroll cue)
      if (e.target.closest('a, button, nav, .navbar, .scroll-cue, .hero-section__scroll-wrap')) {
        return
      }

      // 2. Check if user was dragging or text selecting
      const dx = Math.abs(e.clientX - pointerDownPosRef.current.x)
      const dy = Math.abs(e.clientY - pointerDownPosRef.current.y)
      if (dx > 7 || dy > 7) return

      const selection = window.getSelection()?.toString()
      if (selection && selection.length > 0) return

      // 3. If in failed state, tap opens mailto:
      if (copyStatus === 'failed') {
        window.location.href = `mailto:${SITE.email}`
        return
      }

      const isTouch = e.pointerType === 'touch'
      const ok = await executeCopy(isTouch)
      if (ok && !isTouch) {
        triggerRipple(e.clientX, e.clientY)
      }
    },
    [copyStatus, executeCopy, triggerRipple]
  )

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
      aria-label={`${SITE.name} — ${SITE.heroTagline}`}
      onPointerEnter={handlePointerEnter}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
    >
      {/* Subtle radial center vignette behind the particle stage */}
      <div className="hero-section__vignette" aria-hidden="true" />

      {/* Ripple ring container for click feedback */}
      <div ref={ripplesContainerRef} className="hero-ripples-layer" aria-hidden="true" />

      {/* Follower Cursor Hint (tracked caps matte dark pill) */}
      <div
        ref={cursorHintRef}
        className={`hero-cursor-hint ${copyStatus === 'copied' ? 'hero-cursor-hint--copied' : ''} ${
          copyStatus === 'failed' ? 'hero-cursor-hint--failed' : ''
        }`}
        aria-hidden="true"
      >
        {copyStatus === 'copied' ? (
          <>
            <svg
              className="hero-cursor-hint__check"
              viewBox="0 0 16 16"
              fill="none"
              stroke="#E8283C"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="3.5 8.5 6.5 11.5 12.5 5.5" />
            </svg>
            <span>Email copied</span>
          </>
        ) : copyStatus === 'failed' ? (
          <span>Couldn't copy. Tap to open mail</span>
        ) : (
          <span>Click anywhere to copy email</span>
        )}
      </div>

      {/* Touch Device Toast Feedback */}
      {showToast && (
        <div className="hero-toast" role="status" aria-live="polite">
          Email copied
        </div>
      )}

      {/* Visually Hidden Accessible Copy Button & Screen Reader Announcement */}
      <button
        type="button"
        className="hero-copy-sr-btn"
        onClick={() => executeCopy(false)}
        aria-label="Copy email address to clipboard"
      >
        Copy email address
      </button>
      <div className="sr-only" aria-live="polite">
        {srAnnouncement}
      </div>

      <div className="hero-section__inner">
        {/* Left (Desktop) / Top (Mobile): Thin rule + Name */}
        <div ref={leftBlockRef} className="hero-section__identity">
          <span className="hero-section__rule hero-section__rule--left" aria-hidden="true" />
          <h1 className="hero-section__name" aria-label={SITE.name}>
            <span aria-hidden="true">
              {SITE.name.slice(0, -1)}
              <span className="hero-section__name-accent">{SITE.name.slice(-1)}</span>
            </span>
          </h1>
        </div>

        {/* Center spacer reserving clean breathing room for the particle portrait */}
        <div className="hero-section__portrait-zone" aria-hidden="true" />

        {/* Right (Desktop) / Bottom (Mobile): Tagline + Thin rule */}
        <div ref={rightBlockRef} className="hero-section__role">
          <p className="hero-section__tagline">{SITE.heroTagline}</p>
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
