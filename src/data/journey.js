/**
 * ============================================================================
 * THE JOURNEY — Section 04 Data & Configuration
 * ============================================================================
 *
 * HOW TO REPLACE PLACEHOLDERS WITH REAL CONTENT:
 * 1. Edit the entries in `JOURNEY_ENTRIES` below with your real dates, titles,
 *    and descriptions. Set `placeholder: false` on each updated entry so the
 *    dev-mode console summary knows it is finalized.
 * 2. Drop your real image files into `src/assets/journey/` named after the
 *    entry's `id` (e.g. `src/assets/journey/uni-admission-2022.webp` or `.jpg`/`.png`).
 *    The component auto-detects matching filenames via `import.meta.glob` and
 *    replaces the SVG placeholder automatically without any code changes!
 * 3. Use `imageType: "photo"` for photography (uses `object-fit: cover` with
 *    `imageFocus`) or `imageType: "certificate"` for portrait/landscape
 *    certificates and documents (rendered on an ivory mat).
 * 4. Set `size: "major"` (~550x290 at focus, +30% scroll dwell) for key
 *    milestones, or `size: "minor"` (~400x210 at focus) for regular entries.
 */

export const JOURNEY_CATEGORIES = [
  'University',
  'Projects',
  'Hackathons',
  'Research',
  'Exchange',
  'Leadership',
  'Milestones',
]

export const YEAR_MARKERS = {
  2022: 'THE BEGINNING',
  2023: 'FOUNDATIONS & CODE',
  2024: 'RESEARCH & VELOCITY',
  2025: 'GLOBAL HORIZONS',
  2026: 'THE CULMINATION',
}

/**
 * Closing / Outro frame copy displayed after the final milestone recedes.
 */
export const JOURNEY_OUTRO = {
  eyebrow: 'CHAPTER 04 — COMPLETE',
  closingLine: 'To be continued...',
  ctaLabel: 'CONTINUE',
  placeholder: true,
}

/**
 * 14 chronological entries (2022 -> 2026) organized sequentially through the
 * 7 journey chapters (2 entries per chapter) so the left timeline legend
 * moves smoothly and strictly downwards without jumping back and forth.
 */
