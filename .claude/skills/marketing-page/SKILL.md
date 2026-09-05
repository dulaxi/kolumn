---
name: marketing-page
description: Use when adding, editing, or building a marketing or public-facing page — anything under the ~30 routes in src/content/marketing-routes.js, a new landing-page section, pricing/features/solutions/templates/blog/support content, or the shared nav/footer chrome.
---

# Marketing pages

~30 public routes, all prerendered to static HTML at build. One registry
(`src/content/marketing-routes.js`) drives routing, head meta, the sitemap,
and the build-time render. Read that file first — every route factory in it
(`legalRoute`, `featurePageRoute`, `solutionRoute`, …) is the pattern to
follow for a new page, not something to reinvent.

## 1. Design first: reference-measurement

Don't guess spacing/type numbers. Load a real reference page (usually
`claude.com`) with a Playwright harness, extract computed styles and
screenshots, and write a spec that puts the source number next to the Kolumn
mapping.

- Harness: `.claude/skills/marketing-page/measure.mjs` — `node measure.mjs
  <url> <slug>`. Needs `playwright-core` (`npm install --no-save
  playwright-core` in a scratch dir — do not add it to the repo) and a real
  Chrome at `/Applications/Google Chrome.app` (`channel: 'chrome'`, same as
  the `verify` skill's Playwright setup). Node's ESM resolver looks for
  `node_modules` starting from the script's own directory, so copy
  `measure.mjs` into that scratch dir alongside `node_modules` rather than
  running it in place from `.claude/skills/`. Writes to `out/` next to
  wherever you run it: `<slug>.png` (full page, 1440w), `<slug>-mobile.png` (390w),
  `<slug>.json` (heading sizes/weights/line-heights, container widths,
  section padding, grid columns/gaps, radii, button dimensions, palette by
  frequency), `<slug>.txt` (a heading/paragraph/link text outline).
- Read both screenshots and the JSON before writing anything. The JSON gives
  numbers; the screenshot gives the layout the numbers describe.
- Write the spec to `docs/superpowers/specs/marketing/<page>.md`, following
  the shape of `docs/superpowers/specs/marketing/pricing.md`: §1 purpose/SEO
  (title, meta description, canonical, OG, structured data, internal
  links), §2 source anatomy (what the reference site does, section by
  section, with the measured numbers), §3 Kolumn version (**keep** /
  **adapt** / **drop** / **new** per section, with the actual Tailwind
  classes and copy). Chrome (nav/footer/type-scale/container/palette) is
  measured once and lives in `docs/superpowers/specs/marketing/_chrome.md`
  — page specs only restate it where they deviate.
- `docs/superpowers/specs/marketing/_KOLUMN-BRIEF.md` is the claims
  authority: what Kolumn actually does, what's not shipped, tier prices,
  voice. Read it before writing a word of copy — don't invent a feature, a
  number, or a customer.

## 2. Adding a page — mechanical steps

1. **Content module** — `src/content/<name>.js`. Plain JS data (meta, copy,
   any `jsonLd()` builder), no Supabase. `src/content/pricing.js` is the
   reference: `meta`, page copy, and `pricingJsonLd()` all in one export.
   Copy `src/content/_TEMPLATE.example.js` as the starting skeleton — it's a
   short, commented module using the shapes in `src/content/_schema.js`
   (`pageMeta`, `cta`, `faqEntry`, and the two hero shapes — see that file's
   header for why there are two and why the 14 existing modules were never
   unified into one). Those shapes are validated automatically by
   `src/__tests__/contentSchema.test.js`, which walks every module in
   `src/content/` by key name (`meta`/`seo`, `cta`-ish keys, `*FAQ*` arrays,
   `hero`) — nothing to register, just use the same field names.
2. **Page component** — `src/pages/marketing/<Name>Page.jsx`. Static,
   presentational, no auth/Supabase reads (see the traps below for why).
   `src/pages/marketing/PricingPage.jsx` is the reference: imports its
   content module, composes `src/components/marketing/*` primitives
   (`PlanGrid`, `CompareTable`, `FaqItem`), head meta comes from the route
   registry via `MarketingLayout` — the page itself never sets `<title>`.
3. **Registry entry** in `src/content/marketing-routes.js` — add to
   `MARKETING_ROUTES`: `path`, `title` (≤60 chars), `description` (≤155),
   `Component: lazy(() => import(...))`, and `load: () => import(...)` (the
   *same* factory, unwrapped — prerendering needs the resolved module, see
   §5 below). Add `ogTitle`/`ogDescription`/`jsonLd` if they differ from
   title/description. Set `thin: true` only if the page has no real body yet
   (a "coming soon" stub) — it stays reachable but drops out of the sitemap
   and gets `noindex, follow` (see `src/lib/headMeta.js` `ROBOTS_THIN`). For
   a family of pages sharing one detail template (features, solutions,
   templates, customers, tutorials, blog, support), write a route factory
   function like `featurePageRoute`/`solutionRoute` and map it over the
   content list — don't hand-write N near-identical entries.
4. **Nav/footer links** in `src/content/marketing-nav.js` — `NAV_LINKS`,
   `NAV_MENUS`, or `FOOTER_GROUPS`, only if the page belongs in the chrome.
   `src/__tests__/marketingRoutes.test.js` fails the build on any nav/footer
   link whose target isn't in `MARKETING_ROUTES` or `KNOWN_ROUTES` — add the
   route before the link, not after.
5. **Test** — `src/__tests__/<Name>Page.test.jsx`, mirroring
   `src/__tests__/PricingPage.test.jsx`: render inside `MemoryRouter`,
   assert the h1 and key content render, assert no `a`/`button` carries a
   `bg-[var(--accent-lime` / `bg-[var(--color-lime` class, assert the
   heading outline (`h1..h6` tag order) never skips a level.
6. If the page makes a factual claim about pricing, limits, or what's
   shipped, it needs a corresponding assertion in
   `src/__tests__/marketingClaims.test.js` (the claims guard — see the traps
   section). Don't ship copy that test doesn't cover.

## 3. Writing an article body (support articles & tutorials)

Support articles (`src/content/support.js`) and tutorials
(`src/content/tutorials.js`) mostly exist as title + summary already, with
`body: null` — 29 of them right now. Writing one is a markdown file, not a
code change:

1. Add `src/content/articles/support/<slug>.md` or
   `src/content/articles/tutorials/<slug>.md` — the filename (minus `.md`)
   must match the entry's `slug` exactly. Frontmatter is a `---`-delimited
   block with one required key, `title: ...` (a `key: value` line, not real
   YAML — see the parser in `src/lib/content.js`). Everything after the
   closing `---` is the body, standard GFM markdown.
2. Never type a price or limit literally — reference it instead:
   `{{PRICING.limits.proMonthlyUsd}}` pulls the live number from
   `src/content/pricing.js` at build time. A literal `$8` fails
   `marketingClaims.test.js`'s hardcoded-price check, which scans `.md`
   files under `src/content/articles/` the same as every `.js` content
   module.
3. **The body's existence is what promotes the page.** No registry change
   needed: `getSupportArticleBody`/`getTutorialBody` (`src/lib/content.js`)
   attach the markdown to the matching entry by slug at import time, and
   `supportArticleRoute`/`tutorialRoute` in `marketing-routes.js` set
   `thin: !article.body` — a real body takes the page out of the "coming
   soon" state, into `sitemap.xml`, and off `noindex`. Malformed
   frontmatter (no opening/closing `---`, a line that isn't `key: value`,
   a missing `title`) fails the build loudly, naming the file, instead of
   silently shipping an empty article.
4. Metadata stays in JS — the markdown file is body only. `title`,
   `summary`, category/topic, ordering, `updated`, `related`, `tags` all
   still live in `support.js`/`tutorials.js`. For a tutorial specifically,
   also add `minutes` (read time) to its entry once it has a real body —
   see the fabricated-signal note in that file's header.

## 4. House rules (enforced, not just style preference)

- **Tokens, never hex.** `var(--token)` via Tailwind arbitrary values
  (`bg-[var(--surface-card)]`) — see `src/index.css` for the token list.
- **No lime button.** Ink is the affirmative action; red is destructive;
  lime is a state color only (badges, checkmarks, selection) — never a
  button/link fill. `PricingPage.test.jsx`'s lime-button test is the
  enforcement pattern; copy it into every new page test.
- **Radii**: `rounded-lg` (8px) for buttons/inputs, `rounded-xl` (12px) for
  cards/panels/tiles. Kanban card surfaces are a deliberate 16px exception
  elsewhere in the app — marketing pages don't get that exception.
- **Icons: Phosphor only** (`@phosphor-icons/react`).
- **Headings**: `font-heading font-[425]` on every h1 and h2 (Clash
  Grotesk 425, not the default weight). Exactly one h1 per page. No
  heading-level skips (h2 → h4 with no h3) — `PricingPage.test.jsx`'s third
  test asserts this programmatically.
- **Layout rhythm**: sections `max-w-6xl px-6 sm:px-10`, vertical rhythm
  `py-20`. Prose columns (FAQ answers, legal text) narrow to `max-w-2xl`.
- **Voice**: sentence case headings, no exclamation marks, short
  declaratives — see `_KOLUMN-BRIEF.md` §Voice. No mascot name in copy
  (Klay is illustration-only here).

## 5. The traps

Each of these cost real time building this system. Symptom, then rule.

- **Grepping the whole prerendered file for your copy proves nothing — it
  can find a hidden copy.** React's Fizz renderer can emit a suspended or
  oversized Suspense boundary as an out-of-order segment: a `<template>`
  placeholder + the real HTML sitting inert in a hidden sibling `<div>` +
  an inline reveal `<script>`. A crawler that doesn't run JS sees an empty
  `<main>` even though `grep` on the raw file finds the text. Always assert
  content is *inside* `<main>...</main>`, not just present in the file. Two
  independent causes were found and fixed in `src/prerender-entry.jsx`:
  a `lazy()` route component always suspends on first render (fixed by
  resolving the route's module before calling `prerender()`), and React's
  `progressiveChunkSize` default (12800 bytes) segments any boundary bigger
  than that regardless of laziness (fixed with `progressiveChunkSize:
  Infinity`). `scripts/prerender.mjs` throws the build if it ever sees an
  inline `<script>` in prerendered output, specifically to catch a
  regression here — don't remove that check, and don't undo either fix.
- **Nothing in the prerender import graph may reach `src/lib/env.js`.** It
  throws immediately if Supabase env vars aren't set, and the prerender
  step runs in Node, not a browser, with no `.env.local` guarantee.
  `src/components/marketing/useMarketingUser.js` dynamically imports the
  auth store *inside a `useEffect`* specifically to keep it out of the SSR
  module graph — copy that pattern for any marketing component that needs
  auth state, never a top-level `import { useAuthStore } from
  '../../store/authStore'`.
- **An overlay mounted inside `#root` while a scroll lock is held becomes
  inert and unclosable.** `lockBodyScroll()` in `src/components/ui/Modal.jsx`
  sets `inert` + `aria-hidden` on `#root` for the duration of the lock. If
  your overlay (a mobile nav menu, a dropdown) also renders inside `#root`,
  its own close button goes inert with everything else. `MarketingNav.jsx`
  portals its overlay to `document.body` via `createPortal` for exactly this
  reason — do the same for any new full-screen marketing overlay.
- **Production serving is not the stock `serve` CLI.** `npx serve dist -s`
  prepends a catch-all rewrite ahead of every other rule, which bypasses the
  file-existence lookup that resolves `/pricing` → `dist/pricing.html` — so
  `-s` makes every prerendered page unreachable, serving the SPA shell
  instead. `railway.json`'s `startCommand` runs `scripts/serve-prod.mjs`
  instead, which decides the SPA-fallback rewrite per-request only after
  checking for a real file. Don't "simplify" deploy back to `serve -s`.
- **Copy drifts from code silently.** Tests can be green while a page sells
  a free-tier feature as Pro-only, or states a limit the backend no longer
  enforces. Any factual claim (a price, a limit, "unlimited", "no card
  required") needs a matching assertion — the guard lives in
  `src/__tests__/marketingClaims.test.js`. Add a case there for every new
  claim, don't just eyeball it against `_KOLUMN-BRIEF.md`.
- **Empty pages should not be indexed.** A stub page (support article or
  tutorial with no body yet) is marked `thin: true` in the registry entry —
  that's what excludes it from `sitemap.xml` and switches its robots tag to
  `noindex, follow` (`src/lib/headMeta.js` `ROBOTS_THIN`). Reachable, just
  not indexed. Don't publish a real URL for a page with nothing on it
  without setting this.

## 6. Verify before calling it done

```bash
npm run build                       # vite build + vite build --ssr + scripts/prerender.mjs
PORT=4173 node scripts/serve-prod.mjs &   # production server, not `vite preview`, not `serve -s`
```

Then check the served output for the new route (replace `/your-path`):

```bash
curl -s http://127.0.0.1:4173/your-path | grep -A2 '<main'   # content is INSIDE <main>, not just in the file
curl -s http://127.0.0.1:4173/your-path | grep -c '<title>'  # exactly 1
curl -s http://127.0.0.1:4173/your-path | grep 'rel="canonical"'
curl -s http://127.0.0.1:4173/sitemap.xml | grep your-path   # present, unless deliberately `thin`
```

Diff the new page's `<title>` against every other route in
`MARKETING_ROUTES` — titles must be unique site-wide (the "coming-soon
tutorial" title-collision override in `marketing-routes.js` is the pattern
for resolving one).

Then look at it in a real browser at both 1440 and 390 wide (the
`measure.mjs` harness works against `localhost:4173` too, or just resize a
Chrome window) — a build passing and a page looking right are different
claims. Kill the server (`kill %1` or the backgrounded PID) when done.
