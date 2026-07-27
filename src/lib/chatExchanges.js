// Groups a chronological chat message list into user→assistant exchanges,
// returned newest-first so the reply to the latest prompt renders directly
// under the top-of-page composer.
export function groupExchanges(messages) {
  const groups = []
  let current = null
  for (const msg of messages) {
    if (msg.role === 'user') {
      current = { key: msg.id, user: msg, replies: [] }
      groups.push(current)
    } else {
      if (!current) {
        current = { key: msg.id, user: null, replies: [] }
        groups.push(current)
      }
      current.replies.push(msg)
    }
  }
  return groups.reverse()
}

// Splits raw card-id mentions into the latest exchange ("current": the last
// user message and everything after it) vs older messages ("earlier"). Raw =
// message-stamped ids (mentionedCardIds then legacy cardIds), newest message
// first within each side, duplicates preserved — the caller dedupes and
// resolves against the board store. No user message → everything is current.
export function splitMentionedIds(messages) {
  let boundary = 0
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === 'user') {
      boundary = i
      break
    }
  }
  const currentRaw = []
  const earlierRaw = []
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i]
    const ids = [...(msg.mentionedCardIds || []), ...(msg.cardIds || [])]
    if (i >= boundary) currentRaw.push(...ids)
    else earlierRaw.push(...ids)
  }
  return { currentRaw, earlierRaw }
}
