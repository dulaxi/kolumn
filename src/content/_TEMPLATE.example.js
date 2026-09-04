// Starting point for a new marketing page's content module. Copy this file
// to src/content/<name>.js, fill it in, delete what you don't need — see
// .claude/skills/marketing-page/SKILL.md §2 step 1 for the rest of the
// mechanical steps (page component, registry entry, nav/footer, test).
//
// The shapes below (`meta`, `hero`, `cta`, `faq`) match src/content/_schema.js
// and are covered by src/__tests__/contentSchema.test.js automatically —
// nothing to wire up, the test walks every module in src/content/ by key
// name. Everything else in this file (rows/sections/whatever your page
// needs) is genuinely page-specific; there is no shared schema for it and
// there doesn't need to be — see _schema.js's header comment for why this
// repo does not force one shape on every page.
//
// Field-naming note (read _schema.js before picking `heading`/`subhead` vs
// `h1`/`subhead` for a hero): both exist for real in this codebase. Pick
// whichever the page you're modeling this on uses; don't invent a third.

import { PRICING } from './pricing' // only if you cite a price/limit — never hardcode one, see CLAUDE.md

// pageMeta shape (src/content/_schema.js): title <=60 chars, description
// <=155 chars, both required. ogTitle/ogDescription optional.
export const META = {
  title: 'Page title — Kolumn',
  description: 'One or two sentences, <=155 characters, that describe the page for search results.',
  ogTitle: 'Page title',
  ogDescription: 'Same length limit as description.',
}

// sectionHero shape: { h1, subhead }. (The alternate family is
// { heading, subhead } — see _schema.js.)
export const HERO = {
  h1: 'The one thing this page is about.',
  subhead: 'One sentence of support. No exclamation marks — see _KOLUMN-BRIEF.md §Voice.',
  cta: { label: 'Start free', to: '/onboarding' }, // cta shape: label + exactly one of `to` (internal) or `href` (external/mailto)
}

// faqEntry shape: { q, a }. `a` may be `null` for a deliberately unanswered
// question — see src/content/careers.js FAQ for the real example, and how
// its render path filters `a: null` rows instead of showing a placeholder.
export const FAQ = [
  {
    q: 'A question a real visitor would ask?',
    a: `An honest answer. Cite src/content/pricing.js (PRICING.limits) for any number — e.g. Pro is $${PRICING.limits.proMonthlyUsd}/month — never a literal.`,
  },
]

// Anything else this page needs is page-specific — sections, a comparison
// table, a demo, whatever. There's no schema for it and there shouldn't be;
// just follow the shape of the page you're modeling this on.
