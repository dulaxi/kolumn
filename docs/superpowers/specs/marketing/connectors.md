# Capture from anywhere — marketing page spec

> Source crawled: https://claude.com/connectors on 2026-09-02. Screenshots + metrics in the crawl harness `out/connectors.{json,txt,png,-mobile.png}`.
> Kolumn route: `/connectors` · Priority: P2 · Template family: gallery

**Honesty rule for this page.** Kolumn has no OAuth integrations. The four "sources" on this page
are *kinds of text you paste or type* — notes, an email, a chat thread, a meeting transcript — and
the AI turns them into cards. Every line of copy must survive the question "does the app do this
today?" The only forward-looking content is the clearly labelled Integrations block at the bottom.

## 1. Purpose and SEO target

- **Job of this page:** show that any block of text a person already has — notes, an email, a chat
  thread, a transcript — can be pasted into Kolumn and come out as cards, so there is no "set up
  the board first" step.
- **Primary query intent:** "turn notes into tasks" / "convert meeting notes to tasks". Secondary:
  "paste email into task board", "extract action items from Slack thread", "meeting transcript to
  kanban", "AI kanban import".
- **`<title>`** (52 chars): `Capture from anywhere — paste text, get cards | Kolumn`
- **Meta description** (147 chars): `Paste notes, an email, a chat thread, or a meeting transcript into Kolumn and the AI turns it into cards on your board. No integrations to set up.`
- **OG title:** `Capture from anywhere · Kolumn` · **OG description:** same as meta.
- **Structured data:** the source page emits none (`jsonld: []`). Emit `BreadcrumbList`
  (Home → Capture from anywhere) and `FAQPage` for the three FAQ items in §3.7 — both apply
  directly. No `Product`/`SoftwareApplication` here; that belongs on the pricing/feature pages.
- **Internal links in:** landing "Notes in, Kanban out" section (add a "See every source →" link
  under the slider), the marketing nav "Product" group, the AI feature page, the footer.
- **Internal links out:** `/signup` (primary CTA), `/pricing` (Free vs Pro AI limits), the AI
  feature page (the pill), `/privacy` (from the "what happens to my text" FAQ).

## 2. Source page anatomy (what Anthropic does)

Page is 3,965px tall at 1440w. Body 20/32 Anthropic Sans on a warm off-white; container 1,312px
(64px side gutters). Four visible bands plus nav/footer.

### 2.1 Nav + breadcrumb strip — 134px
Standard chrome (84px) plus a 49px full-width breadcrumb bar ("Connectors · Explore here →") on the
page background, 1px rule below. Exists to orient people arriving from a connector deep-link.

### 2.2 Hero — ≈ 700px (y 134 → ~830)
Centered, single column, max text width 1,038px (h1) / 698px (paragraph). ~180px top padding, a
128px line-art illustration (toolbox), then h1 64/70 Anthropic Serif 500, paragraph 23/35 in
the muted text color, one secondary button ("Browse connectors ↓", 40px tall, 8.5px radius, tinted
sand fill, 17px text, anchors to `#connectors`). No primary CTA in the hero — the page's job is
browsing, not converting. ~130px bottom padding.

### 2.3 Browse connectors — ≈ 1,300px (y ~950 → 2,200)
Two-column layout on the 1,312px container:
- **Filter rail** (left): x 64, 304px wide. "Filter" label then three accordion groups (Works
  with / Use case / Capabilities), 20px labels, caret right. Below it a **"Submit your own
  connector"** promo card: 216px wide, 16px padding, 16px radius, 1px border, white surface,
  soft shadow `0 4px 24px rgba(0,0,0,.05)`, 12/19 body, small secondary button.
- **Grid** (right): starts x 400, 976px wide. Header row = h2 "Browse connectors" 19px serif on
  the left, 242×32 search field on the right, 64px between header and first tile row.
  **Grid: 3 columns × 315px, 16px gap, 8 rows (24 tiles) per page.** Tile = 315×108, 16px padding,
  **16px radius, 1px border on the page background (no fill, no shadow)**. Inside: a 56×56 logo
  well (12px radius, 1px border, page-tinted fill) holding a 54×54 logo, 16px gap, then title
  17/27 sans 400 and description 12/19 muted, 209px text column. Row pitch 124px.
  Below the grid: centered "View more" pill (134×40, 8.5px radius, sand fill + 1px ring).
- **Category grouping:** none in the DOM — tiles are a flat alphabetical list; categories exist
  only as filter facets. Empty state ("No connectors for those filters") is in the DOM, hidden.

