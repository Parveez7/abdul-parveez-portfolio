/**
 * ============================================================================
 * THE JOURNEY — Section 05 Data Schema (2022 -> 2026)
 * ============================================================================
 * Real timeline entries with optimized WebP assets in src/assets/journey/
 * and precomputed aspect ratios / layouts in src/data/journey-images.json.
 * ============================================================================
 */

import journeyImages from './journey-images.json';

export const JOURNEY_SECTION_META = {
  index: '05',
  eyebrow: 'JOURNEY',
  titleLine1: 'THE',
  titleLine2: 'Journey',
  subtitle: 'Moments, builds, and milestones from 2022 to 2026.',
  skipLabel: 'SKIP TIMELINE',
  skipTarget: '#contact',
};

const CANONICAL_CATEGORY_ORDER = [
  'University',
  'Projects',
  'Hackathons',
  'Research',
  'Exchange',
  'Leadership',
  'Milestones',
];

export const YEAR_MARKERS = {
  2022: 'THE BEGINNING',
  2023: 'FIRST WINS',
  2024: 'BUILDING & COMPETING',
  2025: 'RESEARCH & ABROAD',
  2026: 'THE GRADUATION',
};

export const JOURNEY_OUTRO = {
  eyebrow: 'CHAPTER 05 — COMPLETE',
  line: 'To be continued…',
  ctaLabel: 'CONTINUE',
  ctaTarget: '#contact',
};

export const JOURNEY_CAMERA_CONFIG = {
  /** Base scroll budget per entry in viewport heights (uniform ~100vh per card) */
  vhPerEntry: 100,
  /** Uniform weight since all cards are size 'major' */
  majorWeightMultiplier: 1.0,
  /** Extra viewport heights reserved at the end for the outro beat */
  outroVh: 85,
  /** Number of entries ahead of camera that remain visible in the depth field */
  maxVisibleAhead: 1.65,
  /** Number of entries behind camera before fading out completely */
  maxVisibleBehind: 0.95,
  /** Maximum subtle blur (px) applied to cards far in the distance */
  maxDepthBlurPx: 2.2,
};

