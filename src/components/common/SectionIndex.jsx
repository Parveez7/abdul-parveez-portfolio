import React, { useEffect, useRef } from 'react'
import { SITE } from '../../config/site'
import { useSmoothScroll } from '../../context/SmoothScrollContext'
import './SectionIndex.css'

export default function SectionIndex() {
  const {
    activeSection,
    activeSectionIndex,
    activeTheme,
    isChromeHidden,
    scrollTo,
    subscribeProgress,
  } = useSmoothScroll()

  // References to line segment progress fills for 01..05
  const segmentRefs = useRef([])
  // Automatically hide sidebar slider on Hero and final Contact / Connect section
  const isHidden = activeSection === 'hero' || activeSection === 'contact' || isChromeHidden

  useEffect(() => {
    const unsubs = []

    SITE.sectionIndex.forEach((item, idx) => {
      const unsub = subscribeProgress(item.id, (progress) => {
        const fillEl = segmentRefs.current[idx]
        if (fillEl) {
          const clamped = Math.max(0, Math.min(1, progress || 0))
          fillEl.style.transform = `scaleY(${clamped})`
        }
      })
      unsubs.push(unsub)
    })

    return () => {
      unsubs.forEach((fn) => fn && fn())
    }
  }, [subscribeProgress])

  const handleClick = (e, id) => {
    e.preventDefault()
    scrollTo(`#${id}`)
  }

  return (
    <aside
      className={`section-index ${
        activeTheme === 'light' ? 'section-index--light' : 'section-index--dark'
      } ${isHidden ? 'section-index--hidden' : ''}`}
      aria-label="Section Index"
      aria-hidden={isHidden}
    >
      <nav className="section-index__list">
        {SITE.sectionIndex.map((item, idx) => {
          const isActive = activeSectionIndex === item.index
          const isCompleted =
            parseInt(item.index, 10) < parseInt(activeSectionIndex, 10)
          const isLast = idx === SITE.sectionIndex.length - 1

          return (
            <div key={item.index} className="section-index__step">
              <button
                type="button"
                onClick={(e) => handleClick(e, item.id)}
                className={`section-index__btn ${
                  isActive ? 'section-index__btn--active' : ''
                } ${isCompleted ? 'section-index__btn--completed' : ''}`}
                aria-label={`Jump to ${item.index} ${item.label}${
                  isCompleted ? ' (completed)' : ''
                }`}
                aria-current={isActive ? 'step' : undefined}
              >
                <span className="section-index__num">{item.index}</span>
              </button>

              {!isLast && (
                <div className="section-index__track">
                  <div
                    ref={(el) => (segmentRefs.current[idx] = el)}
                    className={`section-index__fill ${
                      isActive ? 'section-index__fill--active' : ''
                    }`}
                  />
                </div>
              )}
            </div>
          )
        })}
      </nav>
    </aside>
  )
}
