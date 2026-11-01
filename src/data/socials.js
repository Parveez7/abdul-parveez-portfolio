/**
 * Social Links & Orbit Items Data Configuration
 * Single source of truth for the 3D Social Icons in Section 06 (Connect).
 * Ordered left-to-right matching the celestial arc layout.
 */
import { SITE } from '../config/site'

export const SOCIAL_LINKS = [
  {
    id: 'email',
    label: 'EMAIL',
    handle: SITE.email,
    url: `mailto:${SITE.email}`,
    color: '#FFFFFF',
    type: 'contact',
  },
  {
    id: 'github',
    label: 'GITHUB',
    handle: 'Parveez7',
    url: 'https://github.com/Parveez7',
    color: '#FFFFFF',
    type: 'social',
  },
  {
    id: 'instagram',
    label: 'INSTAGRAM',
    handle: '@abdul_parzzzz',
    url: 'https://www.instagram.com/abdul_parzzzz/',
    color: '#E1306C',
    type: 'social',
  },
  {
    id: 'linkedin',
    label: 'LINKEDIN',
    handle: 'abdul-parveez',
    url: 'https://www.linkedin.com/in/abdul-parveez/',
    color: '#0A66C2',
    type: 'social',
  },
  {
    id: 'x',
    label: 'X (TWITTER)',
    handle: '@par_veez',
    url: 'https://x.com/par_veez',
    color: '#FFFFFF',
    type: 'social',
  },
]
