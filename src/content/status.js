// Content for /status. Spec: docs/superpowers/specs/marketing/status.md §3-4.
//
// Non-negotiable (per spec §3 "Empty / failure behaviour"): Kolumn has no
// status provider wired up today, so this file must never claim a green
// "all systems operational" state. Every component ships with status
// 'unknown' and STATE_COPY carries an explicit 'unknown' entry the page
// renders honestly. When a provider (Instatus / Better Stack / Statuspage)
// is wired in, a fetch layer replaces STATUS_COMPONENTS' hardcoded
// `status` field with live data — the shape ({ id, name, description,
// status }) is deliberately provider-agnostic so that swap doesn't touch
// StatusPage.jsx's rendering.

export const STATUS_META = {
  title: 'Kolumn status',
  description:
    'What the Kolumn web app, realtime sync, AI assistant, sign-in, and email depend on — shown as unknown until monitoring is connected.',
  ogTitle: 'Kolumn status',
  ogDescription:
    'What the Kolumn web app, realtime sync, AI assistant, sign-in, and email depend on — shown as unknown until monitoring is connected.',
}

// One row per user-facing dependency. `status` is 'unknown' for every row
// until a monitoring provider is connected — see the file header.
export const STATUS_COMPONENTS = [
  {
    id: 'web-app',
    name: 'Web app',
    description: 'Boards, cards, drag-and-drop, settings.',
    status: 'unknown',
  },
  {
    id: 'realtime-sync',
    name: 'Realtime sync',
    description: "Changes appearing on teammates' screens.",
    status: 'unknown',
  },
  {
    id: 'ai-assistant',
    name: 'AI assistant',
    description: 'The pill and chat.',
    status: 'unknown',
  },
  {
    id: 'sign-in',
    name: 'Sign-in',
    description: 'Email + password, password reset, sessions.',
    status: 'unknown',
  },
  {
    id: 'email',
    name: 'Email',
    description: 'Invitations, password-reset and sign-up mail.',
    status: 'unknown',
  },
]

// Copy + token roles per overall state. Colour is a dot + wash, never a
// filled block with white text (coherency rule: no lime button/fill; lime
// survives here only as the operational state dot/wash).
export const STATE_COPY = {
  operational: {
    heading: 'All systems operational',
    dotClass: 'bg-[var(--accent-lime)]',
    washClass: 'bg-[var(--accent-lime-wash)]',
    statusLabel: 'Operational',
  },
  degraded: {
    heading: 'Some things are slower than usual',
    dotClass: 'bg-[var(--color-honey)]',
    washClass: 'bg-[var(--label-yellow-bg)]',
    statusLabel: 'Degraded',
  },
  partial: {
    heading: 'Part of Kolumn is unavailable',
    dotClass: 'bg-[var(--color-copper)]',
    washClass: 'bg-[var(--label-red-bg)]',
    statusLabel: 'Partial outage',
  },
  major: {
    heading: 'Kolumn is down',
    dotClass: 'bg-[var(--color-red)]',
    washClass: 'bg-[var(--label-red-bg)]',
    statusLabel: 'Major outage',
  },
  maintenance: {
    heading: 'Scheduled maintenance in progress',
    dotClass: 'bg-[var(--text-muted)]',
    washClass: 'bg-[var(--label-yellow-bg)]',
    statusLabel: 'Maintenance',
  },
  unknown: {
    heading: 'Status unavailable — no monitoring is connected yet',
    dotClass: 'bg-[var(--text-muted)]',
    washClass: 'bg-[var(--surface-card)]',
    statusLabel: 'Unknown',
  },
}

// Worst-state-wins across components, used to drive the overall banner.
// With every component 'unknown' today this always resolves to 'unknown' —
// the extension point a future provider adapter plugs into.
const SEVERITY = ['operational', 'maintenance', 'degraded', 'partial', 'major', 'unknown']

export function overallStatus(components) {
  if (!components || components.length === 0) return 'unknown'
  return components.reduce((worst, c) => {
    const a = SEVERITY.indexOf(worst)
    const b = SEVERITY.indexOf(c.status)
    return b > a ? c.status : worst
  }, 'operational')
}
