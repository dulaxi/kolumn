// ---------------------------------------------------------------------------
// marketingClaims.test.js — pins every factual claim on the marketing site
// (src/content/**, src/pages/marketing/**, plus the legal pages) to the code
// that actually backs it.
//
// WHY THIS FILE EXISTS: a 50-page marketing site can ship with a fully green
// test suite while still lying — selling a free feature as Pro-only, quoting
// a price that only exists in one place, linking to a page that was never
// built, advertising a feed that is never generated, or having two pages
// disagree about something as basic as "is my data encrypted at rest." None
// of those are syntax errors or rendering bugs; they only show up if you
// read copy against code. This file automates that reading for the classes
// of claim that have actually broken before: tier gating, prices, internal
// links, advertised artifacts, cross-page agreement, and claims about
// features that have not shipped yet.
//
// MAINTAINERS: when you add a new factual claim to a marketing page — a
// price, a limit, "unlimited", "no card required", a link, a shipped
// feature — add a case here. Don't just eyeball it against
// docs/superpowers/specs/marketing/_KOLUMN-BRIEF.md. A claim without a
// matching assertion in this file is a claim nobody is protecting.
//
// Every assertion below reads the *source of truth* (an edge function, a
// route registry, a build script, or another content module) as data or
// text, and compares it against the marketing copy. Group titles below say
// which file is the source of truth for that group's claims.
// ---------------------------------------------------------------------------

import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve, relative, join } from 'node:path'
import { describe, test, expect } from 'vitest'
import { PRICING, CONTACT_EMAIL } from '../content/pricing'
import { MARKETING_ROUTES, KNOWN_ROUTES } from '../content/marketing-routes'
import * as PricingMod from '../content/pricing'
import * as AboutMod from '../content/about'
import * as BlogMod from '../content/blog'
import * as CareersMod from '../content/careers'
import * as ChangelogMod from '../content/changelog'
import * as ConnectorsMod from '../content/connectors'
import * as CustomersMod from '../content/customers'
import * as FeaturesMod from '../content/features'
import * as SecurityMod from '../content/security'
import * as StatusMod from '../content/status'
import * as SupportMod from '../content/support'
import * as TemplatesMod from '../content/templates'
import * as TutorialsMod from '../content/tutorials'
import * as MarketingNavMod from '../content/marketing-nav'
import * as UsagePolicyMod from '../content/legal/usage-policy'
import * as ResponsibleDisclosureMod from '../content/legal/responsible-disclosure'
import * as PrivacyChoicesMod from '../content/legal/privacy-choices'
import * as TermsMod from '../content/legal/terms'
import * as PrivacyMod from '../content/legal/privacy'
import * as SolutionsMod from '../content/solutions/index'
import { COMPARISONS_LIST } from '../content/comparisons'

const here = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(here, '../..')

function readSrc(relPath) {
  return readFileSync(resolve(repoRoot, relPath), 'utf8')
}

function listFiles(dir, ext) {
  let out = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) out = out.concat(listFiles(full, ext))
    else if (entry.name.endsWith(ext)) out.push(full)
  }
  return out
}

const rel = (abs) => relative(repoRoot, abs)

