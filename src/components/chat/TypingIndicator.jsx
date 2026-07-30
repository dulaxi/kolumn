import { useState } from 'react'
import LetterWave from '../ui/LetterWave'
import KolumnLogo from '../layout/KolumnLogo'

// Kanban-brain thinking words — the board thinking about itself.
// One is picked per response (no immediate repeats) and rendered as a
// letter wave whose lit window flashes logo olive → mauve.
// Decision trail: docs/design-mockups/typing-indicator-words.html.
const THINKING_WORDS = [
  'Organizing',
  'Prioritizing',
  'Triaging',
  'Sorting',
  'Shuffling',
  'Scoping',
  'Sprinting',
  'Grooming',
  'Backlogging',
  'Roadmapping',
  'Milestoning',
  'Timeboxing',
  'Batching',
  'Unblocking',
  'Delegating',
  'Shipping',
  'Estimating',
  'Kanbanning',
]

// Module-level so remounts (new responses) never repeat the last word.
let lastWord = null
function pickWord() {
  let word
  do {
    word = THINKING_WORDS[Math.floor(Math.random() * THINKING_WORDS.length)]
  } while (word === lastWord)
  lastWord = word
  return word
}

export default function TypingIndicator() {
  // One word per mount — each response gets a fresh pick, but the word
  // stays stable while its response streams.
  const [word] = useState(pickWord)
  return (
    <div
      role="status"
      aria-label="Kolumn is thinking"
      className="flex items-center gap-2 py-3 pl-1 text-sm font-medium"
    >
      <KolumnLogo size={14} />
      <LetterWave text={`${word}…`} tone="typing" />
    </div>
  )
}
