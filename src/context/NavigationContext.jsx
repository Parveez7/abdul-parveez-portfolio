import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

const NavigationContext = createContext({
  currentPath: '/',
  navigate: () => {},
  goBackToFeatured: () => {},
})

const PENDING_TARGET_KEY = 'portfolio_pending_target'

export function NavigationProvider({ children }) {
  const [currentPath, setCurrentPath] = useState(() => {
    if (typeof window === 'undefined') return '/'
    return window.location.pathname || '/'
  })

  // When returning to '/', only scroll to top if there is NO pending target.
  // If there IS a pending target, Featured.jsx handles the precise pin-aware jump upon mounting.
  useEffect(() => {
    if (currentPath === '/' || currentPath === '') {
      let hasPending = false
      try {
        hasPending = Boolean(sessionStorage.getItem(PENDING_TARGET_KEY))
      } catch {
        hasPending = false
      }

      if (!hasPending) {
        window.scrollTo(0, 0)
        if (window.__lenis) {
          window.__lenis.scrollTo(0, { immediate: true })
        }
      }
    }
  }, [currentPath])

  // Synchronize with popstate (browser back/forward buttons)
  useEffect(() => {
    const handlePopState = () => {
      const newPath = window.location.pathname || '/'
      // If returning to homepage from a subpage via browser back, set pending target
      if (newPath === '/' || newPath === '') {
        try {
          sessionStorage.setItem(PENDING_TARGET_KEY, 'featured-work')
        } catch {
          // ignore
        }
      }
      setCurrentPath(newPath)
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  const navigate = useCallback((to) => {
    if (!to) return
    if (to.startsWith('http://') || to.startsWith('https://') || to.startsWith('mailto:')) {
      window.open(to, '_blank', 'noopener,noreferrer')
      return
    }

    // If navigating to detail pages, store pending target for return journey
    if (to.startsWith('/projects') || to.startsWith('/experience') || to.startsWith('/exchange')) {
      try {
        sessionStorage.setItem(PENDING_TARGET_KEY, 'featured-work')
      } catch {
        // ignore
      }
    }

    window.history.pushState({}, '', to)
    const newPath = window.location.pathname || '/'
    setCurrentPath(newPath)

    if (newPath !== '/') {
      window.scrollTo(0, 0)
      if (window.__lenis) {
        window.__lenis.scrollTo(0, { immediate: true })
      }
      setTimeout(() => {
        ScrollTrigger.refresh()
      }, 80)
    }
  }, [])

  const goBackToFeatured = useCallback(() => {
    try {
      sessionStorage.setItem(PENDING_TARGET_KEY, 'featured-work')
    } catch {
      // ignore
    }

    window.history.pushState({}, '', '/')
    setCurrentPath('/')
  }, [])

  return (
    <NavigationContext.Provider value={{ currentPath, navigate, goBackToFeatured }}>
      {children}
    </NavigationContext.Provider>
  )
}

export function useNavigation() {
  return useContext(NavigationContext)
}
