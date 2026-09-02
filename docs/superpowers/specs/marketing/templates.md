# Templates — marketing page spec

> Source crawled: https://claude.com/plugins, https://claude.com/platform/marketplace (gallery pages) and
> https://claude.com/plugins/github, https://claude.com/platform/marketplace/vercel (detail pages) on 2026-09-02.
> Screenshots + metrics in the crawl harness `out/` dir (`plugins.*`, `marketplace.*`, `plugin-detail.*`, `marketplace-detail.*`).
> Note: `claude.com/marketplace` does not exist; the sitemap resolves it to `/platform/marketplace`.
> Kolumn routes: `/templates` (gallery) and `/templates/<slug>` (detail) · Priority: P2 · Template family: gallery

## 1. Purpose and SEO target
- **Job of this page**: let a visitor pick a ready-made board (columns + starter cards) and land in Kolumn with that board already built, so the first session starts with structure instead of an empty canvas.
- **Primary query intent**: "kanban board templates". Secondary: "sprint board template", "content calendar kanban", "job search tracker board", "weekly planner kanban", "bug triage board template".
- **`<title>`**: `Board templates — Kolumn` (26 chars). Detail: `<Template name> template — Kolumn` (e.g. `Sprint board template — Kolumn`, 30 chars).
- **Meta description** (gallery, 139 chars): `Start from a board that already has the right columns. Sprint, content calendar, job hunt, chores and more. Pick one, it's yours in a click.`
- **Meta description** (detail, pattern): `<one-line description>. Columns: <col list>. Use it in Kolumn for free.` — generated from the content record, trimmed to 155.
- **OG**: same title/description; one shared OG image for the gallery, a per-template OG image is an open question (see §5).
- **Structured data**: gallery emits `ItemList` (one `ListItem` per template, `url` → detail route) and `BreadcrumbList`; detail emits `BreadcrumbList` (Templates › name) and `FAQPage` only if the detail FAQ (§3, detail section D6) ships. The source's plugin pages emit no JSON-LD; the marketplace hub emits one `Question` node per FAQ — we consolidate into a single `FAQPage`.
- **Internal links in**: landing nav "Templates" (proposed), landing FAQ answer about setup, `/pricing` feature row "Templates", onboarding role step ("Browse all templates"), Dashboard empty state. **Links out**: `/onboarding?template=<slug>` (CTA), `/` (lockup), `/pricing`, sibling template details ("More like this"), `/help` (open question whether it exists).

## 2. Source page anatomy (what Anthropic does)

### 2a. Gallery hub (`/plugins`, 8474px tall; `/platform/marketplace`, 5138px)
1. **Nav** — 84px chrome inside a 134px `nav_component` band (transparent on page bg). Shared chrome; not re-specified here.
2. **Hero** — ≈ 800px (h1 baseline at y=368, grid heading at y=942). Container 1312 max-width inside 1440. `/plugins`: centred, h1 serif 64/70 weight 500 in a 748px column, sub 23/35 muted in a 558px column, one text CTA "Browse plugins ↓" (anchor to `#plugins`, no fill). `/platform/marketplace`: left-aligned, breadcrumb "Platform / Claude Marketplace" (12px caps-ish mono-feel), h1 72/79, sub 23/35 in an 838px column, two filled CTAs (ink primary + ink secondary). Job: one sentence of promise, then get out of the way.
3. **Browse band (filters + grid)** — the meat, ≈ 5,600px on `/plugins` (paginated to 30 tiles/page via `?page=` query). Two-column layout inside the 1312 container:
   - **Left rail** x=64→~368 (≈ 304px): section eyebrow h2 "Browse plugins" is actually rendered at the top of the grid column (x=400, serif 19/23), while the rail holds a search field (placeholder "Search connectors"), a "Works with" / "Use cases" disclosure filter (button, 20px, checkbox list), and a submit-your-own card (12/19 muted copy in a 182px column + "Get started →" link). Rail is not sticky in the crawl (position static).
   - **Grid** x=400→1375 (975px): **3 columns**, tile ≈ 315 × 152px, **16px gap** (column pitch 331, row pitch 167 → 15–16px). Tile anatomy: 1px border `rgb(232,230,220)`, **16px radius**, **16px padding**, transparent bg (hover: subtle surface tint). Contents top→bottom: title (sans 17/27, 400), description (12/19 muted, 2-line clamp with ellipsis), optional "Anthropic verified" row (seal icon 16px + 12px text), installs row (download icon 16px + "1,134,112 installs" 12px). Marketplace variant is taller (row pitch 250): logo image on top, name, description, then a use-case tag row at the bottom with a Phosphor-style outline icon ("Financial Services", "Code", "Legal").
   - **Pagination**: centred "View more" / "Load more" button, 40px tall, 16px padX, 8.5px radius, sand fill, 17px text; "Previous" link appears on page ≥2. **Empty state** (hidden until filters match nothing): "No plugins for those filters" + "Try another search or clear some of your filters." + "Clear all filters" button.
