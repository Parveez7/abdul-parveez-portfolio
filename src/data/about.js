/**
 * About Section Data
 * Central single source of truth for the About statements, beats, and emphasis.
 */

export const ABOUT_DATA = {
  eyebrow: {
    number: '01',
    label: 'ABOUT ME',
  },

  // Exactly as requested in prompt
  statements: [
    'I build web applications and products, transform data into meaningful insights, and turn ideas into reality.',
    'Leveraging AI to build faster, work smarter, streamline workflows, and deliver impactful results.',
  ],

  // Key emphasis phrases that finish in full ink (#121212)
  emphasisPhrases: [
    'web applications and products',
    'meaningful insights',
    'ideas into reality',
    'AI',
    'faster',
    'impactful results',
  ],

  // Explicit word ranges for emphasis (indices 0..28 across both statements)
  emphasisRanges: [
    [2, 5],   // 'web applications and products'
    [9, 10],  // 'meaningful insights'
    [13, 15], // 'ideas into reality'
    [17, 17], // 'AI'
    [20, 20], // 'faster'
    [27, 28], // 'impactful results'
  ],

  // Equal reading time per pose (130vh pinned scroll per segment, ~390vh total)
  beats: [
    {
      id: 'beat1',
      pose: 'pose1', // working-laptop
      label: 'Pose 1: Working',
      wordRange: [0, 10], // 11 words: "I build web applications and products, transform data into meaningful insights,"
      text: 'I build web applications and products, transform data into meaningful insights,',
    },
    {
      id: 'beat2',
      pose: 'pose2', // thinking
      label: 'Pose 2: Thinking',
      wordRange: [11, 20], // 10 words: "and turn ideas into reality. Leveraging AI to build faster,"
      text: 'and turn ideas into reality. Leveraging AI to build faster,',
    },
    {
      id: 'beat3',
      pose: 'pose3', // analyzing-tablet
      label: 'Pose 3: Analyzing',
      wordRange: [21, 28], // 8 words: "work smarter, streamline workflows, and deliver impactful results."
      text: 'work smarter, streamline workflows, and deliver impactful results.',
    },
  ],
}

