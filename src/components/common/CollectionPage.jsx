import React, { useEffect, useRef, useState } from 'react'
import { useNavigation } from '../../context/NavigationContext'
import './CollectionPage.css'

export default function CollectionPage({
  eyebrowNum = '01',
  eyebrowLabel = 'PROJECTS',
  titleLead = "Things I've",
  titleAccent = 'Built',
  subtitle = 'AI products built to be genuinely useful.',
  documentTitle = 'Projects | Abdul Parveez',
  nextPage = null, // { label: 'Experience', route: '/experience' }
  children,
}) {
  const { navigate, goBackToFeatured } = useNavigation()
  const progressBarRef = useRef(null)

  // Document Title
  useEffect(() => {
    const originalTitle = document.title
    document.title = documentTitle
    return () => {
      document.title = originalTitle
    }
  }, [documentTitle])

  // Scroll Progress Bar at the top of the viewport
  useEffect(() => {
    let rafId = null

    const handleScroll = () => {
      if (!progressBarRef.current) return
      const scrollY = window.scrollY
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight
      const progress = maxScroll > 0 ? Math.min(1, Math.max(0, scrollY / maxScroll)) : 0
      progressBarRef.current.style.transform = `scaleX(${progress})`
    }

    const onScroll = () => {
      cancelAnimationFrame(rafId)
      rafId = requestAnimationFrame(handleScroll)
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    handleScroll()

    return () => {
      window.removeEventListener('scroll', onScroll)
      cancelAnimationFrame(rafId)
    }
  }, [])

  return (
    <div className="collection-page" data-theme="dark">
      {/* 1. Fixed Red Top Scroll-Progress Hairline (2px #E8283C) */}
      <div className="collection-progress" aria-hidden="true">
        <div ref={progressBarRef} className="collection-progress__fill" />
      </div>

      {/* 2. Ambient Background: Soft Drifting Orbs & Grain matching Featured Work */}
      <div className="featured-work__ambient collection-ambient" aria-hidden="true">
        <div className="featured-work__orb featured-work__orb--1" />
        <div className="featured-work__orb featured-work__orb--2" />
        <div className="featured-work__orb featured-work__orb--3" />
        <div className="featured-work__grain" />
      </div>

      {/* 3. Main Container */}
      <div className="collection-page__container">
        {/* Top Bar: Back to Featured Work */}
        <header className="collection-page__top-nav">
          <button
            type="button"
            onClick={goBackToFeatured}
            className="collection-back-btn"
            aria-label="Back to Featured Work section on home page"
          >
            <span className="collection-back-arrow" aria-hidden="true">←</span>
            <span>Back to Featured Work</span>
          </button>
        </header>

        {/* Hero Section Header matching Featured Work typography tokens */}
        <header className="collection-header">
          {/* Eyebrow with red accent dot & hairline */}
          <div className="collection-header__eyebrow-wrap">
            <span className="collection-header__index">{eyebrowNum}</span>
            <span className="collection-header__eyebrow-sep" aria-hidden="true" />
            <span className="collection-header__eyebrow">{eyebrowLabel}</span>
          </div>

          {/* Heading: Heavy Grotesk + Italic Serif pairing */}
          <h1 className="collection-header__title">
            <span className="collection-header__title-lead">{titleLead}</span>
            <span className="collection-header__title-accent">{titleAccent}</span>
          </h1>

          {/* Supporting line */}
          {subtitle && (
            <p className="collection-header__subtitle">{subtitle}</p>
          )}
        </header>

        {/* 4. Page Content: Stacked Showcase Panels or Vertical Timeline */}
        <main className="collection-content">
          {children}
        </main>

        {/* 5. Footer Navigation Block */}
        <footer className="collection-footer">
          <div className="collection-footer__inner">
            <button
              type="button"
              onClick={goBackToFeatured}
              className="collection-footer__back"
            >
              <span className="collection-footer__arrow" aria-hidden="true">←</span>
              <span>Back to home</span>
            </button>

            {nextPage && (
              <a
                href={nextPage.route}
                onClick={(e) => {
                  e.preventDefault()
                  navigate(nextPage.route)
                }}
                className="collection-footer__next"
              >
                <span>Next: {nextPage.label}</span>
                <span className="collection-footer__arrow" aria-hidden="true">→</span>
              </a>
            )}
          </div>
        </footer>
      </div>
    </div>
  )
}