// Handles both straight (') and curly (’) apostrophes — this codebase's
// content strings use \u{2019} for contractions like "haven't".
const NEGATION_RE = /\b(no|not|without|never|unknown|nothing|open question)\b|n['’]t\b/i

// Returns the single sentence (split on . ! ? followed by whitespace) that
// contains the match at `idx` — used instead of a fixed character window so
// a negation elsewhere in a paragraph (e.g. an unrelated "we do not sell
// your data" two sentences earlier) can't wrongly excuse a claim, while a
// negation stated earlier IN THE SAME sentence (common in this codebase's
// long comment-prose, e.g. "Not claimed, because ... any specifics about
// encryption at rest") is still found.
function sentenceContaining(text, idx) {
  const sentences = text.split(/(?<=[.!?])\s+/)
  let pos = 0
  for (const s of sentences) {
    const end = pos + s.length
    if (idx >= pos && idx < end + 2) return s
    pos = end + 1
  }
  return text.slice(Math.max(0, idx - 150), idx + 150)
}

// Deep-walks an imported content module's exports (its actual, evaluated
// string VALUES — not the raw .js source) and returns every string, in
// authoring order. Used instead of scanning raw source text for the
// unshipped-features check below: raw JS source has quote-escaping and
// comment noise that makes reliable sentence boundaries hard (verified the
// hard way — see git history of this file / PR discussion), while an
// imported module's string values are already clean, already-parsed prose
// with no surrounding JS syntax to trip over.
function isPlainObject(v) {
  return v !== null && typeof v === 'object' && !Array.isArray(v)
}
function collectStringsInOrder(value, out = []) {
  if (typeof value === 'string') { out.push(value); return out }
  if (Array.isArray(value)) { for (const v of value) collectStringsInOrder(v, out); return out }
  if (isPlainObject(value)) { for (const k of Object.keys(value)) collectStringsInOrder(value[k], out) }
  return out
}

// Sentence-local (not whole-string) context: splits just the one string
// containing the match, so an earlier, unrelated sentence in the same
// multi-sentence field (e.g. connectors.js's INTEGRATIONS.body, which both
// declines Slack/Gmail AND — hypothetically — could someday claim something
// else two sentences later) can't wrongly excuse a later claim.
function localSentenceContaining(str, idx) {
  const sentences = str.split(/(?<=[.!?])\s+/)
  let pos = 0
  for (const s of sentences) {
    const end = pos + s.length
    if (idx >= pos && idx < end + 2) return s
    pos = end + 1
  }
  return str
}

// Paths within a comparison module's COMPARISON export that are
// structurally guaranteed to describe the COMPETITOR, not Kolumn — the
// "their pricing, their claims, the choose-them-instead bodies" carve-out.
// Everything NOT rooted under one of these paths is a Kolumn-side or
// neutral field and must obey the same unshipped-feature rules as every
// other content module (see collectComparisonKolumnStrings below).
//
//   - `positioning.competitor` — prose describing the competitor's own
//     model (Trello's lists, Asana's project views, Notion's databases).
//   - `competitorPricing` — the competitor's own tier table.
//   - `competitorClaims` — sourced, dated sentences about the competitor.
//   - `chooseThemInstead` — genuinely mixes both subjects in one string
//     (an unnegated true competitor fact — "Trello ships iOS and Android
//     apps" — paired with an already-negated Kolumn admission — "Kolumn is
//     a web app with no mobile app yet" — in the same body). Per-sentence
//     negation scanning would false-positive on the competitor half (this
//     is the exact "Trello ships iOS and Android apps" case the guard must
//     NOT trip on), so this field is exempted structurally rather than
//     scanned; its own honesty (real scenarios, not a strawman) is a
//     judgment call made at content-review time, not a regex's job.
const COMPARISON_COMPETITOR_ONLY_PATHS = new Set([
  'COMPARISON.positioning.competitor',
  'COMPARISON.competitorPricing',
  'COMPARISON.competitorClaims',
  'COMPARISON.chooseThemInstead',
])

// Walks a comparison module's COMPARISON and META exports (its actual,
// evaluated string values, in authoring order, same as collectStringsInOrder
// above) and returns every string NOT rooted under a
// COMPARISON_COMPETITOR_ONLY_PATHS entry, tagged with its dotted path for
// readable failure messages. This is the subject-aware replacement for the
// blanket comparisons/*.js exclusion — see the CONTENT_MODULES comment.
function collectComparisonKolumnStrings(mod) {
  const out = []
  function walk(value, path) {
    if (COMPARISON_COMPETITOR_ONLY_PATHS.has(path)) return
    if (typeof value === 'string') {
      out.push({ str: value, path })
      return
    }
    if (Array.isArray(value)) {
      value.forEach((v, i) => walk(v, `${path}[${i}]`))
      return
    }
    if (isPlainObject(value)) {
      for (const k of Object.keys(value)) walk(value[k], `${path}.${k}`)
    }
  }
  walk(mod.COMPARISON, 'COMPARISON')
  walk(mod.META, 'META')
  return out
}

// Every src/content/*.js module, as its evaluated namespace object, keyed
// by its path relative to src/content/ (for failure messages). Deliberately
// excludes marketing-routes.js: its route entries carry `Component: lazy(...)`
// values (React.lazy objects), which are not meaningful to string-walk and
// aren't marketing prose anyway (route path/title/description are already
// covered by the links + meta-length checks elsewhere).
//
// Also deliberately excludes src/content/comparisons/*.js from this plain,
// subject-blind CONTENT_MODULES map: those pages legitimately assert that a
// NAMED COMPETITOR ships an unshipped-for-Kolumn feature (e.g. "Trello's
// Enterprise plan includes SSO", "Notion Business adds unlimited guests") —
// sourced, dated facts about another company, not a claim about Kolumn.
// This does NOT mean comparisons/*.js is unchecked, though — a prior version
// of this file excluded it wholesale, and a planted false claim
// ("Kolumn now ships a native iOS app and a live Slack integration.") on a
// field describing Kolumn passed the full suite undetected. Instead, the
// "unshipped features" describe block below scans comparisons/*.js
// separately and SUBJECT-AWARE, via collectComparisonKolumnStrings(): it
// walks each module's actual COMPARISON/META export (structured data, not
// raw source text) and skips only the paths that are structurally
// guaranteed to describe the competitor — `positioning.competitor`,
// `competitorPricing`, `competitorClaims`, `chooseThemInstead` (see
// COMPARISON_COMPETITOR_ONLY_PATHS) — everything else (positioning.kolumn,
// differentiators, faq, hero, meta, …) is scanned under the exact same
// negation-aware rule as every other content module. Kolumn-side claims in
// those same files (what Kolumn does NOT have, e.g. "no mobile app yet")
// are still written negated by hand and are ALSO covered by: the
// hardcoded-price check and internal-links check above (both scan
// CONTENT_FILES, which is a directory walk and already includes
// comparisons/*.js), and src/__tests__/ComparisonPages.test.jsx, which
// separately asserts every competitor claim carries a source + date.
const CONTENT_MODULES = {
  'about.js': AboutMod,
  'blog.js': BlogMod,
  'careers.js': CareersMod,
  'changelog.js': ChangelogMod,
  'connectors.js': ConnectorsMod,
  'customers.js': CustomersMod,
  'features.js': FeaturesMod,
  'pricing.js': PricingMod,
  'security.js': SecurityMod,
  'status.js': StatusMod,
  'support.js': SupportMod,
  'templates.js': TemplatesMod,
  'tutorials.js': TutorialsMod,
  'marketing-nav.js': MarketingNavMod,
  'legal/usage-policy.js': UsagePolicyMod,
  'legal/responsible-disclosure.js': ResponsibleDisclosureMod,
  'legal/privacy-choices.js': PrivacyChoicesMod,
  'legal/terms.js': TermsMod,
  'legal/privacy.js': PrivacyMod,
  'solutions/index.js': SolutionsMod,
}

const CONTENT_DIR = resolve(repoRoot, 'src/content')
const MARKETING_PAGES_DIR = resolve(repoRoot, 'src/pages/marketing')

// CONTENT_FILES is every raw content file scanned as text below: the .js
// data modules AND the .md article bodies under src/content/articles/
// (src/content/articles/support/<slug>.md, .../tutorials/<slug>.md —
// loaded at build time by src/lib/content.js, see support.js/tutorials.js).
// A markdown body is prose exactly like a hand-written .js string — it can
// carry the same dead link or hardcoded price a .js file could — so every
// text-scanning check below (prices, internal links, artifacts, the
// single-contact-email check) must see both. listFiles recurses, so this
// one CONTENT_DIR walk already picks up the nested articles/ subfolders.
const CONTENT_FILES = [...listFiles(CONTENT_DIR, '.js'), ...listFiles(CONTENT_DIR, '.md')]
const MARKETING_PAGE_FILES = listFiles(MARKETING_PAGES_DIR, '.jsx')

// ===========================================================================
// 1. TIER LIMITS AND GATING — source of truth: supabase/functions/chat/tier.ts
//    and supabase/functions/chat/tools.ts. These are Deno files, so they are
//    read as text (importing them would need a Deno runtime), then parsed
//    with a couple of narrow regexes rather than trusted-by-memory numbers.
// ===========================================================================

describe('tier limits and gating (source: supabase/functions/chat/tier.ts + tools.ts)', () => {
  const tierText = readSrc('supabase/functions/chat/tier.ts')
  const toolsText = readSrc('supabase/functions/chat/tools.ts')

  test('PRICING.limits.freeMessagesPerDay matches FREE_DAILY_LIMIT in tier.ts', () => {
    const match = tierText.match(/const FREE_DAILY_LIMIT = (\d+)/)
    expect(match, 'tier.ts no longer defines FREE_DAILY_LIMIT as a plain numeric const — update this regex').not.toBeNull()
    expect(
      PRICING.limits.freeMessagesPerDay,
      `PRICING.limits.freeMessagesPerDay (src/content/pricing.js) is out of sync with FREE_DAILY_LIMIT in supabase/functions/chat/tier.ts`,
    ).toBe(Number(match[1]))
  })

  // PRO_ONLY_TOOLS is the backend's list of tools the free tier's pill may
  // not call (see filterToolsForMode). Extracted as text so this test fails
  // if a tool is added/removed from that list without a matching pricing
  // change — not because we trust a hand-copied list to stay in sync.
  function extractArrayOfStrings(text, constName) {
    const m = text.match(new RegExp(`const ${constName}\\s*=\\s*\\[([\\s\\S]*?)\\]`))
    expect(m, `could not find "const ${constName} = [...]" in the source — update this regex if it was renamed/reshaped`).not.toBeNull()
    return [...m[1].matchAll(/"([a-zA-Z_]+)"/g)].map((mm) => mm[1])
  }

  const PRO_ONLY_TOOLS = extractArrayOfStrings(tierText, 'PRO_ONLY_TOOLS')
  const CHAT_READ_TOOLS_MATCH = toolsText.match(/export const CHAT_READ_TOOLS = \[([\s\S]*?)\]/)
  expect(CHAT_READ_TOOLS_MATCH, 'tools.ts no longer exports CHAT_READ_TOOLS as a plain array literal').not.toBeNull()
  const CHAT_READ_TOOLS = [...CHAT_READ_TOOLS_MATCH[1].matchAll(/"([a-zA-Z_]+)"/g)].map((m) => m[1])

  // Maps a PRICING.comparison row label to the backend tool name(s) that
  // actually implement it. This is the piece that would have caught claim
  // #1 from the incident: a row marked true-for-free whose tools are
  // secretly Pro-only (or vice versa).
  const CAPABILITY_TOOLS = {
    'Pill: create cards from plain language': ['create_card'],
    'Pill: move, update, complete, reorganize': ['move_card', 'update_card', 'delete_card', 'move_cards', 'update_cards', 'complete_cards'],
    'Chat: ask questions, search cards, and summarize boards': ['search_cards', 'summarize_board'],
  }

  test('every row in CAPABILITY_TOOLS exists verbatim in PRICING.comparison.rows (so the map above cannot silently go stale)', () => {
    const rowLabels = new Set(PRICING.comparison.rows.map((r) => r.label))
    for (const label of Object.keys(CAPABILITY_TOOLS)) {
      expect(rowLabels.has(label), `CAPABILITY_TOOLS references comparison row "${label}", which no longer exists in PRICING.comparison.rows — the pricing copy changed and this test needs updating`).toBe(true)
    }
  })

  for (const [label, toolNames] of Object.entries(CAPABILITY_TOOLS)) {
    test(`comparison row "${label}": free-tier cell agrees with tier.ts gating`, () => {
      const row = PRICING.comparison.rows.find((r) => r.label === label)
      expect(row, `comparison row "${label}" not found in PRICING.comparison.rows`).toBeTruthy()
      const freeGetsIt = row.cells[0] === true
      for (const toolName of toolNames) {
        const isProOnly = PRO_ONLY_TOOLS.includes(toolName)
        if (freeGetsIt) {
          expect(
            isProOnly,
            `PRICING.comparison marks "${label}" as available on Free, but tier.ts's PRO_ONLY_TOOLS gates "${toolName}" behind Pro — the pricing page oversells Free (or tier.ts under-gates it)`,
          ).toBe(false)
        } else {
          expect(
            isProOnly,
            `PRICING.comparison marks "${label}" as Pro-only (false for Free), but tier.ts's PRO_ONLY_TOOLS does NOT gate "${toolName}" — free users can already do this, so the pricing page is selling a feature that is already free (this is the exact class of bug that shipped: chat search/summarize sold as Pro-only while the backend granted it to every tier)`,
          ).toBe(true)
        }
      }
    })
  }

  test('search_cards and summarize_board are real tools chat can call (CHAT_READ_TOOLS), backing the "Chat: ... search cards, and summarize boards" claim', () => {
    for (const toolName of CAPABILITY_TOOLS['Chat: ask questions, search cards, and summarize boards']) {
      expect(CHAT_READ_TOOLS, `"${toolName}" must be in tools.ts's CHAT_READ_TOOLS for the chat surface to actually be able to call it`).toContain(toolName)
    }
  })

  test('filterToolsForMode does not additionally tier-gate chat mode (chat read tools are free-for-all, matching the pricing claim)', () => {
    // Deliberately narrow: pull just the "if (mode === chat) return ..." line
    // out of filterToolsForMode and assert it does not reference `tier` at
    // all. If chat mode ever starts filtering by tier, this line will
    // either disappear or start mentioning `tier`, and this regex-based
    // check is what catches the pricing page then being wrong either way.
    const chatBranch = tierText.match(/if\s*\(mode === "chat"\)[^\n]*/)
    expect(chatBranch, 'could not find the `if (mode === "chat")` branch in filterToolsForMode — tier.ts was restructured, update this test').not.toBeNull()
    expect(chatBranch[0], `chat mode's tool filter now references "tier" — if it started gating by tier, PRICING's "on every plan including Free" claim for chat search/summarize would need to change too`).not.toMatch(/\btier\b/)
    expect(chatBranch[0]).toMatch(/CHAT_READ_TOOLS/)
  })
})

// ===========================================================================
// 2. PRICES — source of truth: PRICING.limits in src/content/pricing.js.
//    No other content module may contain a literal dollar figure for
//    KOLUMN'S OWN pricing; every Kolumn price shown anywhere must be
//    interpolated from PRICING.limits so a second, independently-editable
//    "$8" can never exist.
//
//    Exception: the /compare/<slug> pages (src/content/comparisons/*.js)
//    legitimately cite the COMPETITOR's price — a fact about a company
//    Kolumn doesn't control, sourced from that vendor's own pricing page
//    (see each module's `competitorPricing.source`/`.checkedOn` and each
//    `competitorClaims[].source`/`.checkedOn`), not a second copy of a
//    Kolumn number. That data is namespaced under two object keys —
//    `competitorPricing` (the tier/price table) and `competitorClaims` (the
//    sourced, dated sentences the page's "Sources" section renders, several
//    of which restate a competitor price in prose) — specifically so it's
//    structurally distinguishable from ordinary prose. stripNamedBlock below
//    removes only the text inside those two balanced-brace/bracket blocks
//    before scanning, so a stray Kolumn price typed anywhere else in the
//    same file (inside either block or not) still trips the guard. This
//    narrows the assertion to "no hardcoded KOLUMN price," which is what
//    the guard was actually protecting — it does not weaken the check for
//    Kolumn's own numbers, anywhere, including inside a comparisons/*.js
//    file outside these two keys.
// ===========================================================================

// Removes exactly the value of `<key>: { ... }` or `<key>: [ ... ]` (matching
// brace/bracket depth, so nested objects/arrays inside it are handled) from
// `text`, for every occurrence of `key`. Used to carve the one legitimate
// "foreign price" block out of a file before the hardcoded-price regex scans
// it — see the comment above.
function stripNamedBlock(text, key) {
  const re = new RegExp(`${key}\\s*:\\s*[[{]`)
  let result = text
  for (;;) {
    const match = re.exec(result)
    if (!match) return result
    const openChar = result[match.index + match[0].length - 1]
    const closeChar = openChar === '[' ? ']' : '}'
    let depth = 1
    let i = match.index + match[0].length
    while (i < result.length && depth > 0) {
      if (result[i] === openChar) depth += 1
      else if (result[i] === closeChar) depth -= 1
      i += 1
    }
    result = result.slice(0, match.index) + result.slice(i)
  }
}

describe('no content module hardcodes a dollar price literal (source: PRICING.limits in src/content/pricing.js)', () => {
  const priceFiles = CONTENT_FILES.filter((f) => f !== resolve(CONTENT_DIR, 'pricing.js'))

  for (const file of priceFiles) {
    test(`${rel(file)} contains no literal "$<digit>"`, () => {
      const raw = readFileSync(file, 'utf8')
      // Raw source text, not the imported/evaluated module: a legitimate
      // `` `$${proMonthlyUsd}/month` `` interpolation must NOT trip this —
      // in source it reads "$${proMonthlyUsd}", where the char after the
      // first "$" is another "$", not a digit, so /\$\d/ correctly leaves
      // it alone. Only an actual literal like '$8' or "$8/month" matches.
      const text = stripNamedBlock(stripNamedBlock(raw, 'competitorPricing'), 'competitorClaims')
      const matches = [...text.matchAll(/\$\d/g)]
      expect(
        matches.map((m) => m[0]),
        `${rel(file)} has a hardcoded price literal — every Kolumn dollar figure must come from PRICING.limits (src/content/pricing.js), not a second typed copy. (Competitor prices inside a "competitorPricing" or "competitorClaims" block are exempt — see the comment above this describe block.)`,
      ).toEqual([])
    })
  }
})

// ===========================================================================
// 3. INTERNAL LINKS — source of truth: MARKETING_ROUTES + KNOWN_ROUTES
//    (src/content/marketing-routes.js) and the literal routes in
//    src/App.jsx. src/__tests__/marketingRoutes.test.js already covers nav
//    and footer links; this covers every OTHER internal href/to in body
//    copy and page markup — CTAs, FAQ answers, markdown links in support
//    articles, breadcrumbs, etc.
// ===========================================================================

describe('internal links resolve to a real route', () => {
  const appText = readSrc('src/App.jsx')
  // Exclude the bare "*" catch-all (renders NotFoundPage) — it would
  // otherwise match every possible href and make this whole check a no-op.
  const rawAppPaths = [...appText.matchAll(/path="([^"]+)"/g)].map((m) => m[1]).filter((p) => p !== '*')

  function routeToRegex(p) {
    const norm = p.startsWith('/') ? p : '/' + p
    const escaped = norm.replace(/[-\\^$+?.()|[\]{}]/g, '\\$&')
    const withParams = escaped.replace(/:[^/]+/g, '[^/]+').replace(/\*/g, '.*')
    return new RegExp('^' + withParams + '$')
  }
  const appPatterns = rawAppPaths.map(routeToRegex)

  const marketingPaths = new Set(MARKETING_ROUTES.map((r) => r.path))
  const knownRoutes = new Set(KNOWN_ROUTES)

  function isValidInternalHref(href) {
    if (!href) return true
    if (/^(https?:|mailto:|tel:)/i.test(href)) return true // external — not this test's job
    if (href.startsWith('#')) return true // same-page anchor
    const pathPart = href.split('#')[0]
    if (marketingPaths.has(href) || marketingPaths.has(pathPart)) return true
    if (knownRoutes.has(href) || knownRoutes.has(pathPart)) return true
    if (appPatterns.some((rx) => rx.test(pathPart))) return true
    return false
  }

  // Matches both JS object literals (`to: '/x'`, `href: "/x"`) and JSX
  // attributes (`to="/x"`), across single/double/backtick-quoted values.
  // Backtick values may contain `${...}` interpolation (e.g. a mailto with
  // CONTACT_EMAIL) — those are handled by the external-link short-circuit
  // above since they still start with the literal "mailto:" text.
  const LINK_ATTR_RE = /\b(?:to|href)\s*[:=]\s*(?:"([^"]*)"|'([^']*)'|`([^`]*)`)/g
  const MARKDOWN_LINK_RE = /\]\(([^)]+)\)/g

  function findHrefsIn(text) {
    const hrefs = []
    for (const m of text.matchAll(LINK_ATTR_RE)) hrefs.push(m[1] ?? m[2] ?? m[3])
    for (const m of text.matchAll(MARKDOWN_LINK_RE)) hrefs.push(m[1])
    return hrefs
  }

  const filesToScan = [...CONTENT_FILES, ...MARKETING_PAGE_FILES]
  for (const file of filesToScan) {
    test(`${rel(file)}: every to/href/markdown link resolves to MARKETING_ROUTES, KNOWN_ROUTES, or an App.jsx route`, () => {
      const text = readFileSync(file, 'utf8')
      const hrefs = findHrefsIn(text)
      const bad = hrefs.filter((h) => !isValidInternalHref(h))
      expect(bad, `${rel(file)} links to a route that does not exist: ${bad.join(', ')} — add it to MARKETING_ROUTES/App.jsx first, or fix the copy`).toEqual([])
    })
  }
})

