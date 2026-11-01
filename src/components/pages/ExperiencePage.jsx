import React, { useRef, useEffect, useState, useCallback } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useNavigation } from '../../context/NavigationContext'
import CollectionPage from '../common/CollectionPage'
import { EXPERIENCE_DATA } from '../../data/experience'
import './ExperiencePage.css'

/**
 * Responsibility Icons mapped to the 8 responsibility tiles
 */
function ResponsibilityIcon({ index }) {
  const icons = [
    // 0: Product expert / new features (Star / Compass)
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>,
    // 1: Data features (Binary / Database)
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <ellipse cx="12" cy="5" rx="9" ry="3" />
      <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
      <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
    </svg>,
    // 2: Cleaning data (Filter / Broom)
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
    </svg>,
    // 3: Analysing data (Bar chart / Trend)
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
      <path d="M4 20h16" />
    </svg>,
    // 4: Building data pipelines (Connected Nodes)
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="6" cy="6" r="3" />
      <circle cx="18" cy="18" r="3" />
      <circle cx="18" cy="6" r="3" />
      <path d="M6 9v12" />
      <path d="M9 6h6" />
      <path d="M18 9v6" />
    </svg>,
    // 5: Client needs (User / Dialogue)
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>,
    // 6: Stakeholder presentation (Monitor / Chart)
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
      <line x1="8" y1="21" x2="16" y2="21" />
      <line x1="12" y1="17" x2="12" y2="21" />
      <path d="M6 10l3-3 4 4 5-5" />
    </svg>,
    // 7: Dashboards (Grid layout / Dashboard)
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="3" y="3" width="7" height="9" rx="1" />
      <rect x="14" y="3" width="7" height="5" rx="1" />
      <rect x="14" y="12" width="7" height="9" rx="1" />
      <rect x="3" y="16" width="7" height="5" rx="1" />
    </svg>,
  ]

  return (
    <div className="responsibility-tile__icon" aria-hidden="true">
      {icons[index % icons.length]}
    </div>
  )
}

/**
 * Animated Data Journey Pipeline Diagram for TON Technology Services
 */
