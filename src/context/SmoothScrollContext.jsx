import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react'
import Lenis from 'lenis'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

const SmoothScrollContext = createContext(null)

export function SmoothScrollProvider({ children }) {
  const lenisRef = useRef(null)
  const isReducedMotion = useRef(false)
  const [activeTheme, setActiveTheme] = useState('dark') // 'dark' | 'light'
  const [activeSection, setActiveSection] = useState('hero') // 'hero' | 'about' | 'filler' | ...
  const [activeSectionIndex, setActiveSectionIndex] = useState('01') // '01'..'05'
  const [isScrolled, setIsScrolled] = useState(false) // true after first scroll (> 50px)

  // Lightweight progress store (sectionId -> 0..1), avoiding React re-renders every frame
  const progressMap = useRef(new Map())
  const listenersMap = useRef(new Map())

  // Register progress callback without triggering React re-renders
  const subscribeProgress = useCallback((sectionId, callback) => {
    if (!listenersMap.current.has(sectionId)) {
      listenersMap.current.set(sectionId, new Set())
    }
    listenersMap.current.get(sectionId).add(callback)

    // Immediate callback with current value if exists
    if (progressMap.current.has(sectionId)) {
      callback(progressMap.current.get(sectionId))
    }

    return () => {
      listenersMap.current.get(sectionId)?.delete(callback)
    }
  }, [])

  // Update progress for a section and notify subscribers
  const updateProgress = useCallback((sectionId, progress) => {
    progressMap.current.set(sectionId, progress)
    const listeners = listenersMap.current.get(sectionId)
    if (listeners) {
      listeners.forEach((fn) => fn(progress))
    }
  }, [])

  // Smooth scroll method using Lenis with expo-out ease
  const scrollTo = useCallback((target, customOptions = {}) => {
    if (!target) return

    if (isReducedMotion.current || !lenisRef.current) {
      const el = typeof target === 'string' ? document.querySelector(target) : target
      if (el) {
        el.scrollIntoView({ behavior: 'auto' })
      }
      return
    }

    // Expo-out easing function: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t))
    lenisRef.current.scrollTo(target, {
      duration: 1.4,
      easing: (t) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t)),
      ...customOptions,
    })
  }, [])

  // Loader control: stop and resume Lenis
  const stopScroll = useCallback(() => {
    lenisRef.current?.stop()
  }, [])

  const startScroll = useCallback(() => {
    lenisRef.current?.start()
  }, [])

  useEffect(() => {
    // 1. Check for reduced motion preference
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    isReducedMotion.current = mediaQuery.matches

    // 2. Manual scroll restoration - always start at top on reload
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual'
    }
    window.scrollTo(0, 0)

    // 3. Initialize single Lenis instance if not reduced motion
    let lenisInstance = null
    let tickerHandler = null

    if (!isReducedMotion.current) {
      lenisInstance = new Lenis({
        lerp: 0.09,
        duration: 1.15,
        easing: (t) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t)),
        smoothWheel: true,
        syncTouch: false, // Keep native touch feel on mobile devices
      })
      lenisRef.current = lenisInstance

      // Sync Lenis scroll with GSAP ScrollTrigger
      const handleLenisScroll = (e) => {
        ScrollTrigger.update()
        if (e.scroll > 50 && !isScrolled) {
          setIsScrolled(true)
        } else if (e.scroll <= 50 && isScrolled) {
          setIsScrolled(false)
        }
      }
      lenisInstance.on('scroll', handleLenisScroll)

      // GSAP Ticker synchronization
      tickerHandler = (time) => {
        lenisInstance.raf(time * 1000)
      }
      gsap.ticker.add(tickerHandler)
      gsap.ticker.lagSmoothing(0)
    } else {
      // For reduced motion, just track native window scroll for isScrolled
      const handleNativeScroll = () => {
        setIsScrolled(window.scrollY > 50)
      }
      window.addEventListener('scroll', handleNativeScroll, { passive: true })
    }

    // 4. Wait for document.fonts.ready before the first ScrollTrigger.refresh()
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(() => {
        ScrollTrigger.refresh()
      })
    } else {
      setTimeout(() => ScrollTrigger.refresh(), 300)
    }

    // 5. Debounced ResizeObserver to refresh ScrollTrigger cleanly on dimension change
    let resizeTimer = null
    const debouncedRefresh = () => {
      clearTimeout(resizeTimer)
      resizeTimer = setTimeout(() => {
        ScrollTrigger.refresh()
      }, 150)
    }

    const resizeObserver = new ResizeObserver(debouncedRefresh)
    resizeObserver.observe(document.body)
    window.addEventListener('resize', debouncedRefresh)

    // Cleanup
    return () => {
      clearTimeout(resizeTimer)
      resizeObserver.disconnect()
      window.removeEventListener('resize', debouncedRefresh)

      if (tickerHandler) {
        gsap.ticker.remove(tickerHandler)
      }
      if (lenisInstance) {
        lenisInstance.destroy()
        lenisRef.current = null
      }
    }
  }, [isScrolled])

  return (
    <SmoothScrollContext.Provider
      value={{
        lenis: lenisRef.current,
        scrollTo,
        stopScroll,
        startScroll,
        activeTheme,
        setActiveTheme,
        activeSection,
        setActiveSection,
        activeSectionIndex,
        setActiveSectionIndex,
        isScrolled,
        subscribeProgress,
        updateProgress,
      }}
    >
      {children}
    </SmoothScrollContext.Provider>
  )
}

export function useSmoothScroll() {
  const context = useContext(SmoothScrollContext)
  if (!context) {
    throw new Error('useSmoothScroll must be used within a SmoothScrollProvider')
  }
  return context
}
