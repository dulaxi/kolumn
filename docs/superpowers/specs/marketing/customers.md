# Customers — marketing page spec (hub + story template)

> Source crawled: https://claude.com/customers (hub) and https://claude.com/customers/asana (story) on 2026-09-02. Screenshots + metrics in the crawl harness `out/customers.{json,txt,png,-mobile.png}`, `out/customer-story.{json,txt,png,-mobile.png}`, plus the targeted DOM probes `out/customers-probe2.json` and `out/story-probe2.json`.
> Kolumn routes: `/customers` (hub) and `/customers/<slug>` (story) · Priority: P2 · Template family: hub (index) + article (story)

**Honesty rule for this page.** Kolumn has no named customers, no logos, and no measured outcomes. This spec
does not invent any. The hub launches as a **scenario gallery** — three or four persona-based "how people use
Kolumn" stories, each labelled *Scenario* in the tag, the card, and the hero — and the story template is built
so that the first real customer write-up drops into the same slot with `kind: customer` and nothing else
changes. The metric strip is designed and typed but renders only when a story carries real, sourced numbers.
Every feature named in a scenario is something the app does today (see `_KOLUMN-BRIEF.md`).

---

## 1. Purpose and SEO target

- **Job of this page:** let a visitor who is not sure Kolumn fits *their* kind of work find a story that looks
  like their week — and see, concretely, which boards and habits made it work — then start a board.
- **Primary query intent:** "kanban for small teams" / "AI kanban examples". Secondary: "kanban board for
  nonprofits", "task board for a two-person studio", "solo founder task management", "how to use an AI task
  board". Story pages inherit long-tail phrasing from their own headline ("kanban for a design studio").
- **`<title>`** hub (46 chars): `How people use Kolumn — scenarios | Kolumn`
  **`<title>`** story (pattern, ≤60): `<Story headline> | Kolumn` — e.g. `A two-person studio runs client work on one board | Kolumn`.
- **Meta description** hub (149 chars): `Four ways small teams run their work on Kolumn: a design studio, a nonprofit coordinator, a solo founder, a product team. Boards, the pill, chat.`
  **Meta description** story: the story's `summary` frontmatter field, capped at 155 chars at build.
- **OG title/description:** hub → same as title/meta. Story → `<headline> · Kolumn` + `summary`. OG image:
  the shared marketing card until a per-story image exists (open question).
- **Structured data:** the source hub emits none beyond the site default. Emit `BreadcrumbList` on both routes
  (Home → Customers → story). On story pages emit `Article` (`headline`, `datePublished`, `author: Kolumn`)
  only for `kind: customer`; scenario pages emit no `Article` — they are not reporting on a real organisation.
  No `Review`/`AggregateRating` anywhere: there is nothing to rate.
- **Internal links in:** marketing nav "Resources" group (`Customers`), landing FAQ "Who is this for?"
  (add "See how people use it →"), pricing page under the Team column, the footer.
- **Internal links out:** `/signup` (every CTA), `/pricing` (plan facts in the story sidebar), `/connectors`
  (when a story mentions pasting notes/transcripts), the AI feature page (the pill), `/chat` explainer if one
  exists. Story → hub via the breadcrumb and the related-stories band.

---

## 2. Source page anatomy (what Anthropic does)

Both pages: body 20/32 Anthropic Sans, ink text on warm off-white, container 1,312px (64px gutters), nav 84px
plus a 49px breadcrumb strip ("Customers · Explore here →") — total 134px of chrome before the hero.

### Hub — `/customers` (4,177px tall at 1440w)

