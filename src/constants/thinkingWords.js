// Kanban-brain thinking words — the board thinking about itself.
// Shared vocabulary for every "Kolumn is working" moment: the chat typing
// indicator and the Klay loaders all draw from this one list so the app
// speaks one language while it works.
// Decision trail: docs/design-mockups/typing-indicator-words.html.
export const THINKING_WORDS = [
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

// Module-level so remounts (new responses, new loading waits) never repeat
// the last word — shared across all consumers on purpose.
let lastWord = null
export function pickThinkingWord() {
  let word
  do {
    word = THINKING_WORDS[Math.floor(Math.random() * THINKING_WORDS.length)]
  } while (word === lastWord)
  lastWord = word
  return word
}
