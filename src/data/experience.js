/**
 * ============================================================================
 * EXPERIENCE DATA
 * ============================================================================
 * Production data for the /experience showcase (most recent first).
 * Missing dates and institution are preserved as null with explicit TODO markers.
 * ============================================================================
 */

export const EXPERIENCE_DATA = [
  {
    id: 'ton-technology-services',
    index: '01',
    organisation: 'TON Technology Services',
    role: 'AI Tech Intern',
    start: null,
    end: null, // TODO: add dates (display "Internship" instead of dates while null)
    summary:
      'Worked as the product expert, developing new features and data-related features, and turning client and stakeholder needs into clear analysis.',
    responsibilities: [
      'Product expert: developing new features',
      'Developing data-related features',
      'Cleaning data',
      'Analysing data',
      'Building data pipelines',
      'Understanding client needs',
      'Understanding stakeholder needs and presenting data accordingly',
      'Developing analysis dashboards',
    ],
    tags: ['Data Analysis', 'Data Pipelines', 'Dashboards', 'Product'],
  },
  {
    id: 'sigma-club',
    index: '02',
    organisation: 'Sigma Club',
    role: 'Founder & President',
    start: '2024',
    end: '2025',
    summary:
      'Created Sigma Club, an AI mobile app creation club, led it as president for one year, scaled it, then handed the presidency over to a successor.',
    milestones: [
      'Created the club (2024)',
      'Served as president (2024-2025)',
      'Scaled the club',
      'Handed over the presidency',
    ],
    tags: ['Leadership', 'AI', 'Mobile Apps', 'Community'], // TODO: add the institution if I want it shown
  },
]

