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