export const JOURNEY_ENTRIES = [
  // 1. Chapter 1: University (2022)
  {
    id: 'uni-admission-2022',
    date: '2022-08',
    year: 2022,
    category: 'University',
    title: 'Matriculation in Computer Science',
    description:
      'Began undergraduate studies in Computer Science & Engineering, laying theoretical foundations in algorithms, linear algebra, and systems programming.',
    imageType: 'photo',
    imageFocus: 'center center',
    size: 'major',
    placeholder: true,
  },
  {
    id: 'uni-deans-merit-2022',
    date: '2022-12',
    year: 2022,
    category: 'University',
    title: 'Academic Foundations & Dean’s List',
    description:
      'Recognized in the top tier of the cohort for academic excellence in discrete mathematics, data structures, and computer organization.',
    imageType: 'certificate',
    imageFocus: 'center center',
    size: 'minor',
    placeholder: true,
  },

  // 2. Chapter 2: Projects (2022–2023)
  {
    id: 'proj-first-web-2022',
    date: '2023-01',
    year: 2023,
    category: 'Projects',
    title: 'Campus Resource & Study Archiver',
    description:
      'Designed and shipped a full-stack web utility for indexing course notes and past papers, adopted by over 300 first-year students.',
    imageType: 'photo',
    imageFocus: 'center top',
    size: 'minor',
    placeholder: true,
  },
  {
    id: 'proj-telemetry-engine-2023',
    date: '2023-05',
    year: 2023,
    category: 'Projects',
    title: 'Predictive Anomaly Analytics Suite',
    description:
      'Developed an interactive streaming dashboard and time-series forecasting engine capable of processing 50k events per second.',
    imageType: 'photo',
    imageFocus: 'center top',
    size: 'minor',
    placeholder: true,
  },

  // 3. Chapter 3: Hackathons (2023–2024)
  {
    id: 'hack-regional-sprint-2023',
    date: '2023-08',
    year: 2023,
    category: 'Hackathons',
    title: 'Regional 36-Hour AI Build Sprint',
    description:
      'Built an automated document summarization pipeline under tight latency constraints, placing among the top finalists out of 60+ teams.',
    imageType: 'photo',
    imageFocus: 'center center',
    size: 'minor',
    placeholder: true,
  },
  {
    id: 'hack-national-winner-2024',
    date: '2024-02',
    year: 2024,
    category: 'Hackathons',
    title: 'First Place, National Innovation Hackathon',
    description:
      'Engineered a real-time multimodal accessibility assistant during a 48-hour national competition, winning the grand jury prize.',
    imageType: 'photo',
    imageFocus: 'center center',
    size: 'major',
    placeholder: true,
  },

  // 4. Chapter 4: Research (2024)
  {
    id: 'cert-ml-foundations-2024',
    date: '2024-05',
    year: 2024,
    category: 'Research',
    title: 'Deep Learning & Neural Networks Distinction',
    description:
      'Completed advanced coursework and laboratory research in backpropagation, convolutional architectures, and optimization dynamics.',
    imageType: 'certificate',
    imageFocus: 'center center',
    size: 'minor',
    placeholder: true,
  },
  {
    id: 'res-vision-paper-2024',
    date: '2024-09',
    year: 2024,
    category: 'Research',
    title: 'Undergraduate Research Symposium Publication',
    description:
      'Co-authored and presented a paper on lightweight attention mechanisms for edge computer vision at the Inter-University Research Conclave.',
    imageType: 'certificate',
    imageFocus: 'center center',
    size: 'major',
    placeholder: true,
  },

  // 5. Chapter 5: Exchange (2025)
  {
    id: 'exch-dubai-semester-2025',
    date: '2025-02',
    year: 2025,
    category: 'Exchange',
    title: 'International Semester Exchange in Dubai',
    description:
      'Selected for a competitive international exchange term in Dubai, studying advanced AI ethics, smart-city data systems, and cross-cultural engineering.',
    imageType: 'photo',
    imageFocus: 'center center',
    size: 'major',
    placeholder: true,
  },
  {
    id: 'exch-global-collab-2025',
    date: '2025-05',
    year: 2025,
    category: 'Exchange',
    title: 'MENA Student Tech Forum Showcase',
    description:
      'Collaborated with an international cohort in Dubai to prototype urban mobility visualizers, presenting findings to industry mentors.',
    imageType: 'photo',
    imageFocus: 'center center',
    size: 'minor',
    placeholder: true,
  },

  // 6. Chapter 6: Leadership (2025)
  {
    id: 'lead-ai-society-2025',
    date: '2025-08',
    year: 2025,
    category: 'Leadership',
    title: 'Technical Lead, Collegiate AI Collective',
    description:
      'Organized weekly paper reading groups and hands-on PyTorch workshops for 120+ undergraduate members across departments.',
    imageType: 'photo',
    imageFocus: 'center top',
    size: 'minor',
    placeholder: true,
  },
  {
    id: 'lead-symposium-chair-2025',
    date: '2025-10',
    year: 2025,
    category: 'Leadership',
    title: 'Convener, Annual University Tech Expo',
    description:
      'Directed a 25-person organizing committee, hosting 40+ student project exhibitions, keynote panels, and live coding challenges.',
    imageType: 'photo',
    imageFocus: 'center top',
    size: 'minor',
    placeholder: true,
  },

  // 7. Chapter 7: Milestones (2026)
  {
    id: 'res-capstone-thesis-2026',
    date: '2026-02',
    year: 2026,
    category: 'Milestones',
    title: 'Senior Honours Capstone Defense',
    description:
      'Defended undergraduate thesis on retrieval-augmented agentic workflows and interpretable data synthesis before the faculty board.',
    imageType: 'photo',
    imageFocus: 'center center',
    size: 'minor',
    placeholder: true,
  },
  {
    id: 'mile-graduation-2026',
    date: '2026-05',
    year: 2026,
    category: 'Milestones',
    title: 'B.Tech Graduation & Honours Convocation',
    description:
      'Concluded four transformative years of engineering, research, and global exploration—stepping forward to build intelligent systems at scale.',
    imageType: 'photo',
    imageFocus: 'center center',
    size: 'major',
    placeholder: true,
  },
]

/**
 * Derived metadata for each category: count and active year range.
 */
export const CATEGORY_META = JOURNEY_CATEGORIES.reduce((acc, category) => {
  const matching = JOURNEY_ENTRIES.filter((e) => e.category === category)
  const years = matching.map((e) => e.year)
  const minYear = years.length ? Math.min(...years) : null
  const maxYear = years.length ? Math.max(...years) : null

  acc[category] = {
    category,
    count: matching.length,
    yearRange:
      minYear && maxYear
        ? minYear === maxYear
          ? `${minYear}`
          : `${minYear}–${maxYear}`
        : '',
  }
  return acc
}, {})
