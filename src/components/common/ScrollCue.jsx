import React from 'react'
import { useSmoothScroll } from '../../context/SmoothScrollContext'
import './ScrollCue.css'

export default function ScrollCue({
  variant = 'centered', // 'centered' | 'left'
  label,
  persistOnScroll = false,
  className = '',
}) {
  const { isScrolled, activeTheme } = useSmoothScroll()

  const textLabel = label || (variant === 'left' ? 'SCROLL TO EXPLORE' : 'SCROLL')
  const shouldHide = !persistOnScroll && variant === 'centered' && isScrolled

  return (
    <div
      className={`scroll-cue scroll-cue--${variant} ${
        activeTheme === 'light' || variant === 'left'
          ? 'scroll-cue--light'
          : 'scroll-cue--dark'
      } ${shouldHide ? 'scroll-cue--hidden' : ''} ${className}`}
      aria-hidden="true"
    >
      {/* Mouse Icon */}
      <div className="scroll-cue__mouse">
        <div className="scroll-cue__wheel" />
      </div>

      {/* Label Text */}
      <span className="scroll-cue__label">{textLabel}</span>

      {/* Trailing vertical or double-horizontal accent lines (matching reference) */}
      {variant === 'centered' ? (
        <div className="scroll-cue__line-vert" />
      ) : (
        <div className="scroll-cue__rules-horiz">
          <span className="scroll-cue__line-horiz" />
          <span className="scroll-cue__line-horiz scroll-cue__line-horiz--short" />
        </div>
      )}
    </div>
  )
}
