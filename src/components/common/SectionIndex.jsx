import React, { useEffect, useRef } from 'react'
import { SITE } from '../../config/site'
import { useSmoothScroll } from '../../context/SmoothScrollContext'
import './SectionIndex.css'

export default function SectionIndex() {
  const {
    activeSectionIndex,
    activeTheme,
    scrollTo,
    subscribeProgress,
  } = useSmoothScroll()

  // References to line segment progress fills for 01..05
  const segmentRefs = useRef([])

  useEffect(() => {
    // Unsubscribe functions
    const unsubs = []

    SITE.sectionIndex.forEach((item, idx) => {
      const unsub = subscribeProgress(item.id, (progress) => {
        const fillEl = segmentRefs.current[idx]
        if (fillEl) {
          // Clamp progress 0..1 and update scaleY on GPU thread
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
      }`}
      aria-label="Section Index"
    >
      <nav className="section-index__list">
        {SITE.sectionIndex.map((item, idx) => {
          const isActive = activeSectionIndex === item.index
          const isLast = idx === SITE.sectionIndex.length - 1

          return (
            <div key={item.index} className="section-index__step">
              {/* Number Item */}
              <button
                type="button"
                onClick={(e) => handleClick(e, item.id)}
                className={`section-index__btn ${isActive ? 'section-index__btn--active' : ''}`}
                aria-label={`Jump to ${item.index} ${item.label}`}
                aria-current={isActive ? 'step' : undefined}
              >
                <span className="section-index__num">{item.index}</span>
              </button>

              {/* Vertical line segment between numbers */}
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
