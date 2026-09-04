// Shared content contract for src/content/*.
//
// The 14+ modules under src/content/ were built by different agents in
// parallel with no shared shape — about.js exports ABOUT_META/HERO/WHAT_IT_IS/
// TEAM/VALUES/DETAILS/CTA, pricing.js exports one PRICING object, features.js
// exports three. That is NOT being unified here (see the task note in the
// commit this file shipped with) — this module documents and validates only
// the handful of shapes that genuinely repeat across modules today. Don't
// add a schema for a shape used by exactly one page; that's this file
// drifting back into inventing structure nobody asked for.
//
// Read src/__tests__/contentSchema.test.js for how these are applied — it
// walks every module in src/content/ and validates the parts that match.

import { z } from 'zod'

// ---------------------------------------------------------------------------
// pageMeta — every page's <title>/<meta description>.
//
// Limits are NOT a guess: src/__tests__/marketingRoutes.test.js ("every
// route has a path, title, description and component") asserts
// `r.title.length <= 60` and `r.description.length <= 155` against
// MARKETING_ROUTES — those two numbers are copied from that test. If that
// test's limits ever change, update these too.
// ---------------------------------------------------------------------------
export const pageMeta = z.object({
  title: z.string().min(1).max(60),
  description: z.string().min(1).max(155),
  // Present on some modules (about.js, security.js, pricing.js,
  // connectors.js) and absent on others (solutions/*'s `seo`) — optional.
  ogTitle: z.string().min(1).optional(),
  ogDescription: z.string().min(1).optional(),
})

// ---------------------------------------------------------------------------
// cta — a clickable action: a label plus exactly one destination.
//
// Two destination shapes both appear for real: an internal route (`to`,
// e.g. about.js CTA.primary) and an external/mailto link (`href`, e.g.
// security.js HERO.primary, careers.js CTA "Say hi"). A cta needs exactly
// one — never both, never neither.
//
// NOT covered: src/content/solutions/*.js's `cta: { heading }` — that key
// holds a page-closing heading string, not a clickable action, and has no
// `label` at all. Same key name, genuinely different shape; see the test
// file's key-based detection, which requires a `label` field before it
// treats a `cta`-named property as this shape.
// ---------------------------------------------------------------------------
export const cta = z
  .object({
    label: z.string().min(1),
    to: z.string().min(1).optional(),
    href: z.string().min(1).optional(),
  })
  .refine((c) => (c.to != null) !== (c.href != null), {
    message: 'cta must have exactly one of `to` or `href`, not both or neither',
  })

// ---------------------------------------------------------------------------
// faqEntry — a question/answer pair. `a` may be `null` for a deliberately
// unanswered question (careers.js FAQ: "Is the work remote?" — the render
// path filters `a: null` rows rather than shipping a placeholder answer),
// but if present it must be non-empty, and `q` is always required.
// ---------------------------------------------------------------------------
export const faqEntry = z.object({
  q: z.string().min(1),
  a: z.string().min(1).nullable(),
})

// ---------------------------------------------------------------------------
// Two hero shapes both repeat, under different field names, so both are
// documented — picking one and calling the other "wrong" would misrepresent
// what the codebase actually does:
//
// - pageHero `{ heading, subhead }` — about.js, careers.js, security.js,
//   pricing.js (`PRICING.hero`).
// - sectionHero `{ h1, subhead }` — connectors.js, features.js
//   (FEATURE_PAGES.pill/chat `hero`), every src/content/solutions/*.js
//   `hero`. This family also carries an eyebrow-ish field, but its name
//   varies (`eyebrow` in solutions/*, `tag` in FEATURE_PAGES) so it isn't
//   part of the shared shape.
// ---------------------------------------------------------------------------
export const pageHero = z.object({
  heading: z.string().min(1),
  subhead: z.string().min(1),
})

export const sectionHero = z.object({
  h1: z.string().min(1),
  subhead: z.string().min(1),
})

/**
 * Validate `data` against `schema`, throwing an error that names the file
 * and the offending field(s) instead of zod's default flat message.
 *
 * @param {unknown} data
 * @param {import('zod').ZodType} schema
 * @param {string} label - identifies where `data` came from, e.g.
 *   `"src/content/about.js → ABOUT_META"`. Shown verbatim in the thrown
 *   error so a failing test points straight at the file and export.
 * @returns {unknown} the parsed data, on success.
 */
export function validateContent(data, schema, label) {
  const result = schema.safeParse(data)
  if (result.success) return result.data
  const details = result.error.issues
    .map((issue) => `${issue.path.length ? issue.path.join('.') : '(root)'}: ${issue.message}`)
    .join('; ')
  throw new Error(`[${label}] failed content schema — ${details}`)
}
