# Legal document template — marketing page spec

> Source crawled: https://www.anthropic.com/legal/consumer-terms, /legal/privacy, /legal/aup, /legal/cookies, /responsible-disclosure-policy on 2026-09-02. Screenshots + metrics in the crawl harness `out/legal-*.{json,txt,png}`, probes in `out/probe-*.txt`, viewport crops `out/crop-*.png`.
> Kolumn route: `/legal/<slug>` (family) · Priority: P1 (terms, privacy) / P2 (rest) · Template family: legal

This spec carries every proportion for the family. The five document specs (`terms.md`, `privacy.md`, `usage-policy.md`, `responsible-disclosure.md`, `privacy-choices.md`) only add a section outline and per-page SEO/data notes. **No legal prose is written in any of these specs — a lawyer drafts the text.** The specs fix layout, structure, and the facts about Kolumn each section must reflect.

## 1. Purpose and SEO target
- **Job of this template**: render a long, numbered legal document so it is legible, deep-linkable, printable, and obviously current (effective date + version history), with the same chrome as the rest of the marketing site.
- **Route family — recommendation: `/legal/*`.** Kolumn today serves `/terms` and `/privacy` at top level (`src/App.jsx` lines 88–89). Move to `/legal/terms`, `/legal/privacy`, `/legal/usage-policy`, `/legal/responsible-disclosure`, `/legal/privacy-choices`, plus an index at `/legal`. Reasons: one prerender glob, one sitemap group, one place for the family's `noindex` decision, and a natural home for the index and archive pages. Keep `/terms` → `/legal/terms` and `/privacy` → `/legal/privacy` as permanent redirects (client: `<Navigate replace>`; static host: `public/serve.json` currently has only `headers` — add a `redirects` block, `serve` supports it). Existing in-app links to update: `src/pages/OnboardingPage.jsx` (lines ~401, ~410, ~791), `src/pages/LandingPage.jsx` (~1471), `src/components/settings/PrivacySection.jsx` (~27). Anthropic keeps its disclosure policy at top level (`/responsible-disclosure-policy`) — Kolumn should not copy that inconsistency.
- **Indexing**: Anthropic marks every `/legal/*` page `robots: noindex, nofollow`; the disclosure page is indexable. Recommendation for Kolumn: index terms, privacy, usage policy and disclosure (they are the pages security reviewers and procurement search for), `noindex` the archive pages only. Query intent is navigational ("kolumn privacy policy", "kolumn terms"), no keyword work needed.
- **Per-page `<title>` pattern**: `<Document name> · Kolumn` (≤60 chars). Meta description ≤155 chars, written per page. OG title = document name; OG description = meta description; OG image = the shared marketing default.
- **Structured data**: `WebPage` + `BreadcrumbList` (Home › Legal › Document) only. The source emits none.
- **Internal links in**: marketing footer "Legal" column (all five), onboarding terms step, landing sign-in form, Settings → Privacy, Settings → Account (delete-account modal should link retention section of privacy). **Out**: documents cross-link each other (terms → usage policy, privacy; privacy → privacy choices; disclosure ↔ privacy security section), and to `/pricing` where billing is described.

## 2. Source page anatomy (what Anthropic does)

Ordered, top to bottom, at 1440w (the four `/legal/*` pages share one `LegalPageDetail` layout; the disclosure page is a `LandingPageSection` variant — both described).

`## 1. Site header` — 68px sticky, page background, wordmark left, nav right. Shared chrome; not restated here.

`## 2. Title band` — h1 only, margin-top 96px from header, margin-bottom 48px · container 1272px (page-wrapper max 1400px, 84px side margins) · text-align center · h1 64/64 · weight 700 · sans. Full-width so long titles ("Consumer Terms of Service") sit on one line above the narrower measure. Disclosure variant: h1 52/52 in a 744px centered container, section padding-top 96.

`## 3. Document meta row` — ≈50px · container = the 640px measure, centered (x=400) · left: "Effective October 8, 2025" 16/16 weight 600 sans · right: "Previous Version" 16/16 600 underlined link → `/legal/archive/<uuid>`, then a globe icon + "English" language `<select>` (react-select, 16px) · 1px rule under the row (ink), 32px gap before body. Disclosure variant instead centers a single "Last updated Feb 14, 2025" line at 15/21 sans, 400 weight, ~48px below the h1, no rule, no history, no language switch.