const RAW_JOURNEY_ENTRIES = [
  {
    id: 'event-1',
    date: '2022', // TODO: confirm month, then add a full date
    displayDate: '2022',
    year: 2022,
    category: 'University',
    title: 'Joined Presidency University',
    description:
      'Took admission at Presidency University, the start of the journey toward a B.Tech in Computer Science & Engineering (AI & ML).',
    size: 'major',
    image: 'event-1.webp',
    imageType: 'photo',
    imageFocus: 'center 52%',
    imageAlt: 'Presidency University campus entrance in Bengaluru',
  },
  {
    id: 'event-2',
    date: '2023-04-27',
    displayDate: '27 APR 2023',
    year: 2023,
    category: 'Hackathons',
    title: "Winner, ProTatva'23",
    description: "Won ProTatva'23, held at RVIT, Bangalore.",
    size: 'major',
    image: 'event-2.webp',
    imageType: 'photo',
    imageFocus: 'center 28%',
    imageAlt: "Winning ProTatva'23 award on stage at RVIT Bangalore",
  },
  {
    id: 'event-3',
    date: '2023-05-11',
    displayDate: '11 MAY 2023',
    year: 2023,
    category: 'Hackathons',
    title: 'Top 10, Medcuore Innovation',
    description: 'Placed in the top 10 at Medcuore Innovation, held at IITM Research Park.', // TODO: confirm venue
    size: 'major',
    image: 'event-3.webp',
    imageType: 'certificate',
    imageFocus: 'center center',
    imageAlt: 'Certificate of Appreciation for Medcuore Tech Innovation Challenge at IITM Research Park',
  },
  {
    id: 'event-4',
    date: '2024-02-23',
    displayDate: '23 FEB 2024',
    year: 2024,
    category: 'Projects',
    title: 'First Prize, Techvolution Arduino',
    description: 'Won first prize at Techvolution Arduino at Presidency University.',
    size: 'major',
    image: 'event-4.webp',
    imageType: 'photo',
    imageFocus: 'center 34%',
    imageAlt: 'Receiving first prize on stage at Presidency University',
  },
  {
    id: 'event-5',
    date: '2024-03-01',
    displayDate: '01 MAR 2024',
    year: 2024,
    category: 'Hackathons',
    title: '2nd Place, ByteBash (Contestarium)',
    description: 'Secured second place at ByteBash (Contestarium), held at Presidency University.',
    size: 'major',
    image: 'event-5.webp',
    imageType: 'certificate',
    imageFocus: 'center center',
    imageAlt: 'Contestarium 2024 Winner Certificate for second position in ByteBash Software Hackathon',
  },
  {
    id: 'event-6',
    date: '2024-06-04',
    displayDate: '04 JUN 2024',
    year: 2024,
    category: 'Projects',
    title: 'Best Project, Innovative Projects Expo',
    description:
      'Awarded Best Technology Project for "Combining Fish & Plant Farming Using Hydroponics & Aquaponics" at Presidency University.',
    size: 'major',
    image: 'event-6.webp',
    imageType: 'certificate',
    imageFocus: 'center center',
    imageAlt: 'Certificate of Appreciation for Best Technology Project at 4th Innovative Project Expo 2024',
  },
  {
    id: 'event-7',
    date: '2024-09-03',
    displayDate: '03 SEP 2024',
    year: 2024,
    category: 'Hackathons',
    title: 'Second Prize, Internal Smart India Hackathon',
    description: 'Won second prize in the Internal Smart India Hackathon.',
    size: 'major',
    image: 'event-7.webp',
    imageType: 'photo',
    imageFocus: 'center 38%',
    imageAlt: 'Won second prize in the Internal Smart India Hackathon',
  },
  {
    id: 'event-8',
    date: '2024-09-13',
    displayDate: '13 SEP 2024',
    year: 2024,
    category: 'Research',
    title: 'Patent Published',
    description:
      'Published a patent on an integrated aquaponics system for sustainable food production.',
    size: 'major',
    image: 'event-8.webp',
    imageType: 'certificate',
    imageFocus: 'center center',
    imageAlt: 'Official patent publication document for integrated aquaponics system',
  },
  {
    id: 'event-9',
    date: '2025-01-25',
    displayDate: '25 JAN 2025',
    year: 2025,
    category: 'Research',
    title: 'IEEE Paper Presented at MIT Bengaluru',
    description:
      'Presented the research paper "Super-Resolution Generative Adversarial Networks: A Comprehensive Study on Image Quality Enhancement" at MIT Bengaluru.',
    size: 'major',
    image: 'event-9.webp',
    imageType: 'photo',
    imageFocus: '60% 35%',
    imageAlt: 'Presenting IEEE research paper at Manipal Institute of Technology Bengaluru',
  },
  {
    id: 'event-10',
    date: '2025-09-19',
    displayDate: '19 SEP 2025',
    year: 2025,
    category: 'Exchange',
    title: 'Student Exchange at Ajman University',
    description: 'Selected for an international student exchange semester in Dubai, UAE.',
    size: 'major',
    image: 'event-10.webp',
    imageType: 'photo',
    imageFocus: '58% 36%',
    imageAlt: 'Abdul Parveez in Dubai in front of the Burj Khalifa during student exchange',
  },
  {
    id: 'event-11',
    date: '2026-08',
    displayDate: 'AUG 2026',
    year: 2026,
    category: 'Milestones',
    title: 'Graduating, B.Tech CSE (AI & ML)',
    description:
      'Completing a Bachelor of Technology in Computer Science & Engineering (AI & ML) at Presidency University.',
    size: 'major',
    image: 'event-11.webp', // TODO: replace with graduation photo
    imageType: 'photo',
    imageFocus: 'center center',
    imageAlt: 'Graduating with B.Tech in Computer Science and Engineering (AI & ML)',
  },
];

export const JOURNEY_ENTRIES = RAW_JOURNEY_ENTRIES.map((entry, idx) => {
  const imgMeta = journeyImages[entry.id] || null;
  const aspect = imgMeta ? imgMeta.aspect : 0.85;
  const layout = imgMeta ? imgMeta.layout : aspect <= 1.15 ? 'side' : 'top';
  return {
    ...entry,
    index: idx,
    catalogueNumber: `No. ${String(idx + 1).padStart(2, '0')}`,
    hasRealImage: Boolean(imgMeta),
    imageMeta: imgMeta,
    layout,
  };
});

/**
 * Dynamically derive the visible category list and each category's year range
 * from JOURNEY_ENTRIES, preserving canonical order and hiding empty categories.
 */
export const JOURNEY_CATEGORIES = CANONICAL_CATEGORY_ORDER.filter((cat) =>
  JOURNEY_ENTRIES.some((entry) => entry.category === cat)
);

export const CATEGORY_META = JOURNEY_CATEGORIES.map((id) => {
  const matching = JOURNEY_ENTRIES.filter((entry) => entry.category === id);
  const years = matching.map((entry) => entry.year);
  const minYear = Math.min(...years);
  const maxYear = Math.max(...years);
  return {
    id,
    label: id,
    years: minYear === maxYear ? `${minYear}` : `${minYear} – ${maxYear}`,
  };
});

/**
 * Helper: find the first entry index for a given category
 */
export function getFirstEntryIndexByCategory(category) {
  return JOURNEY_ENTRIES.findIndex((entry) => entry.category === category);
}
