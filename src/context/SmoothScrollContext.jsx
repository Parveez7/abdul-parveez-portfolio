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
  const [isScrolled, setIsScrolled] = useState(false)
  const [isChromeHidden, setIsChromeHidden] = useState(false)
  const isScrolledRef = useRef(false)

  // Lightweight progress store (sectionId -> 0..1), avoiding React re-renders every frame
  const progressMap = useRef(new Map())
  const listenersMap = useRef(new Map())

  // Register progress callback without triggering React re-renders
  const subscribeProgress = useCallback((sectionId, callback) => {
    if (!listenersMap.current.has(sectionId)) {
      listenersMap.current.set(sectionId, new Set())
    }
    listenersMap.current.get(sectionId).add(callback)

    if (progressMap.current.has(sectionId)) {
      callback(progressMap.current.get(sectionId))
    }

    return () => {
      listenersMap.current.get(sectionId)?.delete(callback)
    }
  }, [])

  const updateProgress = useCallback((sectionId, progress) => {
    progressMap.current.set(sectionId, progress)
    const listeners = listenersMap.current.get(sectionId)
    if (listeners) {
      listeners.forEach((fn) => fn(progress))
    }
  }, [])

  const scrollTo = useCallback((target, customOptions = {}) => {
    if (!target) return

    if (isReducedMotion.current || !lenisRef.current) {
      const el = typeof target === 'string' ? document.querySelector(target) : target
      if (el) {
        el.scrollIntoView({ behavior: 'auto' })
      }
      return
    }

    lenisRef.current.scrollTo(target, {
      duration: 1.2,
      easing: (t) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t)),
      ...customOptions,
    })
  }, [])

  const stopScroll = useCallback(() => {
    lenisRef.current?.stop()
  }, [])

  const startScroll = useCallback(() => {
    lenisRef.current?.start()
  }, [])

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    isReducedMotion.current = mediaQuery.matches

    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual'
    }
    window.scrollTo(0, 0)

    let lenisInstance = null
    let tickerHandler = null

    if (!isReducedMotion.current) {
      // Use clean lerp alone for responsive trackpad and mouse wheel scrolling without stutter
      lenisInstance = new Lenis({
        lerp: 0.1,
        smoothWheel: true,
        syncTouch: false,
        wheelMultiplier: 1.0,
        touchMultiplier: 1.0,
      })
      lenisRef.current = lenisInstance

      const handleLenisScroll = (e) => {
        ScrollTrigger.update()
        const scrolled = e.scroll > 50
        if (scrolled !== isScrolledRef.current) {
          isScrolledRef.current = scrolled
          setIsScrolled(scrolled)
        }
      }
      lenisInstance.on('scroll', handleLenisScroll)

      tickerHandler = (time) => {
        lenisInstance.raf(time * 1000)
      }
      gsap.ticker.add(tickerHandler)
      gsap.ticker.lagSmoothing(0)
    } else {
      const handleNativeScroll = () => {
        const scrolled = window.scrollY > 50
        if (scrolled !== isScrolledRef.current) {
          isScrolledRef.current = scrolled
          setIsScrolled(scrolled)
        }
      }
      window.addEventListener('scroll', handleNativeScroll, { passive: true })
    }

    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(() => {
        ScrollTrigger.refresh()
      })
    } else {
      setTimeout(() => ScrollTrigger.refresh(), 300)
    }

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
  }, []) // Empty dependency array: Lenis is initialized once and never destroyed on scroll!

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
        isChromeHidden,
        setIsChromeHidden,
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