`## 4. Body` — measure **640px** (`max-width: 640px`, centered) · serif body **17/26**, ink · paragraph margin 0 0 16px · h2 **25/30** sans 600, margin 32px 0 8px (terms, AUP, cookies, disclosure) · privacy policy uses a deeper scale: h2 **32/38** 600 margin 64px 0 32px, h3 25/30 600 margin 32px 0 8px · lists: `ul` disc / `ol` decimal, padding-left 21px, `li` margin-bottom 12px, list margin-top 16px (terms/AUP) or 0 (privacy) · nested `ol` used for sub-clauses (terms §6 renders "1. … 5." with lettered inner items) · links: underline, same ink as body, no colour change · `strong` 600 used for defined terms ("Terms", "Services") and the lead paragraph · no `hr`, no pull quotes, no callouts.

`## 5. Tables (privacy only)` — "Legal Bases for Processing": wrapper panel 640w, tinted surface (rgb 240 238 230 ≈ a raised/sand tone), radius ≈8px, 24px padding · 3 columns (Purpose / Type of Data / Legal Basis) · header row 15/21 sans 400, 1px rule beneath · cells 15/21 sans, padding 16px 16px 16px 0 · bulleted lists inside cells · mobile: same panel, 278px wide, cells lose padding — cramped, scrolls.

`## 6. Accordions (AUP only)` — the ten "Do Not …" categories are `<button aria-expanded>` rows: 16px serif 400, full measure width, 1px bottom border (rgb 209 207 197, a subtle border tone), content collapsed by default. Sub-sections "Universal Usage Standards", "High-Risk Use Case Requirements", "Additional Use Case Guidelines" are h2s.

`## 7. Footer` — 1038px, begins ≈100–176px after the last paragraph (no explicit end-of-document element). Shared chrome. Contains a "Privacy choices" `<button>` that opens a 440×281 cookie-consent banner (Cookie Settings — Customize / Reject all / Accept all). There is **no** `/legal/privacy-choices` page (404; not in sitemap).

Shared numbers:
- **Type scale**: h1 64/64/700 sans (52 on the disclosure variant) · h2 25/30/600 (32/38 in privacy) · h3 25/30/600 · body 17/26/400 serif · meta 16/16/600 sans · table 15/21 sans · mobile: h1 36/36 (32 disclosure), h2 20/24 (23/28 privacy h2), body unchanged 17/26.
- **Container + rhythm**: page-wrapper 1400 max, measure 640 centered, h1 container 1272 · title mt 96 / mb 48 · meta row + 1px rule + 32 · h2 mt 32 / mb 8 · p mb 16 · li mb 12 · no card radius except the table panel (≈8px) · no shadows anywhere.
- **Palette roles**: bg page (warm off-white), text ink (single colour for body, headings, links), subtle border for accordion rows, raised/sand panel for the table. Links are distinguished by underline only.
- **Mobile (390w)**: side padding 32 → measure 326 · h1 36/36 mt 64 mb 32, still centered · meta row stacks into three lines (Effective / Previous Version / language) ~32px apart · body 17/26 unchanged · h2 20/24 mt 24 · table overflows/cramps.
- **Sticky TOC**: **none** on any page. No sticky element other than the header. Section numbering is inline in the h2 text ("1. Who we are."), not generated. No print stylesheet (0 `@media print` rules). No JSON-LD.

## 3. Kolumn version

### What to keep from `src/pages/LegalPage.jsx`
- The shell contract: `LegalPage({ title, updated, children })` becomes `LegalDocument({ doc })` where `doc` is the parsed markdown file (section 4). Keep it as the single shell for the family.
- `bg-[var(--surface-page)]`, light-only rendering (matches the landing page — `data-theme` is not toggled on public routes).
- The mono, muted "Last updated" line (`text-xs font-mono text-[var(--text-muted)]`) — this is Kolumn's existing voice for chrome metadata; it replaces the source's bold sans meta text.
- The `[&_h2]` / `[&_ul]` arbitrary-variant approach for styling markdown output (extend rather than replace).
- Wrapped in `ErrorBoundary` at the route (as today).

