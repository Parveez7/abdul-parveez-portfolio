/**
 * ============================================================================
 * PROJECTS DATA
 * ============================================================================
 * Production data for the /projects showcase.
 * Missing links/tech stack are preserved as null with explicit TODO markers.
 * ============================================================================
 */

export const PROJECTS_DATA = [
  {
    id: 'ai-diet-coach',
    index: '01',
    title: 'AI Diet Coach',
    subtitle: 'Photo-based calorie tracker and diet app',
    description:
      "A diet and calorie-tracking app. Take a photo of whatever you're eating and it estimates the calories, then suggests what to add and what to remove from your meal.",
    steps: ['Snap', 'Identify', 'Estimate', 'Suggest'],
    tags: ['AI', 'Computer Vision', 'Health'],
    links: { live: null, github: null, case: null }, // TODO: add tech stack tags and links
  },
  {
    id: 'emotion-suggestion-app',
    index: '02',
    title: 'Emotion Suggestion App',
    subtitle: 'Real-time face emotion scanner',
    description:
      'A Python-based app that scans your face in real time and constantly tracks your emotion. As soon as it detects a negative emotion, it triggers a warning and tries to uplift your mood.',
    steps: ['Scan', 'Detect', 'Warn', 'Uplift'],
    tags: ['Python', 'Computer Vision', 'Real-time'],
    links: { live: null, github: null, case: null }, // TODO: add tech stack tags and links
  },
]

export const moreComing = true

