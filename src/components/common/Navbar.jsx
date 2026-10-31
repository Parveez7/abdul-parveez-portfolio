import React, { useState, useEffect } from 'react'
import { SITE } from '../../config/site'
import { useSmoothScroll } from '../../context/SmoothScrollContext'
import './Navbar.css'

export default function Navbar() {
  const {
    scrollTo,
    activeTheme,
    activeSection,
    isScrolled,
    isChromeHidden,
  } = useSmoothScroll()

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const isHero = activeSection === 'hero' && !isScrolled
  const isConnectActive = activeSection === 'contact'

  // Handle clicking nav item
  const handleNavClick = (e, href) => {
    e.preventDefault()
    setMobileMenuOpen(false)

    // Support detail page routing if current path is not root
    if (typeof window !== 'undefined' && window.location.pathname !== '/' && window.location.pathname !== '') {
      window.location.href = `/${href}`
      return
    }

    scrollTo(href, { offset: 0 })
  }

  // Prevent background scrolling when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [mobileMenuOpen])

  return (
    <>
      <header
        className={`navbar ${activeTheme === 'light' ? 'navbar--light' : 'navbar--dark'} ${
          isScrolled ? 'navbar--scrolled' : ''
        } ${isChromeHidden ? 'navbar--hidden' : ''}`}
        role="banner"
        aria-hidden={isChromeHidden}
      >
        <div className="navbar__container">
          {/* Left: Brand Monogram crossfading to Full Name */}
          <a
            href="#hero"
            onClick={(e) => handleNavClick(e, '#hero')}
            className="navbar__brand"
            aria-label={`${SITE.name} Home`}
          >
            {/* Monogram (Hero mode) */}
            <span
              className={`navbar__monogram ${isHero ? 'navbar__monogram--active' : ''}`}
              aria-hidden={!isHero}
            >
              <svg
                width="28"
                height="24"
                viewBox="0 0 28 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="monogram-svg"
              >
                <path
                  d="M2 22L11 2M11 2H19C22.31 2 25 4.69 25 8C25 11.31 22.31 14 19 14H11V22"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>

            {/* Full Name in bold caps (post-hero mode) */}
            <span
              className={`navbar__fullname ${!isHero ? 'navbar__fullname--active' : ''}`}
              aria-hidden={isHero}
            >
              {SITE.nameUpper}
            </span>
          </a>

          {/* Right: Desktop Navigation Links + Connect CTA */}
          <nav className="navbar__nav-desktop" aria-label="Main Navigation">
            <ul className="navbar__links">
              {SITE.nav.map((item) => {
                const isActive = activeSection === item.id
                return (
                  <li key={item.id} className="navbar__item">
                    <a
                      href={item.href}
                      onClick={(e) => handleNavClick(e, item.href)}
                      className={`navbar__link ${isActive ? 'navbar__link--active' : ''}`}
                    >
                      <span className="navbar__link-label">{item.label}</span>
                      <span
                        className={`navbar__active-dot ${
                          isActive ? 'navbar__active-dot--visible' : ''
                        }`}
                        aria-hidden="true"
                      />
                    </a>
                  </li>
                )
              })}

              {/* Connect CTA Pill Button */}
              {SITE.cta && (
                <li className="navbar__item navbar__item--cta">
                  <a
                    href={SITE.cta.href}
                    onClick={(e) => handleNavClick(e, SITE.cta.href)}
                    className={`navbar__cta-btn ${isConnectActive ? 'navbar__cta-btn--active' : ''}`}
                  >
                    <span>{SITE.cta.label}</span>
                    <svg
                      className="navbar__cta-arrow"
                      width="12"
                      height="12"
                      viewBox="0 0 12 12"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                      aria-hidden="true"
                    >
                      <path
                        d="M2.5 9.5L9.5 2.5M9.5 2.5H4.5M9.5 2.5V7.5"
                        stroke="currentColor"
                        strokeWidth="1.3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </a>
                </li>
              )}
            </ul>
          </nav>

          {/* Mobile Menu Hamburger Toggle */}
          <button
            type="button"
            className={`navbar__hamburger ${mobileMenuOpen ? 'navbar__hamburger--open' : ''}`}
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-expanded={mobileMenuOpen}
            aria-label="Toggle navigation menu"
          >
            <span className="hamburger-line hamburger-line--1" />
            <span className="hamburger-line hamburger-line--2" />
          </button>
        </div>
      </header>

      {/* Mobile Full-Screen Menu Overlay */}
      <div
        className={`mobile-menu ${mobileMenuOpen ? 'mobile-menu--open' : ''} ${
          activeTheme === 'light' ? 'mobile-menu--light' : 'mobile-menu--dark'
        }`}
        aria-hidden={!mobileMenuOpen}
      >
        <div className="mobile-menu__inner">
          <ul className="mobile-menu__links">
            {SITE.nav.map((item, index) => {
              const isActive = activeSection === item.id
              return (
                <li
                  key={item.id}
                  className="mobile-menu__item"
                  style={{ '--stagger-index': index }}
                >
                  <a
                    href={item.href}
                    onClick={(e) => handleNavClick(e, item.href)}
                    className={`mobile-menu__link ${
                      isActive ? 'mobile-menu__link--active' : ''
                    }`}
                  >
                    <span className="mobile-menu__number">0{index + 1}</span>
                    <span className="mobile-menu__text">{item.label}</span>
                    {isActive && <span className="mobile-menu__dot" />}
                  </a>
                </li>
              )
            })}

            {/* Mobile CTA */}
            {SITE.cta && (
              <li
                className="mobile-menu__item mobile-menu__item--cta"
                style={{ '--stagger-index': SITE.nav.length }}
              >
                <a
                  href={SITE.cta.href}
                  onClick={(e) => handleNavClick(e, SITE.cta.href)}
                  className={`mobile-menu__link mobile-menu__link--cta ${
                    isConnectActive ? 'mobile-menu__link--active' : ''
                  }`}
                >
                  <span className="mobile-menu__number">0{SITE.nav.length + 1}</span>
                  <span className="mobile-menu__text">{SITE.cta.label} ↗</span>
                </a>
              </li>
            )}
          </ul>

          <div className="mobile-menu__footer">
            <p className="mobile-menu__tagline">{SITE.tagline}</p>
          </div>
        </div>
      </div>
    </>
  )
}
