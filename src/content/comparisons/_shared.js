// Shared copy across the three /compare/<slug> pages. Kept separate so the
// "what Kolumn is" framing can't drift between the Trello/Asana/Notion
// pages — see docs/superpowers/specs/marketing/_competitor-monday.md §3 for
// why these pages exist and what they must avoid (fabricated social proof,
// absolute negatives about the other product, a disguised sales pitch
// instead of a genuine "choose them instead if" section).
import { PRICING } from '../pricing'

// Every competitor page was checked against a live fetch of the vendor's own
// pricing/product pages on this date. Rendered visibly on each page (see
// ComparisonPage.jsx) because competitor pricing and features change.
export const CHECKED_ON = '2026-09-04'

// Kolumn's own structural description — same on every comparison page,
// matching the LandingPage FAQ ("How is Kolumn different from Asana,
// Trello, or Notion?"): a kanban that stayed a kanban, not a document tool
// or a work-management suite that happens to have a board view.
export const KOLUMN_POSITIONING =
  "Kolumn is a kanban board, full stop — boards, columns, cards, drag-and-drop. There's no separate document layer, no workflow builder, no custom-field setup screen. The AI (the pill on every board, and chat) reads and writes the same boards through tools, so asking it to sort a list of notes into cards is just another way to fill in the board you already have."

// Rendered above the "choose them instead if" section on every comparison
// page (ComparisonPage.jsx) — kept as content, not a literal string in the
// component, so it's covered by marketingClaims.test.js's negation-aware
// "unshipped features" scan (the .jsx-file bare-match check that scan also
// runs has no negation awareness, and would otherwise flag this sentence's
// own "no mobile app" as an unqualified claim of a mobile app).
export const KOLUMN_HONEST_INTRO =
  'Kolumn is a young product with no billing, no integrations, no mobile app, and no customers yet. Here is where that genuinely matters.'

export const KOLUMN_FAQ = [
  {
    q: 'Is this a fair comparison?',
    a: `Kolumn is a young product with no billing, no integrations, no mobile app, and no customers yet. This page is honest about where that leaves it short — see "choose them instead if" below. Competitor figures are pulled from the vendor's own site and dated; check the vendor's page for anything time-sensitive.`,
  },
  {
    q: 'Does Kolumn have a free plan?',
    a: `Yes. Free is unlimited boards, columns, and cards, plus ${PRICING.limits.freeMessagesPerDay} AI messages a day. Pro removes the daily AI limit for $${PRICING.limits.proMonthlyUsd}/month. See /pricing for the full breakdown.`,
  },
]