4. **Dual CTA cards** (marketplace only) — ≈ 900px band: centred pictogram (handshake), then two 465×390 cards (radius ≈ 20px, 1px border, 32px padding) with an eyebrow (17px muted), serif h3 36/42, a hairline divider, 20/32 body, full-width ink button 44px. Job: split the audience (buyer vs partner).
5. **FAQ** — ≈ 700px: centred "?" pictogram, 4–5 accordion rows, each row a button 88px tall (32px padY), question 20px, 1px hairline between rows. Job: pre-empt "is this safe / who reviews these".
6. **Footer** — 1029px dark ink band. Shared chrome.

### 2b. Detail page (`/plugins/github`, 2977px; `/platform/marketplace/vercel`, 3696px)
1. **Nav** — as above.
2. **Hero** — breadcrumb "Plugin / GitHub" (12px), h1 serif 52/62 at x=400 in a **640px centred column**, sub 23/35 in the same column, then a meta list (3 items, 12–17px, icons): "Install in Claude Code", "Made by GitHub", "Installs 319,381". Marketplace variant adds a filled "Request access" button and a "Use case · Code" tag.
3. **Media** — 16:9 video/carousel block, ≈ 975px wide, radius ≈ 16–24px, dark placeholder; carousel has Prev/Next controls and a dot indicator. Hero + media ≈ 1,419px on the marketplace detail.
4. **Body** — 20/32 paragraphs in the 640px column, 3 paragraphs (what it is, key capabilities, "How to use:" with example prompts in quotes). Marketplace version uses a bold-lead bullet list ("• Build and run …:").
5. **Related grid** — hairline top border, ≈ 530px band, **4 columns** across the full 1312 container (tile 282px content, pitch 332, same tile anatomy as the hub). No heading text (the h2 is empty in the DOM).
6. **Footer**.

### Shared numbers
- **Type scale**: h1 64/70 (hub, centred) or 72/79 (hub, left) or 52/62 (detail), serif 500 · h2 eyebrow 19/23 serif 500 · h3 card-title 17/27 sans 400 · h3 FAQ 20 · body 20/32 sans 400 · sub 23/35 · caption/meta 12/19 with 0.12px tracking.
- **Container + rhythm**: 1312 max-width in a 1440 viewport (64px gutters); browse band = 304px rail + 32px gutter + 975px grid; card radius 16 (tiles) / ≈ 20 (CTA cards); 1px borders; no shadows; button radius 8–8.5.
- **Palette roles**: page bg warm off-white; tile bg = page bg (border-only cards); text primary near-ink; muted text for descriptions and meta; accent only in the coral logo and the footer composer; ink fills for primary buttons; sand fill for the "Load more" secondary.
- **Mobile (390w)**: rail collapses into a **sticky search bar** (input ≈ 250px + a square filter-icon button) overlaying the top of the grid; grid becomes 1 column, tiles 320 × ~120–150px, 16px gap, same anatomy; hero h1 drops to ≈ 40px; CTA cards stack; related grid becomes a horizontal snap-scroll row.
- **Nav / footer**: no deviations from shared chrome.

## 3. Kolumn version

Kolumn's gallery is smaller (12 tiles, no pagination, no third-party submissions), so the page is one screen of hero, one screen of grid, and a short close. Every template tile links to a detail route so search engines get one page per use case.

### G1. Nav — keep (shared chrome). Add "Templates" to the marketing nav (open question §5).

### G2. Hero — adapt (centred, like `/plugins`; ≈ 520px instead of 800)
- **h1** (`font-heading font-[425] text-5xl leading-[1.08] tracking-tight`, max-w 640): **Boards that start with the right columns**
- **Sub** (`text-lg text-[var(--text-secondary)]`, max-w 520): Pick a template, get a board with columns and a few starter cards already on it. Rename anything, delete anything — it's a normal board from the first second.
- **CTA**: none in the hero; the grid is the CTA. A text link "See all 12 ↓" (`--text-secondary`, Phosphor `ArrowDown`) mirrors the source anchor.
- Renders with the landing page hero classes; no new component.