### 2.4 FAQ — ≈ 270px (y 2,541 → 2,808)
Left-aligned at x 400 (lines up with the grid, not the container), 640px wide. Three accordion
rows, 88px tall each, 32px vertical padding, 20px serif question, `+` toggle, 1px dividers. No
section heading. Exists to catch enterprise / developer / terms questions without leaving the page.

### 2.5 Footer — 1,029px (y 2,936 → 3,965)
Shared claude.com footer on ink. Not page-specific.

**No "how it works" section exists on the source page** — Anthropic assumes the reader already
knows what a connector is. Kolumn cannot assume that, so §3 adds one.

### Shared numbers
- **Type scale:** h1 64/70/500 serif · h2 19/23/500 serif · tile title 17/27/400 sans ·
  hero p 23/35/400 · body 20/32 · tile desc & promo 12/19 (0.12px tracking) · FAQ q 20 sans.
- **Container + rhythm:** 1,312px container, 64px gutters; two-column split 304 + 32 + 976.
  Tile radius 16px, logo well 12px, buttons 8.5px. Borders 1px, tinted-sand. Shadows: none on
  tiles, one soft shadow on the promo card.
- **Palette roles:** bg warm off-white · surface = same as bg (tiles are outlined, not filled) ·
  text near-black · muted mid-gray (p, descriptions) · button fill = sand tint · one white
  surface (promo card) · accent = the connector logos themselves.
- **Mobile (390w, 7,190px tall):** hero stacks (h1 ~40px, ~3 lines), button full-width. Filter
  rail becomes a top row of dropdowns + search; grid collapses to **1 column, tiles full-width,
  ~90px tall**; the "Submit your own" promo card moves *below* "View more". FAQ stays 3 rows.
  Nothing is hidden.
- **Nav / footer:** deviates only by the 49px breadcrumb strip under the nav.

## 3. Kolumn version

Ordered sections. Landing-page rhythm throughout: `max-w-6xl` (1,152px) container,
`px-6 sm:px-10`, `py-20` sections, section h2 `font-heading font-[425] text-3xl tracking-tight`.

### 3.1 Nav + breadcrumb — **adapt**
Shared marketing chrome (see the chrome spec). Keep the breadcrumb idea but as text inside the
container, not a full-width bar: `Kolumn / Capture from anywhere`, `text-xs font-mono
text-[var(--text-muted)]`, 24px under the nav. It doubles as the `BreadcrumbList` source.

### 3.2 Hero — **adapt** (centered, single column, no illustration)
- **h1:** `Capture from anywhere`
- **Subhead:** `Notes, an email, a chat thread, a meeting transcript — paste it into Kolumn and
  the AI turns it into cards on your board. Nothing to connect first.`
- **CTAs:** primary `Button variant="primary"` "Start free" → `/signup`; secondary
  `Button variant="secondary"` "See how it works" → `#how-it-works` (anchor, mirrors the source's
  scroll-down button). Both `size="lg"`.
