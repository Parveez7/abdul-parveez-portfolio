/**
 * ============================================================================
 * TECHNICAL ARSENAL — Section 05 Data
 * ============================================================================
 * Categorized skills spec sheet and marquee tool definitions.
 * All domain and unique tool counts are computed programmatically below.
 */

export const SKILL_CATEGORIES = [
  {
    id: 'ai-frameworks',
    index: '01',
    title: 'AI Frameworks',
    items: [
      'LLM APIs',
      'MCP',
      'LangGraph',
      'LangChain',
      'RAG',
      'ChromaDB',
      'Tavily',
      'Exa Search',
      'Temporal',
      'WebLLM',
      'ONNX Runtime',
      'Multi-Agent Workflows',
      'Voice Agents',
    ],
  },
  {
    id: 'ml-deep-learning',
    index: '02',
    title: 'ML & Deep Learning',
    items: [
      'OpenCV',
      'CNNs',
      'GANs',
      'Model Fine-tuning',
    ],
  },
  {
    id: 'frontend-dev',
    index: '03',
    title: 'Frontend Development',
    items: [
      'Next.js',
      'React',
      'Three.js',
      'Tailwind CSS',
      'shadcn/ui',
      'Framer Motion',
      'Lenis',
      'GSAP',
      'Custom Tkinter',
    ],
  },
  {
    id: 'backend-eng',
    index: '04',
    title: 'Backend Engineering',
    items: [
      'TypeScript',
      'Python',
      'FastAPI',
      'PHP',
      'Next.js',
      'Node.js',
      'REST APIs',
      'PostgreSQL',
      'MySQL',
      'Supabase',
      'Redis',
    ],
  },
  {
    id: 'data-eng',
    index: '05',
    title: 'Data Engineering',
    items: [
      'Pandas',
      'Polars',
      'Airflow DAGs',
      'Selenium',
      'Distributed Orchestration',
      'Real-time Streaming',
      'Anti-bot Evasion',
      'Data Cleaning',
    ],
  },
  {
    id: 'data-analysis',
    index: '06',
    title: 'Data Analysis',
    items: [
      'SQL',
      'Python (Pandas, NumPy)',
      'Excel',
      'Power BI',
      'Tableau',
      'Statistics',
      'Data Visualization',
      'Exploratory Data Analysis (EDA)',
      'Data Cleaning',
      'Git & GitHub',
    ],
  },
]

/**
 * 24 curated tools for the slow, seamless two-row monochrome marquee.
 * Each tool maps to its official icon from `simple-icons` or falls back to
 * an editorial typographic wordmark if no SVG icon is available.
 */
export const MARQUEE_TOOLS = [
  // Row 1: Core Languages, Full-Stack & AI Frameworks (scrolling left, ~70s)
  [
    { name: 'Python', iconKey: 'siPython' },
    { name: 'TypeScript', iconKey: 'siTypescript' },
    { name: 'React', iconKey: 'siReact' },
    { name: 'Next.js', iconKey: 'siNextdotjs' },
    { name: 'Node.js', iconKey: 'siNodedotjs' },
    { name: 'FastAPI', iconKey: 'siFastapi' },
    { name: 'PostgreSQL', iconKey: 'siPostgresql' },
    { name: 'Supabase', iconKey: 'siSupabase' },
    { name: 'Redis', iconKey: 'siRedis' },
    { name: 'Tailwind CSS', iconKey: 'siTailwindcss' },
    { name: 'LangChain', iconKey: 'siLangchain' },
    { name: 'Git', iconKey: 'siGit' },
  ],
  // Row 2: Animation, Data Systems, Computer Vision & Analytics (scrolling right, ~90s)
  [
    { name: 'Three.js', iconKey: 'siThreedotjs' },
    { name: 'GSAP', iconKey: 'siGsap' },
    { name: 'Pandas', iconKey: 'siPandas' },
    { name: 'NumPy', iconKey: 'siNumpy' },
    { name: 'OpenCV', iconKey: 'siOpencv' },
    { name: 'Selenium', iconKey: 'siSelenium' },
    { name: 'MySQL', iconKey: 'siMysql' },
    { name: 'Airflow', iconKey: 'siApacheairflow' },
    { name: 'Temporal', iconKey: 'siTemporal' },
    { name: 'Power BI', iconKey: null, wordmark: 'POWER BI' },
    { name: 'Tableau', iconKey: null, wordmark: 'TABLEAU' },
    { name: 'GitHub', iconKey: 'siGithub' },
  ],
]

/**
 * Computed metadata derived dynamically from the dataset:
 * - `TOTAL_DOMAINS`: Number of domains (e.g. 6)
 * - `TOTAL_UNIQUE_SKILLS`: Number of unique items de-duplicated case-insensitively (e.g. 53)
 */
export const TOTAL_DOMAINS = SKILL_CATEGORIES.length

const uniqueToolSet = new Set(
  SKILL_CATEGORIES.flatMap((c) => c.items).map((s) => s.trim().toLowerCase())
)
export const TOTAL_UNIQUE_SKILLS = uniqueToolSet.size

export const SKILLS_STATS = {
  domainsCount: TOTAL_DOMAINS,
  domainsLabel: String(TOTAL_DOMAINS).padStart(2, '0') + ' DOMAINS',
  toolsCount: TOTAL_UNIQUE_SKILLS,
  toolsLabel: String(TOTAL_UNIQUE_SKILLS).padStart(2, '0') + ' TOOLS',
  headlineStats: `${String(TOTAL_DOMAINS).padStart(2, '0')} DOMAINS · ${String(TOTAL_UNIQUE_SKILLS).padStart(2, '0')} TOOLS`,
}
