/**
 * Featured Work Section Data
 * Card data for the three flagship pathways: Projects, Work Experience, and Semester Exchange.
 * Includes optional live item count checking against future data files.
 */

// If standalone data files for projects, experience, or exchange exist in the future,
// their arrays or counts can be imported here.
export const FEATURED_DATA = [
  {
    id: 'projects',
    index: '01',
    eyebrow: 'PROJECTS',
    title: "Things I've built",
    description: 'AI products, data work and web experiences, built end to end.',
    cta: 'View all projects',
    route: '/projects',
    count: null, // Will automatically display if provided or populated
  },
  {
    id: 'experience',
    index: '02',
    eyebrow: 'EXPERIENCE',
    title: "Where I've worked",
    description: 'Roles, responsibilities and the impact I\'ve made.',
    cta: 'View experience',
    route: '/experience',
    count: null,
  },
  {
    id: 'exchange',
    index: '03',
    eyebrow: 'SEMESTER EXCHANGE',
    title: 'A semester in Dubai',
    description: 'Studying abroad: the courses, the culture and what it changed.',
    cta: 'Read the story',
    route: '/exchange',
    count: null,
  },
]
