import { addDays, format } from 'date-fns'

// Sentinel due-date labels ('fri', 'thu', '+3d', '+21d', …) — content-authored
// shorthand so a marketing page doesn't hardcode a real calendar date that
// goes stale. Resolved to an actual date at render time (relative to "today")
// so it can flow through the product's own due-date pill (CardVisual →
// parseDueDate/formatDueDateLabel) instead of a hand-typed label — the same
// spirit as seedOnboardingBoard.js's resolveDueDate, extended to weekday
// sentinels. Shared between SolutionPage.jsx (example board + hero preview)
// and TemplatePreview.jsx (template board preview) so both use one sentinel
// vocabulary.
const WEEKDAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']

export function resolveDueSentinel(due) {
  if (!due) return null
  const relative = /^\+(\d+)d$/.exec(due)
  if (relative) return format(addDays(new Date(), Number(relative[1])), 'yyyy-MM-dd')
  const targetDow = WEEKDAYS.indexOf(due.toLowerCase())
  if (targetDow === -1) return null
  const today = new Date()
  let diff = (targetDow - today.getDay() + 7) % 7
  if (diff === 0) diff = 7 // next occurrence, not "today"
  return format(addDays(today, diff), 'yyyy-MM-dd')
}
