// Simple client-side rate limiter.
// Returns a wrapper that rejects calls exceeding `maxCalls` within `windowMs`.
export function createRateLimiter(maxCalls, windowMs) {
  const timestamps = []

  return function isAllowed() {
    const now = Date.now()
    // Remove timestamps outside the window
    while (timestamps.length > 0 && timestamps[0] <= now - windowMs) {
      timestamps.shift()
    }
    if (timestamps.length >= maxCalls) {
      return false
    }
    timestamps.push(now)
    return true
  }
}

// Input sanitization — trim and limit string length
export function sanitizeText(text, maxLength = 500) {
  if (typeof text !== 'string') return ''
  return text.trim().slice(0, maxLength)
}

export function sanitizeTitle(text) {
  return sanitizeText(text, 200)
}

export function sanitizeDescription(text) {
  return sanitizeText(text, 5000)
}