// ===========================================================================
// 4. ADVERTISED ARTIFACTS — a page may only advertise a served file (a feed,
//    a downloadable, a static asset) that the build actually produces.
//    Source of truth: dist/ (if a build is present) or the file names
//    scripts/prerender.mjs is known to write (sitemap.xml, robots.txt).
//
//    Narrowing note: a naive "any /path.ext-looking string" regex over raw
//    source text also matches developer comments referencing other source
//    files (e.g. "supabase/schema.sql", "docs/…/security.md") because those
//    substrings contain an internal "/segment.ext". A negative lookbehind
//    requiring the leading "/" NOT be preceded by a word character or "."
//    excludes those (they're always written as "supabase/schema.sql", never
//    "/supabase/schema.sql") while still catching a truly root-relative
//    advertised path like "/changelog/feed.xml". Verified empirically: this
//    exact regex over src/content/** + src/pages/marketing/** currently
//    matches nothing, and the synthetic test below proves it still catches
//    a planted violation.
// ===========================================================================

describe('advertised artifacts are actually produced by the build', () => {
  const ARTIFACT_PATH_RE = /(?<![\w.])\/[a-zA-Z0-9_-]+(?:\/[a-zA-Z0-9_-]+)*\.(xml|json|csv|pdf|zip|txt|ics)\b/g

  const prerenderText = readSrc('scripts/prerender.mjs')
  const generatedFromPrerender = new Set(
    [...prerenderText.matchAll(/join\(DIST,\s*'([^']+)'\)/g)].map((m) => '/' + m[1]),
  )

  const distDir = resolve(repoRoot, 'dist')
  const distExists = existsSync(distDir)

  function isProducedArtifact(pathStr) {
    if (generatedFromPrerender.has(pathStr)) return true
    if (distExists && existsSync(join(distDir, pathStr))) return true
    return false
  }

  test('no real content or marketing-page string advertises a path the build does not produce', () => {
    const filesToScan = [...CONTENT_FILES, ...MARKETING_PAGE_FILES]
    const offenders = []
    for (const file of filesToScan) {
      const text = readFileSync(file, 'utf8')
      for (const m of text.matchAll(ARTIFACT_PATH_RE)) {
        if (!isProducedArtifact(m[0])) offenders.push(`${rel(file)}: ${m[0]}`)
      }
    }
    expect(offenders, `advertised path(s) not produced by the build (see scripts/prerender.mjs / dist/): ${offenders.join(', ')}`).toEqual([])
  })

  // Proof this rule can actually fail: no page currently advertises a served
  // artifact at all, so there is nothing real to break-and-restore for this
  // one (unlike the price/link checks). Instead, prove the detector itself
  // flags a planted, unproduced path — this is exactly the "RSS feed at
  // changelog/feed.xml that is never generated" bug from the incident.
  test('detector self-test: a planted, unproduced feed path is correctly flagged', () => {
    const plantedCopy = 'Subscribe to the changelog at /changelog/feed.xml — RSS, updated on every release.'
    const matches = [...plantedCopy.matchAll(ARTIFACT_PATH_RE)].map((m) => m[0])
    expect(matches).toEqual(['/changelog/feed.xml'])
    expect(isProducedArtifact('/changelog/feed.xml'), 'the build does not write changelog/feed.xml anywhere — if this ever becomes true, the detector needs updating alongside the real feature').toBe(false)
  })

  test('detector self-test: sitemap.xml and robots.txt (real generated artifacts) are recognized as produced', () => {
    expect(isProducedArtifact('/sitemap.xml')).toBe(true)
    expect(isProducedArtifact('/robots.txt')).toBe(true)
  })
})

// ===========================================================================
// 5. CROSS-PAGE AGREEMENT — the same fact must not be stated two ways.
// ===========================================================================

describe('cross-page agreement', () => {
  test('exactly one contact email address is used across src/content/**', () => {
    const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g
    const found = new Set()
    for (const file of CONTENT_FILES) {
      const text = readFileSync(file, 'utf8')
      for (const m of text.matchAll(EMAIL_RE)) found.add(m[0])
    }
    expect([...found], `src/content/** should use exactly one contact address (CONTACT_EMAIL, src/content/pricing.js) — found: ${[...found].join(', ')}`).toEqual([CONTACT_EMAIL])
  })

  test('no page claims encryption at rest while src/content/security.js explicitly declines to claim it', () => {
    // security.js's own header comment is explicit: "Not claimed, because
    // the code doesn't support it ... any specifics about encryption at
    // rest or backup retention." If ANY other page asserts encryption at
    // rest, that is a direct contradiction of the page whose whole job is
    // to be the accurate one.
    //
    // Sentence-scoped negation check (not a bare substring test): security.js
    // itself contains the literal phrase "encryption at rest" as PART OF the
    // sentence declining to claim it, so a naive match-and-fail here would
    // flag security.js against itself. sentenceContaining() isolates the one
    // sentence around each match so the nearby "doesn't"/"Not claimed" is
    // correctly read as a decline, not an assertion.
    const ENCRYPTION_AT_REST_RE = /encrypt[a-z]*[^.]{0,60}\bat rest\b/gi

    function unqualifiedEncryptionClaims(text) {
      const offenders = []
      for (const m of text.matchAll(ENCRYPTION_AT_REST_RE)) {
        const sentence = sentenceContaining(text, m.index)
        if (!NEGATION_RE.test(sentence)) offenders.push(sentence.trim().slice(0, 160))
      }
      return offenders
    }

    const securityOffenders = unqualifiedEncryptionClaims(readSrc('src/content/security.js'))
    expect(
      securityOffenders,
      `src/content/security.js now affirmatively claims encryption at rest: ${securityOffenders.join(' | ')} — if that changed intentionally, the check below should be reworded (it currently treats security.js as the page that declines this claim), not just made to pass`,
    ).toEqual([])

    const filesToCheck = [
      'src/content/legal/privacy.js',
      'src/content/legal/terms.js',
      ...MARKETING_PAGE_FILES.map(rel),
    ]
    const offenders = []
    for (const relFile of filesToCheck) {
      const found = unqualifiedEncryptionClaims(readSrc(relFile))
      for (const snippet of found) offenders.push(`${relFile}: "${snippet}"`)
    }

    expect(
      offenders,
      `src/content/security.js explicitly does NOT claim encryption at rest, but these file(s) do: ${offenders.join(' | ')} — pages disagree about a security fact`,
    ).toEqual([])
  })
})

// ===========================================================================
// 6. UNSHIPPED FEATURES — source of truth:
//    docs/superpowers/specs/marketing/_KOLUMN-BRIEF.md, "Not shipped"
//    section. This list moves as features ship — when one of these items
//    ships for real, delete its pattern here (and add the claim it now
//    unlocks to one of the groups above).
//
//    Each pattern is checked with two guards, applied to each content
//    module's actual (imported, evaluated) string values — not raw .js
//    source text, which turned out to be unreliable here: escaped quotes
//    sitting right next to a following comma (`'...today.',`, extremely
//    common in this object-literal-heavy content) break naive sentence
//    splitting, and dev comments add noise that isn't real copy anyway.
//      1. A question is never itself a claim — "Are you SOC 2 certified?"
//         does not assert Kolumn IS certified, so any match whose local
//         sentence ends in "?" is skipped outright.
//      2. Otherwise, the match is allowed only if its LOCAL sentence (split
//         within just that one string value, so an unrelated earlier
//         sentence in the same multi-sentence field can't wrongly excuse a
//         later one) contains a negation ("not", "no", "doesn't", "n't", …).
//    src/pages/marketing/**/*.jsx gets a plainer bare-match check: real
//    marketing prose lives in src/content/** (see the marketing-page skill),
//    so a page component hardcoding one of these phrases at all is already
//    suspicious enough to fail without needing the negation nuance.
// ===========================================================================

describe('unshipped features are never claimed as live (source: docs/superpowers/specs/marketing/_KOLUMN-BRIEF.md, "Not shipped")', () => {
  const FORBIDDEN_CLAIMS = [
    { label: 'Board Builder shipped', re: /\bboard builder\b/gi },
    { label: 'native mobile/desktop app', re: /\b(native\s+)?(ios|android|mobile|desktop)\s+app(s)?\b/gi },
    { label: 'public API', re: /\bpublic api\b/gi },
    { label: 'Slack/Gmail OAuth integration', re: /\b(slack|gmail)\s+(oauth\s+)?integration\b/gi },
    { label: 'enterprise SSO/SAML', re: /\b(SSO|SAML)\b/g },
    { label: 'SOC 2 certification', re: /\bSOC\s?2\b/gi },
    { label: 'calendar view', re: /\bcalendar view\b/gi },
  ]

  for (const { label, re } of FORBIDDEN_CLAIMS) {
    test(`no unqualified claim of "${label}" in src/content/**`, () => {
      const offenders = []
      for (const [moduleName, mod] of Object.entries(CONTENT_MODULES)) {
        const strings = collectStringsInOrder(mod)
        for (const str of strings) {
          for (const m of str.matchAll(re)) {
            const sentence = localSentenceContaining(str, m.index).trim()
            if (sentence.endsWith('?')) continue // a question isn't a claim
            if (!NEGATION_RE.test(sentence)) {
              offenders.push(`${moduleName} (near: "${sentence.replace(/\s+/g, ' ').slice(0, 160)}")`)
            }
          }
        }
      }
      expect(offenders, `unqualified "${label}" claim in src/content/** — this feature is marked not-shipped in _KOLUMN-BRIEF.md: ${offenders.join('; ')}`).toEqual([])
    })

    test(`no unqualified claim of "${label}" in src/content/comparisons/**'s Kolumn-side fields`, () => {
      const offenders = []
      for (const mod of COMPARISONS_LIST) {
        const strings = collectComparisonKolumnStrings(mod)
        for (const { str, path } of strings) {
          for (const m of str.matchAll(re)) {
            const sentence = localSentenceContaining(str, m.index).trim()
            if (sentence.endsWith('?')) continue // a question isn't a claim
            if (!NEGATION_RE.test(sentence)) {
              offenders.push(`${mod.COMPARISON.slug}.js ${path} (near: "${sentence.replace(/\s+/g, ' ').slice(0, 160)}")`)
            }
          }
        }
      }
      expect(
        offenders,
        `unqualified "${label}" claim about KOLUMN in src/content/comparisons/** — competitor-only fields (positioning.competitor, competitorPricing, competitorClaims, chooseThemInstead) are exempt, everything else describing Kolumn must obey the same not-shipped rule as every other content module: ${offenders.join('; ')}`,
      ).toEqual([])
    })

    test(`no bare mention of "${label}" hardcoded in a src/pages/marketing/**/*.jsx component`, () => {
      const offenders = []
      for (const file of MARKETING_PAGE_FILES) {
        const text = readFileSync(file, 'utf8')
        if (re.test(text)) offenders.push(rel(file))
        re.lastIndex = 0
      }
      expect(offenders, `"${label}" appears directly in page markup — real marketing copy belongs in src/content/**, checked (with negation-awareness) by the test above: ${offenders.join(', ')}`).toEqual([])
    })
  }
})