### G3. Filter bar + grid — adapt (drop the left rail; filters become a chip row above the grid)
Rationale: 12 tiles don't justify a 304px rail. Chips keep the "filter by use" affordance the source has, on one line.

- **Eyebrow** (mono 12px uppercase `--text-muted`, `--font-mono`): `TEMPLATES · 12`
- **Chip row** (`SegmentedControl`-style pills, 32px tall, 8px radius, 1px `--border-default`, selected = `--surface-raised` + `--text-primary`): **All · Personal · Team**. A second, optional axis is exposed as a `Menu` ("Area ▾": Engineering, Product, Marketing, Operations, Study, Life). Selection updates the URL (`/templates?use=team&area=engineering`) so filtered views are shareable; prerender only the unfiltered page.
- **Search**: `Input` with `leadingIcon={MagnifyingGlass}`, placeholder "Search templates", 40px tall, max-w 320, right-aligned on the same row as the chips. Client-side filter on name + description + column titles.
- **Grid**: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`, **gap 16px**, inside `max-w-6xl px-6 sm:px-10` (1152 max — narrower than the source's 1312; tiles land at ≈ 373px wide).
- **Tile** (new component `TemplateTile`, `src/components/marketing/TemplateTile.jsx`): `<a href="/templates/<slug>">`, `bg-[var(--surface-card)] border border-[var(--border-default)] rounded-xl p-4` (12px radius, not the source's 16 — matches Kolumn's raised tier), hover `bg-[var(--surface-hover)]`, focus-visible 1px ink ring. Anatomy top→bottom, mirroring the source's title / description / meta rows:
  1. Row: Phosphor icon 20px in a 32px `--surface-raised` square (8px radius) + name (`text-[15px] font-medium text-[var(--text-primary)]`).
  2. Description, 13px `--text-secondary`, 2-line clamp.
  3. **Column strip** (replaces "installs"): the board's column titles rendered as 4–5 mono 11px pills (`--font-mono`, `--surface-raised`, 6px radius), overflow ellipsised. This is the honest equivalent of a preview — it tells you what you'll get.
  4. Meta row: category label (12px `--text-muted`, e.g. "Team · Engineering") left; "N starter cards" right.
- **Empty state** (filters/search match nothing): `InlineNotice variant="info"` — "Nothing matches that. Try another word, or clear the filters." with `action` = "Clear filters" (ghost `Button`).
- **No pagination** ("View more" dropped; all 12 render).

#### The 12 templates (final content; `use` drives the Personal/Team chip, `area` drives the Area menu)

| # | slug | Name | One-line description | use / area | Columns |
|---|------|------|----------------------|-----------|---------|
| 1 | `weekly-planner` | Weekly planner | Everything on your mind, sorted into this week, next week and done. | Personal / Life | Inbox · This week · Next week · Done |
| 2 | `content-calendar` | Content calendar | Posts and articles from idea to published, one card each. | Team / Marketing | Ideas · Drafting · Editing · Scheduled · Published |
| 3 | `job-hunt` | Job hunt | Track every application from "saw the posting" to "signed the offer." | Personal / Life | Saved · Applied · Interviewing · Offer · Closed |
| 4 | `sprint-board` | Sprint board | The classic engineering flow with a backlog that stays out of the way. | Team / Engineering | Backlog · To do · In progress · Review · Done |
| 5 | `bug-triage` | Bug triage | Reports come in, get a severity, get fixed. Nothing falls through. | Team / Engineering | Reported · Triaged · Fixing · Verifying · Resolved |
| 6 | `event-planning` | Event planning | Venue, guests, vendors and the day-of run sheet on one board. | Team / Operations | Ideas · Booked · In progress · Day of · Wrapped |
| 7 | `onboarding-checklist` | Onboarding checklist | A new hire's first month, laid out so nobody has to ask what's next. | Team / Operations | Before day one · Week one · First month · Done |
| 8 | `grant-pipeline` | Grant pipeline | Funders to research, applications in flight, reports due. | Team / Operations | Prospects · Drafting · Submitted · Awarded · Reporting |
| 9 | `study-plan` | Study plan | Courses, readings and assignments with due dates that actually nag you. | Personal / Study | This week · In progress · Submitted · Graded |
| 10 | `client-projects` | Client projects | One column per stage of the engagement, from proposal to invoice. | Team / Operations | Proposal · Active · Waiting on client · Delivered · Invoiced |
| 11 | `product-roadmap` | Product roadmap | Now, next and later. The three columns that survive every reprioritisation. | Team / Product | Now · Next · Later · Shipped |
| 12 | `household-chores` | Household chores | Split the house's recurring jobs and see at a glance whose turn it is. | Personal / Life | This week · Doing · Done · Someday |

Starter cards (2–4 per template, used by the detail preview and seeded on "Use template"; every card carries an `icon`, `priority`, and where it helps a `checklist` or `description`, same shape as `src/data/starterBoards.js`):

- **weekly-planner** — Inbox: "Everything on your mind — one card each" (tray, medium); This week: "The one thing that matters most" (star, high); "Book the dentist" (calendar-blank, low).
- **content-calendar** — Ideas: "Brainstorm this month's topics" (lightbulb, medium); Drafting: "Launch announcement post" (note-pencil, high, checklist: Outline / Draft / Images); Published: "Welcome post" (check-circle, low).
- **job-hunt** — Saved: "Example: Product designer at Acme" (buildings, medium, description: "Link the posting, note the deadline, drop the JD in the description."); Applied: "Tailor the résumé per role" (file-text, high, checklist: Summary / Top 3 wins / Keywords); Interviewing: "Prep the three stories you'll tell" (chat-circle-dots, high).
- **sprint-board** — Backlog: "Define the sprint goal" (target, high, checklist: Write one sentence / Share with the team); "Groom the backlog" (list-checks, medium); In progress: "Your first sprint task goes here" (circle-dashed, medium).
- **bug-triage** — Reported: "Example: login button unresponsive" (bug, high, description: "Repro steps, expected vs actual, environment."); "Set up severity labels" (tag, medium, checklist: critical / major / minor); Verifying: "Confirm the fix on staging" (check-square, medium).
- **event-planning** — Ideas: "Pick a date and a budget ceiling" (calendar-check, high); Booked: "Venue deposit paid" (buildings, high); In progress: "Guest list" (users, medium, checklist: Draft / Send invites / Chase RSVPs); Day of: "Run sheet, hour by hour" (clock, high).
- **onboarding-checklist** — Before day one: "Laptop, accounts, calendar invites" (laptop, high, checklist: Laptop shipped / Email / Slack / Calendar); Week one: "Meet the team — one card per intro" (users, medium); First month: "Ship something small" (rocket-launch, medium).
- **grant-pipeline** — Prospects: "Example: Community Foundation spring round" (bank, medium, description: "Deadline, amount, fit score, contact."); Drafting: "Reusable org boilerplate" (file-text, high, checklist: Mission / Budget / Board list); Reporting: "Q1 impact report" (chart-bar, medium).
- **study-plan** — This week: "Add each assignment as a card" (plus-circle, medium, description: "Set due dates — overdue work turns copper so nothing slips."); In progress: "Reading: chapters 3–4" (book-open, medium); Submitted: "Essay draft" (paper-plane-tilt, low).
- **client-projects** — Proposal: "Example: Northwind website refresh" (briefcase, medium, description: "Scope, price, decision date."); Active: "Weekly check-in notes" (chat-circle-dots, medium); Waiting on client: "Brand assets" (image, low); Invoiced: "Kickoff deposit" (receipt, low).
- **product-roadmap** — Now: "This quarter's bet" (flag, high); Next: "Next release candidates" (stack, medium); Later: "Ideas parking lot" (lightbulb, low).
- **household-chores** — This week: "Bins out — Tuesday" (trash, medium); "Groceries" (shopping-cart, medium, checklist: Fruit / Milk / Coffee); Doing: "Fix the leaky tap" (wrench, low); Someday: "Sort the garage" (package, low).

Templates 4, 5, 11 reuse the column sets already shipped in `STARTER_BOARDS` (`engineering/sprint`, `engineering/bug-triage`, `product/roadmap`); 1 and 9 are near-copies of `other/review` and `student/coursework`. Keep them byte-identical so onboarding and the gallery never drift (see §4).

### G4. Dual CTA cards — adapt to a single close (≈ 400px)
Two cards in the source split buyers from partners; Kolumn has one audience. One card, `max-w-3xl`, `--surface-card`, 1px border, 12px radius, 32px padding:
- **Eyebrow** (mono 12px `--text-muted`): `Don't see yours?`
- **h3** (`font-heading font-[425] text-2xl`): **Start blank and let the AI lay it out**
- **Body** (15px `--text-secondary`): Type "set up a board for a podcast launch" into the pill on any empty board and Kolumn adds the columns and first cards for you. Templates are just a head start.
- **CTA**: `Button variant="primary"` (ink) "Create a free account" → `/onboarding`. Secondary ghost link "See how the pill works" → `/` landing demo anchor (open question §5).