### What to change
- **Chrome**: drop the lone `KolumnLockup` link; render the shared marketing nav and footer (see the chrome spec, `_chrome.md`) so legal pages are part of the site. Nav stays sticky; no other sticky element.
- **Measure**: `max-w-2xl` (672) with `px-6` → an explicit `max-w-[640px]` measure, `px-6 sm:px-8`, centered.
- **Body size**: `text-sm` (14px) → **16px / 26px** Inter (`text-[16px] leading-[26px]`, `--text-primary`, not `--text-secondary` — legal text is primary text). 17px serif at 26 maps to 16px Inter at 26 with equivalent x-height; do not go below 16.
- **Title**: `text-[32px] font-light font-logo` → `font-heading font-[425] text-[40px] leading-[1.1] tracking-tight sm:text-[48px] sm:leading-[1.08]` (the landing h1 scale), **left-aligned inside the 640 measure**, not centered full-width. The source's 64px/700 centered display title is its brand voice; Kolumn's is Clash Grotesk 425 left-aligned. Padding-top 80px desktop / 56 mobile below the nav; margin-bottom 32.
- **Meta row** (new): flex row, `justify-between`, `items-baseline`, 12px mono `--text-muted`: left `Effective <Month D, YYYY>` (or `Last updated` for the disclosure page and privacy choices, which have no effective date); right `Version history` link (underline-offset-[3px], decoration `--color-sand` → `--text-secondary` on hover; the landing/onboarding link style). No language switcher (single language). 1px `--border-default` rule beneath, `pb-4 mb-8`. Mobile: stack to two lines, `gap-1`.
- **Headings**: h2 `font-heading font-[425] text-[22px] leading-[28px] text-[var(--text-primary)] mt-10 mb-3 scroll-mt-24` with the number kept in the text ("3. Your content") · h3 `font-sans font-semibold text-[16px] leading-6 mt-6 mb-2`. Privacy gets the same scale (do not adopt the source's 32/38 — one scale for the family). Every h2/h3 gets an `id` slug so sections deep-link (`/legal/privacy#5-your-controls`); use `rehype-slug`-style slugging inside the renderer (one small util, no new dep needed).
- **Lists**: `ul` disc / `ol` decimal, `pl-5` (20px), `li` `mb-2` (8px) — tighter than the source's 12 because Kolumn's line-height is the same at a smaller size; nested `ol` renders lower-alpha.
- **Links**: underline, `underline-offset-[3px]`, `decoration-[var(--color-sand)]`, `hover:decoration-[var(--text-secondary)]`, colour `--text-primary`. Same rule the landing uses.
- **`strong`**: `font-semibold text-[var(--text-primary)]` for defined terms.
- **Tables** (privacy legal-bases, privacy-choices storage table): wrapper `rounded-[10px] border border-[var(--border-default)] bg-[var(--surface-card)] overflow-x-auto` (1px border + 10px radius instead of a tinted panel) · `th` 12px mono uppercase-free `--text-muted`, `td` 14px/20px Inter `--text-primary`, cell padding 12px 16px, row rule `border-t border-[var(--border-subtle)]`. Mobile: horizontal scroll inside the wrapper; never let the page scroll sideways.
- **Callouts** (new, optional): a "Plain-language summary" box at the top of terms and privacy — `InlineNotice variant="info"` with `icon={false}` — one paragraph per document, drafted by the lawyer as non-binding. Keep it out of the numbered sections.
- **Accordions**: not used in the family. The usage policy renders flat h2 + lists (Kolumn's list is short). If it ever exceeds ~8 categories, reuse the landing `FaqItem` disclosure component, not a new one.
- **Print**: add a minimal `@media print` block in `index.css` (hide nav, footer, meta-row link; `--text-primary` on white; `a[href^="http"]::after` prints the URL). The source has none; it is cheap and expected of legal pages.
- **End of document**: `mt-16 pt-6 border-t border-[var(--border-subtle)]` with a mono 12px line "Questions: support@kolumn.app" + link to `/legal` index, so the footer never abuts the last clause (the source relies on footer margin).
- **Index page `/legal`**: same shell, h1 "Legal", one `ul` of the five documents with title + one-line description + effective date (12px mono). No cards.
- **Archive**: `/legal/<slug>/archive/<YYYY-MM-DD>` renders the archived markdown in the same shell with an `InlineNotice variant="warn"` at the top: "This version is no longer in effect. See the current <document>." `noindex`.

### Proportions to keep from the source
640px measure · body line-height 26 · paragraph gap 16 · 1px rule under the meta row · ≈32px from rule to first paragraph · title band top spacing ≈ 80–96 · h2-to-body gap 8–12 · single ink colour for body, headings and links · no TOC, no sidebar, no sticky in-page element · mobile side padding 32 → use Kolumn's 24 (`px-6`) to match the landing.

### Proportions to change
Title 64/700 centered → 40–48 / 425 left · h2 25 → 22 (Clash Grotesk reads larger than the source sans at the same size) · list spacing 12 → 8 · table panel tinted/8px → bordered/10px · serif → Inter (no serif on this site, see brief).

### Components
- `LegalDocument` (renamed shell, `src/pages/legal/LegalDocument.jsx`), `LegalIndexPage`, `LegalArchivePage`. Markdown rendering via the existing `react-markdown` + `remark-gfm` with a `components` map for h2/h3 (id + classes), `a` (external → `rel="noopener"`), `table` (wrapper). No new dependencies; frontmatter parsed by a ~15-line util (`src/content/legal/loadLegal.js`) over Vite `?raw` imports.
- Tokens: `--surface-page`, `--surface-card`, `--border-default`, `--border-subtle`, `--text-primary`, `--text-muted`, `--color-sand`, `--font-heading`, `--font-mono`. No accent colour appears on legal pages except inside `InlineNotice`.

## 4. Data and content sources
- One markdown file per document in `src/content/legal/<slug>.md`, archived versions in `src/content/legal/archive/<slug>-<YYYY-MM-DD>.md`. Frontmatter:
  ```
  ---
  title: Terms of Service
  slug: terms
  description: <meta description, ≤155 chars>
  effective: 2026-10-01        # omit on documents that only have lastUpdated
  lastUpdated: 2026-09-15
  version: 2
  summary: <optional plain-language summary for the InlineNotice>
  previous:
    - { effective: 2026-07-22, file: archive/terms-2026-07-22.md }
  ---
  ```
  `lastUpdated` is required on every file and drives the meta row; `effective` is shown when present ("Effective …"), otherwise "Last updated …".
- Body is GFM markdown: `## 1. Heading` numbered by hand (source does the same; numbering is legal-stable and must not renumber when a section is inserted — lawyers insert "3A").
- The prerender step reads the same files to emit `<title>`, description, OG, canonical and the sitemap entries (`lastmod` = `lastUpdated`).
- Facts that must stay in sync with app code: free daily AI limit (`FREE_DAILY_LIMIT` in `supabase/functions/chat/tier.ts`), Pro price/period/trial (`UpgradeProPage.jsx` `PRICES`, 7-day trial), processor list (`src/lib/env.js`: Supabase, Sentry, PostHog; `supabase/functions/chat/`: Anthropic), what board context is sent to the AI (`supabase/functions/chat/context.ts`), export/deletion/sessions surfaces (`src/components/settings/`). Add a comment block at the top of each markdown file listing its code dependencies.
- Contact address: `support@kolumn.app` (already used by the existing pages); the landing uses `hello@kolumn.app`. Pick one for legal notices.

## 5. Open questions
- Confirm `/legal/*` over top-level slugs; if top-level is kept, the index page and archive routes still need a home.
- Legal entity name, registered address and governing law/venue — none exists in the repo; required by every document's "who we are" and "disputes" sections.
- Language: single (English) assumed; the source's language switcher is dropped. Revisit if localisation is planned.
- Is a version archive required at launch, or is `lastUpdated` + a git-history link enough for v1? The spec assumes archive files but they can be empty at launch.
- Should legal pages follow the app theme (dark mode) once the marketing site does, or stay light-only like `LandingPage` today?
