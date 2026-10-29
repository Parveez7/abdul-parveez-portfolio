import React, { useEffect, useState, useRef } from 'react'
import { gsap } from 'gsap'
import { SITE } from '../../config/site'
import { useSmoothScroll } from '../../context/SmoothScrollContext'
import './Loader.css'

export default function Loader({ onLoaded }) {
  const { stopScroll, startScroll } = useSmoothScroll()
  const [isDone, setIsDone] = useState(false)
  const loaderRef = useRef(null)
  const progressLineRef = useRef(null)
  const monogramRef = useRef(null)

  useEffect(() => {
    // Check if user prefers reduced motion
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (prefersReducedMotion) {
      setIsDone(true)
      if (onLoaded) onLoaded()
      return
    }

    // Halt scroll during initial load
    stopScroll()

    // Animate loader progress bar
    const tl = gsap.timeline({
      onComplete: () => {
        // Fade out loader smoothly
        gsap.to(loaderRef.current, {
          opacity: 0,
          duration: 0.6,
          ease: 'power2.inOut',
          onComplete: () => {
            setIsDone(true)
            startScroll()
            if (onLoaded) onLoaded()
          },
        })
      },
    })

    // Monogram entrance
    tl.to(monogramRef.current, {
      opacity: 1,
      y: 0,
      duration: 0.45,
      ease: 'power2.out',
    })

    // Progress bar fills over ~0.9s
    tl.to(
      progressLineRef.current,
      {
        scaleX: 1,
        duration: 0.85,
        ease: 'power1.inOut',
      },
      '-=0.2'
    )

    // Preload fonts in parallel
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.catch(() => {})
    }

    return () => {
      tl.kill()
      startScroll()
    }
  }, [stopScroll, startScroll, onLoaded])

  if (isDone) return null

  return (
    <div ref={loaderRef} className="site-loader" aria-label="Loading site">
      <div className="site-loader__content">
        {/* Monogram */}
        <div ref={monogramRef} className="site-loader__monogram">
          <svg
            width="40"
            height="34"
            viewBox="0 0 28 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="site-loader__svg"
          >
            <path
              d="M2 22L11 2M11 2H19C22.31 2 25 4.69 25 8C25 11.31 22.31 14 19 14H11V22"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        {/* Progress bar track & filling line */}
        <div className="site-loader__track">
          <div ref={progressLineRef} className="site-loader__fill" />
        </div>
      </div>
    </div>
  )
}
