/**
 * Global Site Configuration
 * Central single source of truth for name, monogram, tagline, navigation, and section indices.
 */
export const SITE = {
  name: 'Abdul Parveez',
  nameUpper: 'ABDUL PARVEEZ',
  monogram: 'AP',
  tagline: 'AI Web Dev & Data Enthusiast',
  domain: 'AbdulParvez.in',

  // Top navigation links
  nav: [
    { id: 'about', label: 'ABOUT', href: '#about' },
    { id: 'projects', label: 'PROJECTS', href: '#projects' },
    { id: 'experience', label: 'EXPERIENCE', href: '#experience' },
    { id: 'achievements', label: 'ACHIEVEMENTS', href: '#experience' },
    { id: 'contact', label: 'CONTACT', href: '#contact' },
  ],

  // Section Index (01 - 05) as specified in design brief & references
  sectionIndex: [
    { index: '01', id: 'about', label: 'About', targetTheme: 'light' },
    { index: '02', id: 'filler', label: 'Philosophy', targetTheme: 'dark' },
    { index: '03', id: 'projects', label: 'Projects', targetTheme: 'dark' },
    { index: '04', id: 'experience', label: 'Experience & Achievements', targetTheme: 'dark' },
    { index: '05', id: 'contact', label: 'Contact', targetTheme: 'dark' },
  ],

  // Social / external profiles
  socials: [
    { label: 'GitHub', href: 'https://github.com' },
    { label: 'LinkedIn', href: 'https://linkedin.com' },
    { label: 'Email', href: 'mailto:contact@abdulparvez.in' },
  ],
}