function SigmaMilestonesVisual({ milestones = [] }) {
  return (
    <div className="sigma-visual" aria-label="Sigma Club milestones and app wireframes">
      <div className="sigma-visual__track">
        <span className="sigma-visual__title">LEADERSHIP TIMELINE</span>
        <div className="sigma-milestones-row">
          {milestones.map((milestone, idx) => (
            <div key={idx} className="sigma-milestone-item">
              <div className="sigma-milestone-node">
                <span className="sigma-milestone-inner" />
              </div>
              <p className="sigma-milestone-text">{milestone}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Three Abstract Wireframe Mobile Phone Outlines */}
      <div className="sigma-devices" aria-hidden="true">
        <div className="sigma-phone sigma-phone--left">
          <div className="sigma-phone__notch" />
          <div className="sigma-phone__line sigma-phone__line--w60" />
          <div className="sigma-phone__line sigma-phone__line--w80" />
          <div className="sigma-phone__box" />
        </div>
        <div className="sigma-phone sigma-phone--center">
          <div className="sigma-phone__notch" />
          <div className="sigma-phone__header-dot" />
          <div className="sigma-phone__line sigma-phone__line--w70" />
          <div className="sigma-phone__card" />
          <div className="sigma-phone__line sigma-phone__line--w50" />
        </div>
        <div className="sigma-phone sigma-phone--right">
          <div className="sigma-phone__notch" />
          <div className="sigma-phone__line sigma-phone__line--w50" />
          <div className="sigma-phone__box" />
        </div>
      </div>
    </div>
  )
}

/**
 * Single Experience Panel
 */
function ExperiencePanel({ entry, index }) {
  const panelRef = useRef(null)

  const handleMouseMove = useCallback((e) => {
    if (!panelRef.current) return
    const rect = panelRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    panelRef.current.style.setProperty('--mx', `${x}px`)
    panelRef.current.style.setProperty('--my', `${y}px`)
  }, [])

  // Display dates or "Internship" while start/end are null
  const dateDisplay =
    entry.start && entry.end
      ? `${entry.start} — ${entry.end}`
      : entry.start
      ? `${entry.start} — Present`
      : 'Internship'

  return (
    <article
      ref={panelRef}
      className="exp-panel"
      onMouseMove={handleMouseMove}
      data-exp-id={entry.id}
      aria-label={`${entry.organisation}: ${entry.role}`}
    >
      {/* 1. Cursor Spotlight */}
      <div className="exp-panel__spotlight" aria-hidden="true" />

      {/* 2. Giant Outline Numeral */}
      <span className="exp-panel__huge-num" aria-hidden="true">
        {entry.index}
      </span>

      {/* 3. Panel Header: Dates, Organisation, Role */}
      <header className="exp-panel__header">
        <div className="exp-panel__meta">
          <span className="exp-panel__index">{entry.index}</span>
          <span className="exp-panel__date-badge">{dateDisplay}</span>
        </div>

        <h2 className="exp-panel__org">{entry.organisation}</h2>
        <p className="exp-panel__role">{entry.role}</p>
        <p className="exp-panel__summary">{entry.summary}</p>
      </header>

      {/* 4. Custom Visual & Content Block per entry */}
      {entry.id === 'ton-technology-services' ? (
        <div className="exp-panel__details">
          {/* 8 Responsibilities Grid */}
          <div className="responsibilities-section">
            <span className="responsibilities-heading">KEY FOCUS AREAS</span>
            <div className="responsibilities-grid">
              {entry.responsibilities.map((resp, rIdx) => (
                <div key={rIdx} className="responsibility-tile">
                  <ResponsibilityIcon index={rIdx} />
                  <span className="responsibility-tile__text">{resp}</span>
                </div>
              ))}
            </div>
          </div>

          {/* End-to-end Data Pipeline Diagram */}
        </div>
      ) : (
        <div className="exp-panel__details">
          {/* Sigma Club Milestones & Wireframe Motifs */}
          <SigmaMilestonesVisual milestones={entry.milestones} />
        </div>
      )}

      {/* 5. Tag Chips */}
      <div className="exp-panel__tags" aria-label="Skills and tools">
        {entry.tags.map((tag) => (
          <span key={tag} className="exp-tag-chip">
            {tag}
          </span>
        ))}
      </div>
    </article>
  )
}

/**
 * Main Experience Page
 */
export default function ExperiencePage() {
  const containerRef = useRef(null)
  const timelineSvgRef = useRef(null)
  const lineFillRef = useRef(null)
  const nodesRef = useRef([])
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)

  // Reduced motion preference
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setPrefersReducedMotion(mq.matches)
    const handler = () => setPrefersReducedMotion(mq.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  // Scrubbed vertical timeline drawing with ScrollTrigger
  useEffect(() => {
    if (prefersReducedMotion) return

    const container = containerRef.current
    const lineFill = lineFillRef.current
    if (!container || !lineFill) return

    const st = ScrollTrigger.create({
      trigger: container,
      start: 'top 75%',
      end: 'bottom 85%',
      scrub: 0.5,
      onUpdate: (self) => {
        const progress = self.progress
        lineFill.style.transform = `scaleY(${progress})`

        // Light up timeline nodes as line reaches them
        nodesRef.current.forEach((nodeEl, idx) => {
          if (!nodeEl) return
          const threshold = (idx + 0.3) / nodesRef.current.length
          if (progress >= threshold) {
            nodeEl.classList.add('exp-timeline__node--active')
          } else {
            nodeEl.classList.remove('exp-timeline__node--active')
          }
        })
      },
    })

    return () => st.kill()
  }, [prefersReducedMotion])

  return (
    <CollectionPage
      eyebrowNum="02"
      eyebrowLabel="EXPERIENCE"
      titleLead="Where I've"
      titleAccent="Worked"
      subtitle="Teams I've led and teams I've learned from."
      documentTitle="Experience | Abdul Parveez"
      nextPage={{ label: 'Exchange', route: '/exchange' }}
    >
      <div ref={containerRef} className="experience-layout">
        {/* Left: Scroll-Drawn Vertical Timeline Track */}
        <aside className="exp-timeline" aria-hidden="true">
          <div className="exp-timeline__track">
            <div className="exp-timeline__base-line" />
            <div ref={lineFillRef} className="exp-timeline__fill-line" />

            {EXPERIENCE_DATA.map((entry, idx) => (
              <div
                key={entry.id}
                ref={(el) => {
                  nodesRef.current[idx] = el
                }}
                className={`exp-timeline__node exp-timeline__node--${idx + 1}`}
              >
                <span className="exp-timeline__dot" />
              </div>
            ))}
          </div>
        </aside>

        {/* Right: Experience Panels */}
        <div className="exp-panels-list">
          {EXPERIENCE_DATA.map((entry, index) => (
            <ExperiencePanel key={entry.id} entry={entry} index={index} />
          ))}
        </div>
      </div>
    </CollectionPage>
  )
}

