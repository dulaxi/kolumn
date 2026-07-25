// Title-scan resolver for the chat card rail: which board cards does a piece
// of chat text mention? Longest-title-first with span masking so "Landing
// page redesign" doesn't also count as a mention of "Landing page".

// Titles shorter than this only match as whole words, so a card titled
// "Fix" doesn't match inside "prefix".
const WHOLE_WORD_MAX = 4

function findMatchIndex(haystack, needle) {
  let idx = haystack.indexOf(needle)
  if (needle.length >= WHOLE_WORD_MAX) return idx
  while (idx !== -1) {
    const before = idx === 0 ? '' : haystack[idx - 1]
    const after = haystack[idx + needle.length] || ''
    if (!/[a-z0-9]/.test(before) && !/[a-z0-9]/.test(after)) return idx
    idx = haystack.indexOf(needle, idx + 1)
  }
  return -1
}

export function findMentionedCardIds(text, cardsById) {
  if (!text) return []
  let haystack = text.toLowerCase()
  const ids = []
  const cards = Object.values(cardsById || {})
    .filter((c) => typeof c.title === 'string' && c.title.trim().length >= 2)
    .sort((a, b) => b.title.trim().length - a.title.trim().length)
  for (const card of cards) {
    const needle = card.title.trim().toLowerCase()
    const idx = findMatchIndex(haystack, needle)
    if (idx === -1) continue
    ids.push(card.id)
    // Mask the matched span so a shorter overlapping title can't re-match it.
    haystack = haystack.slice(0, idx) + ' '.repeat(needle.length) + haystack.slice(idx + needle.length)
  }
  return ids
}
