// Derives Open Graph card copy from a marketing route: which of the three
// approved layouts (see AssetPreviewSandbox.jsx) it uses, its section
// eyebrow, and the slug its PNG is written/served under. Shared by the
// sandbox's single-card query-param renderer, scripts/og-generate.mjs, and
// the public/og coverage test — one mapping, not three copies of it.
// Pure + no React/browser globals so it can run in Node at generation time.

// Layout assignment by route (see CLAUDE.md "Board Builder" is unrelated —
// this is the marketing OG image rollout): B is product-led (homepage,
// pricing, the features hub and its sub-pages), C is the Klay layout
// (support articles, tutorials, about, careers), A is everything else.
export function ogLayoutForPath(path) {
  if (path === '/' || path === '/pricing' || path === '/features' || path.startsWith('/features/')) return 'B'
  if (path.startsWith('/support/') || path.startsWith('/tutorials/') || path === '/about' || path === '/careers') return 'C'
  return 'A'
}

const SECTION_LABELS = {
  pricing: 'Pricing',
  compare: 'Compare',
  features: 'Features',
  solutions: 'Solutions',
  templates: 'Templates',
  connectors: 'Connectors',
  customers: 'Customers',
  tutorials: 'Tutorials',
  blog: 'Blog',
  changelog: 'Changelog',
  support: 'Support',
  status: 'Status',
  about: 'About',
  careers: 'Careers',
  security: 'Security',
  legal: 'Legal',
}

// The eyebrow (layout A) / section-and-domain line (layout C). Derived from
// the route's top-level path segment — not hand-assigned per page, so a new
// route under an existing section picks up the right label for free.
export function ogSectionForPath(path) {
  if (path === '/') return 'Kolumn'
  const [, segment] = path.split('/')
  return SECTION_LABELS[segment] || 'Kolumn'
}

// public/og/<slug>.png — '/' is the one path with no segments to join.
export function ogSlugForPath(path) {
  return path === '/' ? 'home' : path.slice(1).replace(/\//g, '-')
}

// The card's headline is the route's <title> tag with the trailing
// " — Kolumn" dropped — the lockup already carries the wordmark, so
// repeating it on the image is redundant. Titles that don't end in that
// exact suffix (a few hub pages fold "Kolumn" mid-sentence) pass through
// unchanged.
export function ogHeadlineForTitle(title) {
  return title.replace(/ — Kolumn$/, '')
}

// An index page's title is often just its section name, so layout A would show
// the eyebrow "BLOG" above a headline reading "Blog" — correct, and useless to
// anyone deciding whether to click. When the headline adds nothing to the
// eyebrow, promote the page's description to the headline instead.
export function ogHeadlineForRoute(route, eyebrow) {
  const headline = ogHeadlineForTitle(route.title)
  if (headline.trim().toLowerCase() !== String(eyebrow).trim().toLowerCase()) return headline
  const sentence = String(route.description || '').split(/(?<=\.)\s/)[0]
  return sentence || headline
}

// Layout B shows a real card. Give each page its own so the home page, pricing
// and features don't share an identical picture when all three are shared.
// Keyed by route path; anything unlisted falls back to the first entry.
export const OG_CARDS = {
  '/': { title: 'Redo the pricing page', icon: 'Browser', label: 'Marketing', checklist: [1, 3] },
  '/pricing': { title: 'Compare the plans with the team', icon: 'CreditCard', label: 'Admin', checklist: [2, 3] },
  '/features': { title: 'Draft the launch announcement', icon: 'Megaphone', label: 'Marketing', checklist: [0, 2] },
  '/features/pill': { title: 'Add three cards from standup', icon: 'Lightning', label: 'Product', checklist: [0, 3] },
  '/features/chat': { title: 'What is left before Friday?', icon: 'ChatsCircle', label: 'Product', checklist: [1, 2] },
}

export function ogCardForPath(path) {
  return OG_CARDS[path] || OG_CARDS['/']
}