- Proportions: h1 `font-heading font-normal text-5xl sm:text-6xl tracking-tight leading-[1.08]`
  (landing hero scale, not the source's 64px serif); subhead `text-lg text-[var(--text-secondary)]
  max-w-2xl leading-relaxed`. Section padding `pt-24 pb-16` — shorter than the source's ~700px
  because there is no illustration. Drop the toolbox drawing; Klay may stand in as a small
  illustration *only* if the shared chrome spec adopts a mascot slot — otherwise text-only.
- Tokens: `--surface-page`, `--text-primary`, `--text-secondary`, `--font-heading`.

### 3.3 Source tiles — **adapt** (the "connector grid", reduced to four honest sources)
- **h2:** `Four kinds of text, one board`
- **Intro (`text-base text-[var(--text-secondary)] max-w-2xl mx-auto text-center`):** `You already
  wrote it somewhere. Paste it into a board's pill and read the cards back.`
- **Grid:** `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4`. Four tiles (the source shows
  24 per page; Kolumn shows exactly what exists). Tile = `bg-[var(--surface-card)] border
  border-[var(--border-default)] rounded-xl p-5` (12px radius — Kolumn's raised radius, down from
  the source's 16px). Top: a 40×40 icon well (`rounded-lg bg-[var(--surface-raised)] border
  border-[var(--border-subtle)]`, Phosphor icon 20px `weight="regular"`), then title
  `text-base font-medium text-[var(--text-primary)]`, then the flow description
  `text-sm text-[var(--text-secondary)] leading-relaxed`. No shadow, no hover lift; hover bumps
  the border to `--border-focus`-adjacent (`var(--color-mist)`), like inputs.
  Icons reuse the landing `SLIDES` vocabulary: `Notepad`, `Envelope`, `ChatsCircle`, `Waveform`.
- **No search, no filter rail, no "submit your own" card, no "View more".** Four tiles do not
  need any of it.

Tile copy (final draft). Each description is the *actual* landing demo flow, written as a
sentence — the paste-side chrome in those demos already reads "Pasted chat" / "Pasted email" /
"Live transcript", so the copy stays consistent with what the animations show:

| Tile | Title | Description |
|---|---|---|
| Notes | **Draft notes** | Type the way you think — `redo hero`, `3 pricing tiers`, `stripe integration b4 fri`. Kolumn reads the shorthand and writes proper cards: a title, a one-line description, a label, a priority, and a due date where you hinted at one. |
| Email | **A pasted email** | Copy the body of an email that asks three people for three things. Kolumn finds each ask, turns it into its own card, assigns it to the person named, and keeps the "by tonight" as the due date. |
| Chat | **A chat thread** | Paste a thread from your team chat. Each @mention with a request becomes a card for that person — roll back the deploy, draft the status post, start the postmortem — with today or tomorrow already set. |
| Transcript | **A meeting transcript** | Drop in the transcript from your recording tool. Kolumn reads who volunteered for what and makes one card per commitment, owner and day included, so the meeting ends with a board instead of a memory. |

Footnote under the grid, `text-xs text-[var(--text-muted)] text-center`:
`Everything above is paste or type. Kolumn does not read your inbox, chat, or calls.`

### 3.4 See it happen — **new** (reuses the landing `DemoSlider`)
- **h2:** `See it happen`
- **Intro:** `The same four sources, animated. Each one loops through paste, read, and cards.`
- **Component:** mount the existing landing `DemoSlider` unchanged (tabs Notes / Email / Chat /
  Transcript, `EveryDetailDemo` → `GmailThreadDemo` → `SlackThreadDemo` → `TranscriptDemo`).
  **Do not rebuild it.** It is currently a module-private function in
  `src/pages/LandingPage.jsx` (with its data constants and `AICard`/`CreamWindow` helpers), so the
  one code change this page needs is to lift `DemoSlider` + its demo components + constants into
  `src/components/landing/DemoSlider.jsx` and import it from both pages. Keep the tab order in
  sync with §3.3's tile order (Notes, Email, Chat, Transcript) so a reader who clicks a tile can
  land on the matching slide — wire each tile as an anchor that sets the slider's active index
  (`DemoSlider` takes an optional `initialIndex` / controlled `activeIdx` prop; add it during the
  lift).
- Section: `py-20`, slider centered, `max-w-5xl` as on the landing.
- Note for implementers: the demo panels still carry hard-coded hex values inside the animation
  (a deliberate "fake app window" exception on the landing). Leave them; do not add new ones.

### 3.5 How it works — **new** (three steps; the source has no equivalent)
- **h2:** `How it works`, anchor `id="how-it-works"`.
- Layout: `grid grid-cols-1 md:grid-cols-3 gap-6`. Each step is a plain column, no card border:
  a step number in `font-mono text-xs text-[var(--text-muted)]` ("01"), a `text-lg font-medium`
  title, and a `text-sm text-[var(--text-secondary)]` body. Thin 1px `--border-subtle` rule above
  the row.

| # | Title | Body |
|---|---|---|
| 01 | Open a board | Every board has a pill at the bottom. Click it or press the shortcut — that is where text goes in. |
| 02 | Paste, or type | Drop in the email, the thread, the transcript, or just your own shorthand. A plain comma- or line-separated list skips the AI and becomes cards instantly; anything richer goes to the AI. |
| 03 | Read the cards | Cards land in the board's first column (or the one you name) with a title, description, label, priority, assignee, and due date where the text implied one. Drag, edit, or undo — they are ordinary cards. |

Under the steps, an `InlineNotice variant="info"` (mono, 1px border): `Free plans get 20 AI
messages a day and card creation from the pill. Pro adds moves, updates, and completions from
the same pill.` → link "Compare plans" to `/pricing`. Keep these numbers in sync with
`tier.ts` (see §4).

### 3.6 Integrations — **new, honest** (replaces the source's "Submit your own connector" card)
- **h2:** `Integrations`
- Not an `InlineNotice` (a notice reads as an error state). Use a single bordered panel:
  `bg-[var(--surface-card)] border border-[var(--border-default)] rounded-xl p-6 md:p-8`, with a
  small `font-mono text-[11px] uppercase tracking-wide text-[var(--text-muted)]` eyebrow reading
  `Not yet`.
- **Body:** `Kolumn does not connect to Slack, Gmail, Notion, or a calendar today. Whether it
  should — and which one first — is an open question we would rather ask than guess. If you
  paste from the same place every day, tell us which.`
- **CTA:** `Button variant="secondary"` "Tell us what to connect" → `mailto:` or the support
  address from the shared chrome spec. No waitlist, no "coming soon" badges per app, no logos
  of third-party products (the landing page removed Slack/Gmail branding for exactly this reason).
- Do not list candidate integrations as tiles; a row of greyed-out logos implies a roadmap the
  brief says does not exist.

### 3.7 FAQ — **keep**
Reuse the landing `FaqItem` accordion, `max-w-2xl mx-auto`, h2 `Frequently asked questions`.
Three items (mirrors the source's count), also emitted as `FAQPage` JSON-LD:

1. **Does Kolumn read my email or chat?** — No. Nothing is connected to your accounts. You copy
   the text yourself and paste it into a board. The AI only sees what you paste.
2. **What happens to the text I paste?** — It is sent to the AI once to produce the cards, and
   the cards are stored on your board like any other. We do not train on your content, and you
   can export or delete your data from Settings at any time.
3. **Does it work on the free plan?** — Yes. Free plans get 20 AI messages a day and can create
   cards from pasted text. Moving, updating, and completing cards from the pill are Pro.

### 3.8 Footer — **keep** shared chrome.

### Proportions kept from the source
Centered single-column hero; outlined (not filled) tiles with an icon well + title + short
description; FAQ as three 1px-divided accordion rows; scroll-anchor secondary button in the hero.

### Proportions changed for Kolumn
Container 1,152px not 1,312px; tile radius 12px not 16px; icon well 40px not 56px (the well
holds a Phosphor glyph, not a brand logo); tile grid 4 × 1 row not 3 × 8; buttons 8px radius,
ink primary; Inter + Clash Grotesk, no serif; h1 at the landing scale (48–60px) not 64px; body
16px not 20px. Filter rail, search, pagination, and promo card removed entirely.

**Mobile (390w):** hero stacks, both CTAs full-width stacked; tiles 1 column; DemoSlider is
already responsive (panels stack vertically inside each slide); steps stack 1 column; Integrations
panel keeps its padding at `p-6`; FAQ unchanged.

## 4. Data and content sources

- **Page content → `src/content/connectors.js`** (plain constants, prerendered at build):
  `HERO { h1, subhead, primaryCta, secondaryCta }`, `SOURCES[4] { id, icon, title, description,
  slideIndex }`, `STEPS[3] { n, title, body }`, `INTEGRATIONS { eyebrow, body, cta }`,
  `FAQ[3] { q, a }`, `META { title, description, og }`. Icons referenced by Phosphor name and
  resolved in the page component (same pattern as `SLIDES` on the landing).
- **Demo animations →** the lifted `src/components/landing/DemoSlider.jsx` (and its constants:
  `DRAFT_LINES`, `AI_CARDS`, `CHAT_MESSAGES`, `CHAT_AI_CARDS`, `TRANSCRIPT_PARAGRAPHS`,
  `TRANSCRIPT_AI_CARDS`, `GMAIL_PARAGRAPH`, `GMAIL_AI_CARDS`). The §3.3 tile descriptions
  paraphrase these constants — if the demo scenarios change, re-check the tile copy.
- **Must stay in sync with app code:** the "20 AI messages a day" and "create-only on Free" claims
  (`supabase/functions/chat/tier.ts`, `src/data/plans.js`); the "comma/newline list skips the AI"
  claim (`QuickAddBar.jsx` fast path); "cards land in the first column (or the one you name)"
  (verified 2026-09-02: `toolExecutor.js` `create_card` → `firstColumnOf(board.id)` when no
  `column` param is given, first by `position`).
- **No Supabase, no external fetch.** `FAQPage` + `BreadcrumbList` JSON-LD generated from the
  same constants at prerender.

## 5. Open questions

- **Integrations feedback channel:** the CTA needs a real destination (support email, a form,
  or nothing). If there is no channel yet, drop the button and keep the panel as text.
- **Should this page exist as `/connectors` at all?** The URL borrows the source's noun for a
  page that deliberately says "no connectors." `/capture` would be truer; kept `/connectors` per
  the assignment, but a redirect either way costs nothing.
- **`DemoSlider` lift:** confirm the landing owner is fine moving the slider + ~600 lines of demo
  code out of `LandingPage.jsx` into `src/components/landing/`. This page cannot ship without it.
- **Landing cross-link:** should the landing "Notes in, Kanban out" section gain a "See every
  source →" link to this page, or is one slider on the landing enough?
