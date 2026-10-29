import { useEffect } from 'react'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useSmoothScroll } from '../context/SmoothScrollContext'

/**
 * Attaches a GSAP ScrollTrigger to track active theme, active section index, and 0..1 progress.
 *
 * @param {React.RefObject} sectionRef - Reference to the section DOM node
 * @param {Object} options
 * @param {string} options.id - Section ID (e.g. 'hero', 'about', 'filler')
 * @param {'dark'|'light'} options.theme - Visual theme ('dark' or 'light')
 * @param {string} options.index - Section index string ('01'..'05')
 */
export function useSectionScrollTrigger(sectionRef, { id, theme = 'dark', index = '01' }) {
  const {
    setActiveTheme,
    setActiveSection,
    setActiveSectionIndex,
    updateProgress,
  } = useSmoothScroll()

  useEffect(() => {
    const el = sectionRef.current
    if (!el) return

    const trigger = ScrollTrigger.create({
      trigger: el,
      start: 'top 45%',
      end: 'bottom 45%',
      onEnter: () => {
        setActiveTheme(theme)
        setActiveSection(id)
        if (index) setActiveSectionIndex(index)
      },
      onEnterBack: () => {
        setActiveTheme(theme)
        setActiveSection(id)
        if (index) setActiveSectionIndex(index)
      },
      onUpdate: (self) => {
        updateProgress(id, self.progress)
      },
    })

    return () => {
      trigger.kill()
    }
  }, [id, theme, index, sectionRef, setActiveTheme, setActiveSection, setActiveSectionIndex, updateProgress])
}
