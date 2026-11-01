/**
 * Global Site Configuration
 * Central single source of truth for name, monogram, tagline, navigation, and section indices.
 */
export const SITE = {
  name: 'Abdul Parveez',
  nameUpper: 'ABDUL PARVEEZ',
  monogram: 'AP',
  tagline: 'AI Developer · Data Enthusiast · Builder',
  heroTagline: 'Developer - Data Intelligence',
  domain: 'abdulparveez.com',
  email: 'contact@abdulparvez.in',
  calendarUrl: 'https://cal.com',

  // Top navigation links (matches design: Home, About, Skills, Work, Journey + Connect CTA)
  nav: [
    { id: 'hero', label: 'Home', href: '#hero' },
    { id: 'about', label: 'About', href: '#about' },
    { id: 'skills', label: 'Skills', href: '#skills' },
    { id: 'projects', label: 'Work', href: '#projects' },
    { id: 'experience', label: 'Journey', href: '#experience' },
  ],

  // Header Call To Action button
  cta: {
    id: 'contact',
    label: 'Connect',
    href: '#contact',
  },

  // Section Index (01 - 06) as specified in design brief & references
  sectionIndex: [
    { index: '01', id: 'about', label: 'About', targetTheme: 'light' },
    { index: '02', id: 'filler', label: 'Philosophy', targetTheme: 'dark' },
    { index: '03', id: 'skills', label: 'Technical Arsenal', targetTheme: 'dark' },
    { index: '04', id: 'projects', label: 'Featured Work', targetTheme: 'dark' },
    { index: '05', id: 'experience', label: 'Journey', targetTheme: 'dark' },
    { index: '06', id: 'contact', label: 'Connect', targetTheme: 'dark' },
  ],

  // Social / external profiles
  socials: [
    { label: 'GitHub', href: 'https://github.com' },
    { label: 'LinkedIn', href: 'https://linkedin.com' },
    { label: 'Email', href: 'mailto:contact@abdulparvez.in' },
  ],
}
