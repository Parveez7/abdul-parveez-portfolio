import React from 'react'
import { useSmoothScroll } from '../../context/SmoothScrollContext'
import './ScrollCue.css'

export default function ScrollCue({
  variant = 'centered', // 'centered' | 'left'
  label,
  className = '',
}) {
  const { isScrolled, activeTheme } = useSmoothScroll()

  // Default labels based on variant
  const textLabel = label || (variant === 'left' ? 'SCROLL TO EXPLORE' : 'SCROLL')

  return (
    <div
      className={`scroll-cue scroll-cue--${variant} ${
        activeTheme === 'light' ? 'scroll-cue--light' : 'scroll-cue--dark'
      } ${isScrolled ? 'scroll-cue--hidden' : ''} ${className}`}
      aria-hidden="true"
    >
      {/* Mouse Icon */}
      <div className="scroll-cue__mouse">
        <div className="scroll-cue__wheel" />
      </div>

      {/* Label Text */}
      <span className="scroll-cue__label">{textLabel}</span>

      {/* Trailing vertical or horizontal accent line */}
      {variant === 'centered' ? (
        <div className="scroll-cue__line-vert" />
      ) : (
        <div className="scroll-cue__line-horiz" />
      )}
    </div>
  )
}
