/**
 * Featured Work Section Data
 * Card data for the three flagship pathways: Projects, Work Experience, and Semester Exchange.
 * Includes live item counts derived from projects.js and experience.js.
 */

import { PROJECTS_DATA } from './projects'
import { EXPERIENCE_DATA } from './experience'

export const FEATURED_DATA = [
  {
    id: 'projects',
    index: '01',
    eyebrow: 'PROJECTS',
    title: "Things I've built",
    description: 'AI products, data work and web experiences, built end to end.',
    cta: 'View all projects',
    route: '/projects',
    count: `${PROJECTS_DATA.length} projects`,
  },
  {
    id: 'experience',
    index: '02',
    eyebrow: 'EXPERIENCE',
    title: "Where I've worked",
    description: 'Roles, responsibilities and the impact I\'ve made.',
    cta: 'View experience',
    route: '/experience',
    count: `${EXPERIENCE_DATA.length} roles`,
  },
  {
    id: 'exchange',
    index: '03',
    eyebrow: 'SEMESTER EXCHANGE',
    title: 'A semester in Dubai',
    description: 'Studying abroad: the courses, the culture and what it changed.',
    cta: 'Read the story',
    route: '/exchange',
    count: '1 semester',
  },
]