**2.1 Hero — 687px (y 0 → 687), transparent bg.** Two-column on the 1,312 container: left text block x 400,
640 wide (a 336px empty gutter on the left — the page's grid reserves the rail column even in the hero).
h1 64/70 serif 500 "Meet the teams…" (2 lines, 120px box, y 241) · paragraph 23/35 muted, 640 wide · one
primary button (ink fill, 40px tall, ~8.5px radius, 17px text) "Contact sales". Right column (x ~1161–1380,
≈ 220 wide) is a **featured-story carousel card**: white surface, 12px radius, 16px padding; inside, a 12px/600
"Customer story" label, a 182×102 video thumbnail (4px radius, centered play button), a 12/19 muted title
(2 lines), and a small secondary "Read story" button. Under the card: prev/next 40px round arrows and 4 dots.
Four slides (Notion, Slack, Figma, HubSpot). Why: the carousel makes the page feel current without pushing
the grid down.

**2.2 Browse — 1,860px (y 687 → 2,548).** Two-column on the container:
- **Filter rail** x 64, **216px wide**, y 816. "Filter and sort" 20px heading, then six accordion rows
  (Sort by / Industry / Product / Size / Partner / Geography), 12/19 muted labels, 32px vertical padding per
  row, chevron right, 1px rule between rows. Options are radio (sort) or checkbox lists (filters) that expand
  in place. Sort options: Newest, A–Z, Z–A.
- **Grid header** at y 816 on the right: a 298×40 search field ("Search stories", magnifier icon, pill radius,
  1px border, white) on the left and a **Grid / List** two-tab toggle on the right (wrap 167×50, sand fill,
  16px radius, 4px padding; each tab 40px tall, 12px radius, active = ink text, inactive = muted).
- **Grid** x 400, **976px wide: 3 columns × 304px, column gap 32px, row gap 48px, row pitch 310px.**
  Card anatomy (304×234–261): a **logo well 304×170**, sand fill, 12px radius, 1px border (slightly darker
  sand); logo image ≈ 181×23–41 centered; **24px** below it a title 17/27 sans 400 ink, 2–3 lines, no
  description, no metric, no date. Whole card is the link ("View story" is visually hidden). Hidden per-card
  metadata (company, size, partner, geography, date, product) feeds the filters. **15 cards (5 rows)**, then a
  centered "View more" secondary button (134×40, sand fill, 8.5px radius, 17/500) at y 2,380.
- Why: a flat logo wall reads as social proof at a glance; the title does the persuading.

**2.3 CTA band — 600px (y 2,548 → 3,148), ink background.** Centered h2 64/70 serif 500 in the off-white
text color, 1,246 wide box ("Transform how your organization operates…"), one light-filled button "Get
started" (142×40, 8.5px radius) 40px below. No paragraph. Why: last conversion point before the footer.

**2.4 Footer — 1,028px.** Shared chrome.

**Mobile (390w) hub:** hero stacks (h1 ~40px, paragraph, ink CTA), the carousel becomes a 2-up horizontal
scroller of the same cards with arrows below; the filter rail collapses to a search field plus a compact
"Sort / Filter" row; grid goes 1 column with tiles ~358 wide, logo well ~200 tall; "View more" stays.

### Story — `/customers/asana` (8,641px tall at 1440w)

**2.5 Hero — 1,381px (y 0 → 1,381), transparent.** Fully centered on the container:
- Tag pill at y 245: **"Case study | Claude Platform"**, 191×30, 12/500 muted text, sand fill, 1px border,
  8px radius, 8/12 padding.
- h1 at y 307: 64/70 serif 500, up to 1,246 wide, 2 lines, centered.
- Button group at y 459: one primary ink button "Try Claude" (134×40). 96px spacer.
- **Visual panel** at y 595: x 176, **1,088 × 501**, pale sand fill, **24px radius**, decorative line arcs,
  customer logo 400×79 centered. No product screenshot here.
- **Details row** at y 1,144: same 1,088 width, **grid 3 × 341, gap 32**, each cell 109px tall with
  12px vertical / 32px left padding and a 1px left hairline. Cell 1 = **facts list**: four rows at 25px pitch,
  label 12/19 ink ("Industry:", "Company size:", "Product:", "Location:") + value 12/19 muted in a second
  column at +128px. Cells 2–3 = **metrics**: headline 25/38 serif 500 ("Years to weeks", "10x faster
  insights") over a 12/19 muted caption. Why: the numbers are the promise; the facts let the reader
  self-identify.

**2.6 Body — 5,149px (y 1,510 → 6,659).** A single **640px column at x 400** (centered on the 1,312
container) flanked by two empty 216px marginalia rails at x 64 and x 1,160 (used on other stories for side
images; empty here). Copy 20/32 sans; **h2 36/47 serif 400 with 64px above and 40px below**; bullet lists disc
with 24px indent; `strong` at 600 for in-list run-in labels; one product screenshot **640×367, 12px radius**,
no frame. There is no `blockquote` element — every quote is inline inside a paragraph with the speaker named
in the sentence. Sections observed: overview + bullets → "Improving…" → "Integrating…" → "Empowering…" →
"How AI impacts…" → "Future…". Why: a linear essay, no sidebar, keeps the reader moving.

**2.7 Related stories — 825px (y 6,787 → 7,612).** A 96×96 line-art book icon centered at y 6,916, h2
52/62 serif 500 "Related stories" at y 7,044, then **4 cards at y 7,212: 304×200, white fill, 24px radius,
1px border, 32px padding, gap 32** (x 64 / 400 / 736 / 1,072 — full 1,312 width). Card = title 17/27 serif
400 (2–3 lines, top) + caption "Customer story" 12/19 muted with a small icon pinned to the bottom.

**2.8 Footer — 1,028px.** Shared chrome.

**Mobile (390w) story:** tag, h1 (~40px, 3–4 lines), CTA stack centered; visual panel full width ~358×200;
facts and both metrics stack vertically with the hairline moving to the top of each cell; body column goes
full width (358); related cards stack 1-up.

### Shared numbers

- **Type scale:** display h1 64/70 serif 500 · band h2 64/70 · section h2 52/62 serif 500 · article h2 36/47
  serif 400 · metric 25/38 serif 500 · hero lede 23/35 sans · body 20/32 sans · card title 17/27 (sans on the
  hub, serif on related cards) · caption/label 12/19 sans (12/12 in pills) · button 17/17.
- **Container + rhythm:** 1,312px container, 64px gutters; internal 976px content column with a 216–304px
  rail; body essay column 640px. Section padding is large and asymmetric (hero ~240px top). Card radius 12px
  (logo wells), 24px (related cards, visual panel), 8–8.5px (buttons, tag pill). 1px borders on tiles and
  cards; only the hub carousel card uses a soft shadow.
- **Palette roles:** page = warm off-white; surface = white (cards) and sand (logo wells, visual panel,
  secondary buttons); text = ink; muted = warm grey; accent = none on these pages — the only colour is the
  customers' own logos. CTA band inverts to ink bg / off-white text.
- **Nav / footer:** shared chrome plus the 49px breadcrumb strip on both routes; no other deviations.

---

## 3. Kolumn version

Container: `max-w-6xl px-6 sm:px-10` (1,152px outer, 1,072px content at ≥ 640w), same as the landing. Body copy
16/26 Inter for marketing prose, 18/28 inside the story essay. Headings in `--font-heading` (Clash Grotesk,
425). No serif anywhere. All buttons are `Button` — ink `primary` for every affirmative CTA, `secondary`
(1px border, `--surface-card`) for browse/secondary actions. No lime fills; lime appears only as the
"Scenario" tag wash (`--accent-lime-wash` background, `--accent-lime-dark` text), which is a state/label use.

### Hub — `/customers`

**3.1 Breadcrumb strip — keep, shared chrome.** "Customers" in mono 12px `--text-muted` on a 1px
`--border-subtle` rule. On story pages: "Customers / <name>".

**3.2 Hero — adapt (two columns → one column + featured card).** Section `pt-20 pb-16`.
- h1 (`font-heading font-[425] text-5xl sm:text-6xl tracking-tight leading-[1.08]`, `--text-primary`,
  max-w 640): **"How people run their work on Kolumn"**
- Lede (`text-xl leading-8 --text-secondary`, max-w 560): **"Kolumn is young and we don't have customer logos
  to show you yet. What we have are four worked scenarios — the kinds of teams the product is built for,
  written out board by board. When real teams let us tell their story, they'll appear here first."**
- CTA row: `Button variant="primary" size="lg"` **"Start free"** → `/signup`; `Button variant="ghost"`
  **"See pricing"** → `/pricing`.
- Right of the lede on ≥ 1024w (grid `lg:grid-cols-[1fr_320px] gap-12`): one **FeaturedStoryCard** — the
  story with `featured: true`. 320 wide, `--surface-card`, 1px `--border-default`, 12px radius, 20px padding;
  top: `ScenarioTag`; middle: a **BoardPreview** (a static 3-column mini board drawn from the story's
  `boardPreview` frontmatter — column titles as 11px mono headers, 2–3 blank card slabs each, on
  `--surface-page`, 8px radius, 1px `--border-subtle`, ~280×140); bottom: title 15/22 `--text-primary` 2 lines
  and a `Button variant="secondary" size="sm"` "Read the scenario". No carousel, no arrows, no dots — with
  four stories, rotation is theatre. Drop the video thumbnail entirely (no video).
- Why keep a featured slot at all: it is the exact place the first real customer goes, and it forces the
  frontmatter to carry `featured` from day one.

**3.3 Browse — adapt (rail + grid → single grid with one control).** Section `py-16`, top 1px
`--border-subtle`.
- Header row: h2 (`font-heading font-[425] text-3xl tracking-tight`) **"Scenarios"** on the left; on the
  right a `SegmentedControl` **"All · Solo · Small team · Nonprofit"** bound to the `persona` field, only
  rendered when the hub has ≥ 6 stories — at launch it is hidden and the header reads **"Four scenarios"**.
  Drop the search field, the six-facet filter rail, the Grid/List toggle, sorting, and "View more": none of
  them earn their place under about a dozen stories. Reintroduce a filter rail (216px, mirroring the source)
  only when real customers push the count past ~18.
- Under the h2, a one-line `--text-secondary` note in mono 12px: **"Scenarios are illustrative — composite
  teams, real features, no invented numbers."** This is the honesty disclosure and must not be removed.
- **Grid: 3 columns, 24px gap** (`grid sm:grid-cols-2 lg:grid-cols-3 gap-6`; at 1,072 content width each
  column ≈ 341px). **StoryCard** = an `<a>` with:
  - a **preview well** 341 × 192 (16:9), `--surface-raised`, 1px `--border-subtle`, **12px radius**,
    containing the same `BoardPreview` mini board as the featured card (replaces the source's logo: we have no
    logos, and a board silhouette says more about the story than a wordmark would);
  - **16px** below: `ScenarioTag` (mono 11px uppercase-free label, "Scenario" on `--accent-lime-wash`, or
    "Customer story" on `--surface-raised` for real ones) + persona in `--text-muted` mono 11px;
  - **8px** below: title 17/26 Inter 500 `--text-primary`, 2 lines, clamp at 3;
  - **8px** below: one-line `summary` 14/22 `--text-secondary`, clamp at 2 (the source shows none; we add it
    because a persona headline alone does not tell you which scenario is yours).
  - Row pitch ≈ 330px. Hover: border to `--border-default`, no lift, no shadow (coherency rule: minimal
    shadow).
- Launch grid order: `two-person-studio`, `nonprofit-coordinator`, `solo-founder`, `five-person-product-team`.
  The featured story is not repeated in the grid.

**3.4 "Tell us your story" panel — new (replaces the source's filter-rail promo slot).** Full-width
`--surface-sidebar` panel, 12px radius, 1px `--border-default`, 32px padding, two columns on ≥ 768w.
- h3 (`font-heading font-[425] text-2xl`): **"Using Kolumn for real work?"**
- Body 16/26 `--text-secondary`: **"We'd like to write it up — a short conversation, a look at the boards you're
  willing to show, and you approve every word before it goes live. First stories replace the scenarios above."**
- `Button variant="secondary"` **"Get in touch"** → `mailto:` address or contact form (open question).
- Why: it turns the empty state into the mechanism that ends it.

**3.5 CTA band — adapt (ink band → surface band).** Section `py-20`, `--surface-sidebar` background with 1px
`--border-subtle` top and bottom, centered.
- h2 (`font-heading font-[425] text-4xl sm:text-5xl tracking-tight`, max-w 720): **"Try it on a board of your own"**
- Sub (`text-lg --text-secondary`): **"Free tier, no card, a board in under a minute. Type the first three tasks
  into the pill and see what it does with them."**
- `Button variant="primary" size="lg"` **"Start free"** → `/signup`.
- Why not the source's ink band: Kolumn's affirmative button is ink, and ink-on-ink needs a new inverted
  button variant we do not have. A raised surface keeps the existing primitive and the existing rule.

**3.6 Footer — keep, shared chrome.**

**Mobile (390w):** hero single column, featured card moves *below* the CTAs at full width; grid 1 column
(preview well 342 × 192); "Tell us your story" stacks; CTA band unchanged.

### Story template — `/customers/<slug>`

**3.7 Breadcrumb — keep.** "Customers / <story name>", the first segment links to `/customers`.

**3.8 Hero — adapt (centered, keep proportions; tag + h1 + CTA + visual panel + details row).** Section `pt-16`.
- `ScenarioTag` centered: **"Scenario · <persona>"** (or "Customer story · <industry>"). Mono 12px, 1px
  border, 8px radius, 6/10 padding — same shape as the source's 191×30 pill.
- h1 (`font-heading font-[425] text-4xl sm:text-5xl lg:text-6xl tracking-tight leading-[1.08]`, centered,
  max-w 880, `mt-4`): the story's `headline` (e.g. **"A two-person studio runs six clients on one board"**).
- `Button variant="primary"` **"Start free"** → `/signup`, centered, `mt-6`. One button only.
- **Visual panel** `mt-12`: full content width (1,072) × 420, `--surface-raised`, **12px radius** (the
  source's 24px is outside our radius scale), 1px `--border-subtle`. Content: for scenarios, a large
  `BoardPreview` (the story's `boardPreview` rendered with real card titles from frontmatter, 3–4 columns,
  Phosphor icons on cards, 1px card borders, 16px card radius per the kanban-card exception); for real
  customers, the customer's logo (max 320×80) centered on the same panel if they supply one, else the same
  board preview. Klay may sit in one corner as a 48px pixel sprite — illustration only, never named.
- **Details row** `mt-8`: `grid md:grid-cols-3 gap-6`, each cell with a 1px `--border-subtle` left rule and
  `pl-6 py-3` (mirrors 32/12 in the source).
  - Cell 1 — **facts list** (`FactsList`), mono 12px rows at 24px pitch, label `--text-primary`, value
    `--text-muted`, from frontmatter: **Team**, **Work**, **Plan**, **Boards**. Example: `Team: 2 people` ·
    `Work: Brand + web design` · `Plan: Pro` · `Boards: 3`.
  - Cells 2–3 — **metrics** (`MetricCell`): value in `font-heading font-[425] text-3xl` `--text-primary`
    over a 12/18 mono `--text-muted` caption. **Rendered only when `metrics[]` is non-empty and every entry
    has a `source`.** Scenarios ship with `metrics: []`, so cells 2–3 instead show **"What they set up"**: two
    short mono-labelled facts from `setup[]` (e.g. `The pill — every intake note becomes cards` /
    `Chat — Friday summary before the client call`). This keeps the three-cell rhythm without a fake number.
    Field definitions are in §4; the number itself is flagged **NEEDS REAL DATA** in the content file template.

**3.9 Body — adapt (640 essay column, markdown).** `mt-20`, article column `max-w-[640px] mx-auto`, prose
18/28 Inter `--text-primary`. Markdown rendered with the existing `react-markdown + remark-gfm` stack:
- h2 → `font-heading font-[425] text-2xl sm:text-3xl tracking-tight`, **`mt-14 mb-5`** (the source's 64/40
  scaled to our smaller type).
- Paragraph gap `mb-5`; lists disc, `pl-6`, `strong` 600 for run-in labels; inline `code` in
  `--font-mono` on `--surface-raised` (used for what the person typed into the pill).
- **PullQuote** (new, remark directive or a fenced `> quote` block with an attribution line): 20/30 Inter
  500 `--text-primary`, 3px `--border-default` left rule, `pl-6 my-10`, attribution mono 12px `--text-muted`
  below. The source has no block quotes; we add one per story because a persona's own words are the only
  "voice" a scenario has. Attribution for scenarios is the persona's first name + role and is marked
  *(composite)* in the mono line — never a real-sounding full name.
- Optional screenshot figure: 640 wide, 12px radius, 1px `--border-subtle`, mono 12px caption. Use real app
  screenshots only (boards seeded from the scenario's frontmatter); no mock UI.
- Drop the marginalia rails. Drop inline "Play video".

**3.10 Related stories — adapt.** `mt-24 py-16`, 1px `--border-subtle` top. Drop the 96px book icon (no
line-art illustration system in Kolumn; an optional 32px Phosphor `Kanban` icon in `--text-muted` above the
heading is enough). h2 `font-heading font-[425] text-3xl` centered **"More scenarios"** (or "More stories"
once any real one exists). Below: **`grid sm:grid-cols-2 lg:grid-cols-3 gap-6`** of `StoryCard` (same
component as the hub, so 3 cards not 4 — 4 × 304 assumes a 1,312 container we don't have). Picks from
`relatedSlugs`, falling back to the next three by grid order.

**3.11 Story CTA band + footer — keep (same band as 3.5).**

**Mobile (390w) story:** tag/h1/CTA centered, panel 342 × 220 with the preview reduced to 2 columns, details
row stacks with the rule moving to the top of each cell, essay column full width at 17/27, related cards
stack.

### Proportions kept from the source

- Two-level hierarchy on the hub (featured slot + flat grid) and the essay-only story body with no sidebar.
- Story hero order: tag → h1 → single CTA → visual panel → three-cell details row (facts, metric, metric).
- Essay column width 640px; article h2 spacing ratio (~1.6× above vs below); 12px preview-well radius;
  1px-bordered tiles with no shadow; 3-column card grid with the title *below* the visual, not overlaid.
- Facts list as label/value mono rows; metric = big value over small caption.

### Proportions changed for Kolumn

- Container 1,152/1,072 instead of 1,312 → grid columns ~341 with 24px gaps instead of 304/32/48.
- All 24px radii → 12px; 8.5px buttons → 8px `Button`; serif display → Clash Grotesk 425; 64px display →
  48–60px; body 20/32 → 16/26 (marketing) and 18/28 (essay).
- Ink CTA band → `--surface-sidebar` band so the ink `Button` stays the only primary.
- Logos → `BoardPreview` silhouettes; video thumbnails, carousel, filter rail, search, view toggle, pagination
  → dropped at launch, with the re-entry thresholds stated in 3.3.

### Components

Existing: `Button`, `SegmentedControl` (hidden until ≥ 6 stories), `KolumnLockup` (chrome), `Tooltip`,
landing nav/footer, `react-markdown`. New, all under `src/components/marketing/customers/`: `StoryCard`,
`FeaturedStoryCard`, `ScenarioTag`, `BoardPreview` (static, no dnd-kit), `FactsList`, `MetricCell`,
`PullQuote`, `TellUsPanel`. Pages: `src/pages/marketing/CustomersPage.jsx`, `CustomerStoryPage.jsx`.

### The four launch scenarios — full copy

Each is a complete `src/content/customers/<slug>.md`. Frontmatter fields are defined in §4. Personas are
composites and are labelled as such on the page; names are first names only.

---

#### `two-person-studio.md`

```yaml
---
slug: two-person-studio
kind: scenario
persona: small-team
featured: true
published: 2026-09-02
name: A two-person design studio
headline: A two-person studio runs six clients on one board
summary: Two designers, six retainers, one board. Client emails go in through the pill and come out as cards nobody has to retype.
role: Co-founders, brand and web design
industry: Design services
teamSize: 2 people
plan: Pro
boards: 3
quote: We stopped keeping a separate list of "things the client mentioned." The board is the list now.
quoteBy: Mara, co-founder (composite)
metrics: []   # NEEDS REAL DATA — see §4 for the shape
setup:
  - label: The pill
    text: Every client email is pasted in and becomes cards
  - label: Chat
    text: A Friday summary before each retainer call
boardPreview:
  columns:
    - title: Requests
      cards: [Homepage hero copy v2, Add pricing table, Swap founder headshots]
    - title: In progress
      cards: [Case study layout, Brand deck refresh]
    - title: With client
      cards: [Nav restructure proposal]
    - title: Done
      cards: [Q3 newsletter template, Favicon set]
relatedSlugs: [solo-founder, five-person-product-team]
---
```

**Body**

Mara and Teo run a two-person studio doing brand and web work for six retainer clients. Before Kolumn they
had a Trello board per client, a shared doc per client, and a habit of promising things in email that never
made it onto either. Every Monday started with twenty minutes of reconciling the three.

## The board

They have three boards now, not six. One board, **Client work**, has four columns: Requests, In progress,
With client, Done. Every card carries a label with the client's name, so a filter on the label is the
per-client view they used to keep as separate boards. The other two boards are **Studio** (their own site,
invoicing, hiring a contractor) and a **Pitch template** they duplicate when a new prospect appears.

## What the pill changed

The habit that made the difference is small. When a client email arrives, Mara pastes the body into the pill
on the Client work board and types one line on top: `client: Harbor, due Friday`. The AI reads the email,
makes a card for each request it finds, labels them Harbor, and sets the due date. She checks the titles,
deletes one if the AI over-read a pleasantry as a task, and moves on.

> We stopped keeping a separate list of "things the client mentioned." The board is the list now.
> — Mara, co-founder (composite)

Short lists skip the AI entirely. Teo types `favicon set, og image, 404 page` into the pill and gets three
cards in the Requests column immediately — no model call, no wait.

## Friday

Before each retainer call they open Chat and ask what moved for that client this week. The answer is a
summary drawn from the board — what's done, what's waiting on the client, what's overdue. Chat only reads;
nothing changes unless they go back to the board and change it. That is the part they trust.

## What it costs them

Both are on Pro. The free tier would cover the pasting habit (it allows create-type actions), but they use
"move everything tagged Harbor that's done to Done" style requests often enough that the write tools earn
the price.

---

#### `nonprofit-coordinator.md`

```yaml
---
slug: nonprofit-coordinator
kind: scenario
persona: nonprofit
featured: false
published: 2026-09-02
name: A volunteer coordinator at a food bank
headline: One coordinator, forty volunteers, and a board that survives the weekend
summary: A part-time coordinator turns Sunday-night meeting notes into a week of shifts and tasks, and shares the board with people who never log in.
role: Volunteer coordinator (part-time)
industry: Nonprofit
teamSize: 1 staff + 3 shift leads
plan: Free
boards: 2
quote: I'm not going to teach forty people a tool. I needed something where the board is the whole tool.
quoteBy: Devi, volunteer coordinator (composite)
metrics: []   # NEEDS REAL DATA
setup:
  - label: The pill
    text: Sunday meeting notes pasted in, split into the week's cards
  - label: Sharing
    text: The board shared with three shift leads; the rest get a printout
boardPreview:
  columns:
    - title: This week
      cards: [Tue delivery — 2 drivers, Sort donations Wed, Call the bakery]
    - title: Needs a volunteer
      cards: [Saturday front desk, Spanish-speaking intake]
    - title: Done
      cards: [Order pallets, Update signage]
relatedSlugs: [two-person-studio, solo-founder]
---
```

**Body**

Devi coordinates about forty volunteers for a neighbourhood food bank, fifteen hours a week. The job is
mostly logistics: who drives on Tuesday, who sorts on Wednesday, which shift still has nobody. The tool
before Kolumn was a group chat and a paper sign-up sheet that lived in a drawer.

## Two boards, one of which matters

The board that matters is **This week**. Three columns: This week, Needs a volunteer, Done. Cards are shifts
and errands. A card in *Needs a volunteer* is the whole recruiting system — when someone says yes, Devi types
their name as the assignee and drags the card left.

The second board, **Grants and admin**, is hers alone and is the kind of thing that used to be a folder of
emails.

## Sunday night

The planning meeting is Sunday evening and produces a page of notes. Devi pastes the whole page into the pill
and lets the AI split it into cards. It gets the shifts, the dates, and most of the errands. It occasionally
makes a card out of a sentence that was just a complaint about the freezer. She deletes those.

> I'm not going to teach forty people a tool. I needed something where the board is the whole tool.
> — Devi, volunteer coordinator (composite)

## Who sees it

Three shift leads are members of the board and see changes as they happen. Nobody else has an account — Devi
takes a screenshot of the board on Monday morning and posts it to the group chat. Kolumn does not need forty
users for one person to get value from it, and that was the point.

## Free tier, on purpose

Devi is on the free plan. The daily allowance of AI messages covers one Sunday paste and a few mid-week
additions. She has not needed the paid write tools: moving cards by hand is fine when there are twelve of
them.

---

#### `solo-founder.md`

```yaml
---
slug: solo-founder
kind: scenario
persona: solo
featured: false
published: 2026-09-02
name: A solo founder shipping a paid app
headline: A solo founder keeps product, support, and marketing on one screen
summary: One person, three kinds of work, no project manager. The board is the only place the plan exists, and chat is how she asks it what's next.
role: Founder and only employee
industry: Software
teamSize: 1
plan: Pro
boards: 1
quote: The dangerous thing about working alone is that the plan lives in your head. Now it lives on the board and I can ask it questions.
quoteBy: Lena, founder (composite)
metrics: []   # NEEDS REAL DATA
setup:
  - label: The pill
    text: Support emails and feature ideas typed in as they arrive
  - label: Chat
    text: "What's overdue?" every morning instead of scrolling
boardPreview:
  columns:
    - title: Ideas
      cards: [CSV import, Dark mode, Annual plan]
    - title: Now
      cards: [Fix export bug, Stripe webhook retry]
    - title: Support
      cards: [Refund — order 4471, Onboarding email typo]
    - title: Shipped
      cards: [Password reset flow]
---
```

**Body**

Lena builds and sells a small scheduling app. She writes the code, answers the support inbox, and does the
marketing, alone. She has tried task managers that wanted her to set up projects and sprints for a team of
one, and stopped using each of them within a month.

## One board with four columns

Ideas, Now, Support, Shipped. That is the entire system. Cards get a priority and sometimes a due date;
nothing else is required. Support tickets are cards in the Support column with the customer's order number
in the title, which is enough to find them again with search.

## How things get on the board

Mostly through the pill, mostly in one line. `refund order 4471, high priority` becomes a card in Support with
the priority set. A longer support email gets pasted in whole and comes back as one or two cards with the
actual request extracted from the apology and the context.

Feature ideas arrive the same way, usually at night: `idea: annual plan with two months free`. The AI puts it
in Ideas because the board's column names make the intent obvious.

> The dangerous thing about working alone is that the plan lives in your head. Now it lives on the board and I
> can ask it questions.
> — Lena, founder (composite)

## Morning

The first thing she does is open Chat and ask what is overdue and what is in Now. It answers from the board.
She does not use it to change anything — that stays a deliberate act on the board itself — but she has stopped
scrolling the columns to build the day's list in her head.

## Why Pro

The write tools. "Move everything in Support older than a week to Shipped if it's completed" is a sentence,
not a ten-minute tidy. At $8 a month it replaced two tools she was paying more for and using less.

---

#### `five-person-product-team.md`

```yaml
---
slug: five-person-product-team
kind: scenario
persona: small-team
featured: false
published: 2026-09-02
name: A five-person product team
headline: A five-person team replaced its stand-up with a board and a question
summary: Two engineers, a designer, a PM, and a founder share a workspace. Meeting transcripts go in through the pill; the Monday stand-up became a chat summary.
role: Product manager
industry: Software
teamSize: 5
plan: Pro
boards: 4
quote: We kept the Kanban. We just stopped being the ones who typed everything into it.
quoteBy: Jonah, product manager (composite)
quoteAttribution: composite
metrics: []   # NEEDS REAL DATA
setup:
  - label: Workspace
    text: One workspace, four boards, everyone a member
  - label: The pill
    text: Meeting transcripts pasted in after each planning call
boardPreview:
  columns:
    - title: Backlog
      cards: [Bulk invite flow, Audit log export, Empty-state copy]
    - title: This sprint
      cards: [Invite email template, Role picker UI, Rate-limit banner]
    - title: Review
      cards: [Session revoke endpoint]
    - title: Done
      cards: [Workspace switcher, Member list]
relatedSlugs: [two-person-studio, solo-founder]
---
```

**Body**

Five people: two engineers, a designer, a product manager, and the founder who still writes code on
Thursdays. They had used Asana with custom fields and a Notion roadmap and a Slack channel for the actual
decisions. Nobody could say which of the three was true.

## The workspace

One Kolumn workspace, four boards, all five people members of all four. **Product** is the main board with
Backlog, This sprint, Review, Done. **Bugs**, **Design**, and **Ops** are smaller and quieter. Realtime sync
means the board on the designer's screen is the board on the PM's — no refresh, no "did you see my update."

## After the planning call

The planning call is recorded and transcribed. Jonah pastes the transcript into the pill on the Product
board with `sprint 14` typed above it. The AI pulls out the commitments — the things someone said they would
do — and makes a card for each, assigning it to the person who said it. He reads the list against his own
notes. It usually gets nine out of ten; the tenth is a sentence that sounded like a commitment and wasn't.

> We kept the Kanban. We just stopped being the ones who typed everything into it.
> — Jonah, product manager (composite)

## The stand-up that became a question

Monday stand-up is now the PM opening Chat and asking what moved on Product since Friday and what is stuck
in Review. The summary goes into the team channel. People still talk — but about the two cards that need a
decision, not about reading the board aloud.

## Things that stayed manual

Dragging cards. Assigning the designer to a card because you know she's the right person, not because a
transcript said so. Deleting cards, which asks for confirmation and can be undone. The AI creates and moves;
the humans decide.

## Plan

Everyone is on Pro. The team tier exists but its pricing is not published yet, which is the honest answer
to "why not Team."

---

## 4. Data and content sources

**Content lives in `src/content/customers/*.md`**, one file per story, loaded at build with
`import.meta.glob('/src/content/customers/*.md', { query: '?raw', eager: true })` and a small frontmatter
parser (`front-matter` or a 30-line YAML-subset parser — decide with the shared marketing-loader spec; every
`src/content/*` page should use the same one). Markdown body is rendered by the existing `react-markdown +
remark-gfm` stack plus one custom renderer for the pull quote (a `>` block whose last line starts with `—`).
The hub builds its list from the same glob, filtered to `kind` and sorted by `published` desc, `featured`
first. Prerender emits `/customers` and `/customers/<slug>` from the file list; sitemap entries come from
the same array.

**Frontmatter schema** (validate with `zod` at build; fail the build on a bad file):

| Field | Type | Notes |
|---|---|---|
| `slug` | string | must equal the filename |
| `kind` | `'scenario' \| 'customer'` | drives `ScenarioTag`, `Article` JSON-LD, and the "(composite)" attribution |
| `persona` | `'solo' \| 'small-team' \| 'nonprofit' \| 'other'` | powers the `SegmentedControl` once ≥ 6 stories |
| `featured` | boolean | exactly one `true` across the set; build warns otherwise |
| `published` | ISO date | sort key; `datePublished` for real stories |
| `name`, `headline`, `summary` | string | card name / h1 / card + meta description (≤ 155) |
| `role`, `industry`, `teamSize`, `plan`, `boards` | string / string / string / `'Free' \| 'Pro' \| 'Team'` / number | the `FactsList` |
| `quote`, `quoteBy` | string | hero-adjacent pull quote; `quoteBy` must end in "(composite)" when `kind: scenario` (build check) |
| `metrics` | `Array<{ value: string; label: string; source: string }>` | **Rendered only when non-empty and every entry has `source`** (what was measured, over what period, who supplied it). Scenarios must have `[]`. **NEEDS REAL DATA.** |
| `setup` | `Array<{ label: string; text: string }>` | fills metric cells 2–3 when `metrics` is empty; max 2 |
| `boardPreview` | `{ columns: Array<{ title: string; cards: string[] }> }` | 2–4 columns, ≤ 3 cards each; drawn by `BoardPreview` |
| `logo` | optional path under `public/customers/` | real customers only; shown in the visual panel |
| `relatedSlugs` | string[] | optional; falls back to grid order |

**Must stay in sync with app code:**
- `plan` values and the price quoted in copy ("$8 a month") → `UpgradeProPage.jsx` / `tier.ts`. Put the price
  in the shared marketing constants file the pricing spec defines and interpolate it; never hardcode it in a
  story body.
- Free-tier facts in the nonprofit story (daily message allowance, create-only pill) → `tier.ts` (`20`/day,
  create tools). Phrase as "the daily allowance" in prose so a limit change does not stale the story; the
  exact number lives only on `/pricing`.
- Feature claims in every story are checked against `_KOLUMN-BRIEF.md` → *Real features*. In particular:
  transcripts and emails are *pasted*, never "connected"; chat is read-only; the team tier price is
  unpublished.
- `BoardPreview` card styling mirrors `src/components/board/Card.jsx` (16px radius, 1px border) so the
  preview looks like the product.

No Supabase reads on these routes. No analytics events beyond the shared marketing page-view.

---

## 5. Open questions

1. **Real customer stories.** Who are the first two or three teams we can ask, what consent/approval flow do
   we run (quote sign-off, logo use, right to withdraw), and where does the "Get in touch" button go — a
   mailbox or a form? Until one exists, should `/customers` ship indexable, ship with `noindex`, or hold?
2. **Metrics.** What can we actually measure for a customer with their permission (cards created via the
   pill per week, time from paste to first card, boards shared)? The `metrics[].source` field is defined but
   the measurement method is not.
3. **Team tier.** Two scenarios say the team price is unpublished. If pricing lands before this page, update
   the `five-person-product-team` "Plan" section and the facts value.
4. **Visual panel imagery.** Board previews are drawn from frontmatter; do we also want real screenshots
   (seeded boards, captured in-app) per story, and a per-story OG image generated at build?
5. **Persona filter threshold.** Six stories was a guess for when the `SegmentedControl` earns its place;
   confirm, and decide whether the filter rail from the source ever returns.
