import React, { useRef, useEffect, useState, useCallback } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useSmoothScroll } from '../../context/SmoothScrollContext'
import { useNavigation } from '../../context/NavigationContext'
import CollectionPage from '../common/CollectionPage'
import { PROJECTS_DATA, moreComing } from '../../data/projects'
import { DietCoachMock, EmotionScannerMock } from './ProjectMocks'
import './ProjectsPage.css'

// Check for real project screenshots in src/assets/projects/
const projectAssetModules = import.meta.glob(
  '../../assets/projects/*.{webp,png,jpg,jpeg}',
  { eager: true, import: 'default' }
)

function resolveProjectScreenshot(projectId) {
  if (!projectId) return null
  const matchKey = Object.keys(projectAssetModules).find((path) =>
    path.toLowerCase().includes(`${projectId.toLowerCase()}-1`)
  )
  return matchKey ? projectAssetModules[matchKey] : null
}

/**
 * Single Project Showcase Panel with Sticky Stacking, 3D Tilt Preview & Step Line
 */
function ProjectPanel({ project, index, isEven, prefersReducedMotion }) {
  const panelRef = useRef(null)
  const previewRef = useRef(null)
  const stepsTrackRef = useRef(null)
  const [isInView, setIsInView] = useState(false)
  const [activeStepIndex, setActiveStepIndex] = useState(0)

  // Real screenshot fallback check
  const screenshotUrl = resolveProjectScreenshot(project.id)

  // Observe when this panel is in view to pause/resume animation loops
  useEffect(() => {
    const el = panelRef.current
    if (!el) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsInView(entry.isIntersecting)
      },
      { threshold: 0.2 }
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  // Step highlight cycle while panel is in view
  useEffect(() => {
    if (!isInView || prefersReducedMotion) return
    const interval = setInterval(() => {
      setActiveStepIndex((prev) => (prev + 1) % project.steps.length)
    }, 2200)
    return () => clearInterval(interval)
  }, [isInView, prefersReducedMotion, project.steps.length])

  // Mouse tilt on preview container (desktop only)
  const handleMouseMove = useCallback((e) => {
    if (prefersReducedMotion || !previewRef.current) return
    const rect = previewRef.current.getBoundingClientRect()
    const x = (e.clientX - rect.left) / rect.width - 0.5
    const y = (e.clientY - rect.top) / rect.height - 0.5
    previewRef.current.style.transform = `perspective(1000px) rotateX(${-y * 4}deg) rotateY(${x * 4}deg) translate3d(0, -2px, 0)`
  }, [prefersReducedMotion])

  const handleMouseLeave = useCallback(() => {
    if (!previewRef.current) return
    previewRef.current.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) translate3d(0, 0, 0)'
  }, [])

  // Panel cursor spotlight
  const handlePanelMouseMove = useCallback((e) => {
    if (!panelRef.current) return
    const rect = panelRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    panelRef.current.style.setProperty('--mx', `${x}px`)
    panelRef.current.style.setProperty('--my', `${y}px`)
  }, [])

  const hasLinks = project.links && Object.values(project.links).some(Boolean)

  return (
    <article
      ref={panelRef}
      className={`project-panel ${isEven ? 'project-panel--reverse' : ''}`}
      onMouseMove={handlePanelMouseMove}
      data-project-id={project.id}
      aria-label={`Project ${project.index}: ${project.title}`}
    >
      {/* 1. Cursor Spotlight Layer */}
      <div className="project-panel__spotlight" aria-hidden="true" />

      {/* 2. Giant Background Outline Numeral ("01", "02") */}
      <span className="project-panel__huge-num" aria-hidden="true">
        {project.index}
      </span>

      {/* 3. Text Column */}
      <div className="project-panel__text-col">
        {/* Eyebrow */}
        <div className="project-panel__eyebrow-wrap">
          <span className="project-panel__eyebrow-dot" />
          <span className="project-panel__eyebrow">PROJECT {project.index}</span>
        </div>

        {/* Title & Subtitle */}
        <h2 className="project-panel__title">{project.title}</h2>
        <p className="project-panel__subtitle">{project.subtitle}</p>

        {/* Hairline Divider */}
        <div className="project-panel__divider" aria-hidden="true" />

        {/* Description */}
        <p className="project-panel__desc">{project.description}</p>

        {/* "How It Works" 4-Step Animated Track */}
        <div className="project-steps" aria-label="Workflow steps">
          <span className="project-steps__label">HOW IT WORKS</span>
          <div ref={stepsTrackRef} className="project-steps__track">
            {project.steps.map((step, idx) => {
              const isActive = activeStepIndex === idx
              const isPassed = activeStepIndex > idx
              return (
                <div
                  key={step}
                  className={`project-steps__item ${
                    isActive ? 'project-steps__item--active' : ''
                  } ${isPassed ? 'project-steps__item--passed' : ''}`}
                >
                  <span className="project-steps__node">
                    <span className="project-steps__node-num">{idx + 1}</span>
                  </span>
                  <span className="project-steps__name">{step}</span>
                  {idx < project.steps.length - 1 && (
                    <span className="project-steps__line" aria-hidden="true" />
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Tag Chips */}
        <div className="project-panel__tags" aria-label="Technologies used">
          {project.tags.map((tag) => (
            <span key={tag} className="project-tag-chip">
              {tag}
            </span>
          ))}
        </div>

        {/* Action Link Buttons (or quiet "Links coming soon" label) */}
        <div className="project-panel__links">
          {hasLinks ? (
            <>
              {project.links.live && (
                <a
                  href={project.links.live}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="project-btn project-btn--primary"
                >
                  <span>Live Demo</span>
                  <span aria-hidden="true">↗</span>
                </a>
              )}
              {project.links.github && (
                <a
                  href={project.links.github}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="project-btn project-btn--secondary"
                >
                  <span>GitHub</span>
                  <span aria-hidden="true">↗</span>
                </a>
              )}
              {project.links.case && (
                <a
                  href={project.links.case}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="project-btn project-btn--secondary"
                >
                  <span>Case Study</span>
                  <span aria-hidden="true">→</span>
                </a>
              )}
            </>
          ) : (
            <div className="project-links-empty">
              <span className="project-links-empty__dot" />
              <span>Links coming soon</span>
            </div>
          )}
        </div>
      </div>

      {/* 4. Preview Column: Refined Device Frame or Animated Mock UI */}
      <div
        ref={previewRef}
        className="project-panel__preview-col"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        {screenshotUrl ? (
          <div className="project-screenshot-frame">
            <img
              src={screenshotUrl}
              alt={`${project.title} real app interface screenshot`}
              loading="lazy"
              className="project-screenshot-img"
            />
          </div>
        ) : (
          <div className="project-mock-container">
            {project.id === 'ai-diet-coach' ? (
              <DietCoachMock isPaused={!isInView || prefersReducedMotion} />
            ) : (
              <EmotionScannerMock isPaused={!isInView || prefersReducedMotion} />
            )}

            {/* Accessible Screen-Reader Description */}
            <span className="sr-only">
              {project.id === 'ai-diet-coach'
                ? 'Illustrative preview: the app scans a plate of food, shows an estimated calorie count of ~520 kcal and suggests what to add or remove.'
                : 'Illustrative preview: real-time webcam wireframe face tracking with emotion valence meters and an automated uplifting mood suggestion.'}
            </span>
          </div>
        )}
      </div>
    </article>
  )
}

/**
 * Closing Panel: "More projects are being added"
 */
function MoreComingPanel({ onBackClick }) {
  return (
    <article className="more-coming-panel" aria-label="More projects announcement">
      <div className="more-coming-panel__content">
        {/* Pulsing Line Animation Header */}
        <div className="more-coming-panel__signal" aria-hidden="true">
          <span className="more-coming-panel__dot" />
          <span className="more-coming-panel__dot" />
          <span className="more-coming-panel__dot" />
        </div>

        <h2 className="more-coming-panel__heading">
          <span className="more-coming-panel__lead">More projects</span>
          <span className="more-coming-panel__accent">are being added</span>
        </h2>

        <p className="more-coming-panel__desc">
          New builds land here as they ship.
        </p>

        {/* 2 Skeleton Project Cards with Shimmering Lines */}
        <div className="more-coming-panel__skeletons" aria-hidden="true">
          <div className="skeleton-card">
            <div className="skeleton-card__top">
              <span className="skeleton-line skeleton-line--tag" />
              <span className="skeleton-line skeleton-line--dot" />
            </div>
            <span className="skeleton-line skeleton-line--title" />
            <span className="skeleton-line skeleton-line--text" />
            <span className="skeleton-line skeleton-line--text-short" />
            <div className="skeleton-card__visual" />
          </div>

          <div className="skeleton-card">
            <div className="skeleton-card__top">
              <span className="skeleton-line skeleton-line--tag" />
              <span className="skeleton-line skeleton-line--dot" />
            </div>
            <span className="skeleton-line skeleton-line--title" />
            <span className="skeleton-line skeleton-line--text" />
            <span className="skeleton-line skeleton-line--text-short" />
            <div className="skeleton-card__visual" />
          </div>
        </div>

        <button
          type="button"
          onClick={onBackClick}
          className="more-coming-panel__btn"
        >
          <span aria-hidden="true">←</span>
          <span>Back to Featured Work</span>
        </button>
      </div>
    </article>
  )
}

/**
 * Main Projects Page
 */
export default function ProjectsPage() {
  const stackWrapRef = useRef(null)
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)
  const { goBackToFeatured } = useNavigation()

  // Reduced motion detection
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setPrefersReducedMotion(mq.matches)
    const handler = () => setPrefersReducedMotion(mq.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  // Sticky stacking scroll scrub animations (desktop only)
  useEffect(() => {
    if (prefersReducedMotion || window.innerWidth < 900) return

    const stackWrap = stackWrapRef.current
    if (!stackWrap) return

    const panels = Array.from(stackWrap.querySelectorAll('.project-panel'))
    const triggers = []

    panels.forEach((panel, i) => {
      // Don't scale down the very last panel in stack
      if (i === panels.length - 1) return

      const nextPanel = panels[i + 1]
      if (!nextPanel) return

      const tr = ScrollTrigger.create({
        trigger: nextPanel,
        start: 'top 85%',
        end: 'top 15%',
        scrub: true,
        onUpdate: (self) => {
          const progress = self.progress
          const scale = 1 - progress * 0.06 // scales down to 0.94
          const opacity = 1 - progress * 0.55 // gently dims
          panel.style.transform = `scale(${scale.toFixed(3)})`
          panel.style.opacity = opacity.toFixed(3)
        },
      })
      triggers.push(tr)
    })

    return () => {
      triggers.forEach((tr) => tr.kill())
    }
  }, [prefersReducedMotion])

  return (
    <CollectionPage
      eyebrowNum="01"
      eyebrowLabel="PROJECTS"
      titleLead="Things I've"
      titleAccent="Built"
      subtitle="AI products built to be genuinely useful."
      documentTitle="Projects | Abdul Parveez"
      nextPage={{ label: 'Experience', route: '/experience' }}
    >
      <div ref={stackWrapRef} className="projects-stack">
        {PROJECTS_DATA.map((project, index) => (
          <ProjectPanel
            key={project.id}
            project={project}
            index={index}
            isEven={index % 2 === 1}
            prefersReducedMotion={prefersReducedMotion}
          />
        ))}

        {moreComing && (
          <MoreComingPanel onBackClick={goBackToFeatured} />
        )}
      </div>
    </CollectionPage>
  )
}