### G5. FAQ — keep (3 items, landing `FaqItem`)
- **Is a template a normal board?** Yes. It's created as a board you own, with the columns and cards listed on its page. Rename columns, delete the starter cards, share it — nothing about it is locked.
- **Can I change a template after I've used it?** The board and the template aren't linked. Changing one never touches the other, and you can use the same template as many times as you like.
- **Do templates cost anything?** No. Templates are on every tier, including Free. The AI actions inside the board follow your plan's limits (20 messages a day on Free).

### G6. Footer — keep (shared chrome).

### Detail route `/templates/<slug>` (`TemplateDetailPage`)
- **D1. Breadcrumb** — `Templates / <name>`, mono 12px `--text-muted`, Phosphor `CaretRight` 12px. Emits `BreadcrumbList`.
- **D2. Hero** — 640px centred column like the source. h1 = template name (`font-heading font-[425] text-4xl`), sub = one-line description (18px `--text-secondary`). Meta row (12px, mono, icons 16px): `<use> · <area>` (Phosphor `Tag`), `<N> columns` (`Columns`), `<M> starter cards` (`Cards`). Primary `Button` (ink, 44px) **Use this template** → `/onboarding?template=<slug>`; ghost `Button` **Back to all templates** → `/templates`.
- **D3. Board preview** (replaces the source's video block) — new component `TemplatePreview` (`src/components/marketing/TemplatePreview.jsx`): a read-only miniature of the board, full container width (`max-w-6xl`), `--surface-page` well with 1px border and 12px radius, 24px padding, horizontally scrollable on narrow screens. Columns are 220px wide `--surface-card` panels (10px radius) with the title in 13px medium and starter cards rendered with the landing page's demo-card component (`PlanCard`/app-parity card from `LandingPage.jsx` — reuse, don't fork) at 16px card radius per the kanban exception. Empty columns show a dashed "Drop cards here" placeholder in `--text-faint`. Respects reduced motion (no entrance animation when `data-motion` says so).
- **D4. Body** — 640px column, 16px/1.6 body, three short blocks with h3s (`font-heading font-[425] text-xl`): **What's on the board** (bulleted column list with a clause each — generated from content: column title + `columnNotes[]`), **Who it's for** (`audience` paragraph), **Try saying this in the pill** (2–3 example prompts in quotes, mono 13px, `--surface-raised` chips — the source's "How to use:" prompts, made Kolumn-shaped, e.g. "move everything overdue to This week"). The pill examples must only use verbs the Free tier can do on that surface (create-type actions) unless the template is labelled Team; note the Free/Pro split in one line under the prompts.
- **D5. Related** — hairline top border, h2 "More like this" (`font-heading font-[425] text-2xl`), 3 `TemplateTile`s from the same `area` (fallback: same `use`), same grid as G3 but `lg:grid-cols-3`.
- **D6. FAQ** — reuse G5's three items verbatim (so `FAQPage` JSON-LD is identical across details); collapse by default.
- **D7. Footer**.

### Proportions kept vs changed
- **Kept**: centred hero with h1 ≈ 48–64px and a 520–640px measure; 3-column gallery with 16px gaps; tile anatomy order (title → description → meta row); 640px reading column on the detail page; related-tiles band with a hairline top border; FAQ rows ≈ 72–88px tall with a 1px divider.
- **Changed**: container `max-w-6xl` (1152) instead of 1312; tile radius 12px + `--surface-card` fill instead of 16px border-only; buttons 8px radius, ink fill, 40–44px tall (no sand "Load more"); type is Inter + Clash Grotesk (heading weight 425), no serif; mono for eyebrows/meta; left filter rail replaced by a chip row; video block replaced by a live board preview; no pagination, no third-party submission card, no "verified" badge or install counts.
- **Tokens**: `--surface-page` (page), `--surface-card` (tiles, CTA card, preview columns), `--surface-raised` (icon squares, column pills, chips), `--surface-hover` (tile hover), `--border-default`/`--border-subtle` (tiles / dividers), `--text-primary/secondary/muted/faint`, `--font-heading`, `--font-mono`, `PRIORITY_DOT` + `LABEL_BG_QUIET` from `src/utils/formatting.js` for preview cards. Lime appears only on a preview card's completed state, never on a button.
- **Mobile (390w)**: hero h1 → `text-4xl`; chip row becomes a horizontally scrollable strip with the search `Input` full-width beneath it (not sticky — the list is short); grid 1 column, tiles full-width, column strip wraps to 2 lines; preview scrolls horizontally with a fade edge; related tiles stack; "Use this template" becomes a sticky bottom bar (56px, `--surface-card`, 1px top border) on the detail page.

## 4. Data and content sources
- **Single content file: `src/content/templates.js`** exporting `TEMPLATES` (array, ordered as the table above) with the shape `{ slug, name, description, icon, use: 'personal'|'team', area, audience, prompts: string[], columnNotes: string[], columns: [{ title, cards: [{ title, icon, priority, description?, checklist?: [{text, done:false}] }] }] }`, plus `getTemplate(slug)` and `TEMPLATE_AREAS`. The `columns` shape is **exactly** what `seedStarterBoard(userId, template)` (`src/lib/seedStarterBoard.js`) already consumes, so "Use template" needs no new seeding code.
- **Three existing template sources must converge on it** — flag for the implementer:
  1. `src/data/starterBoards.js` (`STARTER_BOARDS`, 27 role-keyed onboarding starters). Proposal: keep the role → starter mapping in `starterPrompts.js`, but make each entry resolve to a `TEMPLATES` slug (`{ id: 'sprint', template: 'sprint-board' }`) so the 5 overlapping boards are defined once. Starters with no marketing tile (e.g. `design/library`, `founder/investors`) can stay in `starterBoards.js` or move into `templates.js` with `hidden: true`.
  2. `src/pages/DashboardPage.jsx` `TEMPLATES` (3 inline column-only presets: Simple / Bug Tracker / Sprint). Replace with `TEMPLATES.filter(t => t.dashboard)` so the dashboard tiles show the same names, icons and columns as the marketing gallery.
  3. `src/store/templateStore.js` is **not** a board-template store despite the name — it persists user-saved *card* templates to localStorage (`kolumn_card_templates`) from `CardDetailPanel`'s "Template" action. It does not need to import the list, but the naming collision is worth resolving (`cardTemplateStore`?) before `/templates` ships, and the marketing copy must never call user card templates "templates" in the same breath.
- **`/onboarding?template=<slug>` (proposal)**: `OnboardingPage` reads the query param; if the slug resolves, the role step is skipped and `seedStarterBoard` runs with `getTemplate(slug)` after the name step, then routes to the new board. For already-signed-in visitors, `ProtectedRoute` should forward `/onboarding?template=` to `/dashboard?template=<slug>`, where the dashboard seeds and opens the board. Both flows fire `capture('board_created', { template: slug })` (today it only sends `'custom' | 'default'`).
- **Prerender**: `/templates` and all 12 `/templates/<slug>` pages are static; the sitemap generator iterates `TEMPLATES`. Filtered gallery URLs (`?use=`) are client-side only and `noindex` via canonical → `/templates`.
- **Must stay in sync with app code**: the Free-tier "20 messages a day" figure in G5 (`tier.ts`), the create-only pill restriction on Free referenced in D4, and the card field names in starter cards (`due_date`, `assignee_name` — none used yet, but any addition must follow the DB shape).

## 5. Open questions
- Does the marketing nav get a "Templates" item, or does this page hang off the landing footer + onboarding only? (Depends on the shared chrome spec.)
- Per-template OG images (rendered board preview) vs one shared image — worth it for social sharing of `/templates/<slug>`, but needs a build-time renderer we don't have.
- The `/onboarding?template=` flow skips the role step; confirm with product whether the role answer (used for analytics/starter prompts) should still be collected afterwards.
- Should Team-labelled templates seed into a workspace (prompt to create one) or always as a personal board? The current seeder only creates personal boards (`workspace_id` null).
- The G4 card claims the pill can "add the columns and first cards" for an empty board — `add_column` is a Pro-only write tool today. Either soften the copy to "cards" for Free, or gate the claim to Pro in the sentence.
