# Features hub — marketing page spec

> Source crawled: https://claude.com/product/overview (hub), with https://claude.com/claude-in-chrome and https://claude.com/product/tag as the feature-page references, on 2026-09-02. Screenshots + metrics in the crawl harness `out/` dir (`features-hub.*`, `feature-chrome.*`, `feature-slack.*`).
> Kolumn route: `/features` · Priority: P1 · Template family: hub

## 1. Purpose and SEO target
- **Job of this page**: show, in one scroll, the six things Kolumn does that a plain kanban does not, and route the reader to the right deep page (`/features/<slug>`) or straight to signup.
- **Primary keyword / query intent**: "AI kanban board features". Secondary: "kanban with AI assistant", "kanban board with chat", "trello alternative with AI", "team kanban realtime".
- **`<title>`**: `Features — Kolumn, the AI kanban` (32 chars) · **meta description**: `Type what you need and cards appear. Ask about your boards in chat. Workspaces, templates, realtime sync, and keyboard search — all in a kanban that stayed a kanban.` (152 chars) · **OG title**: `Kolumn features` · **OG description**: same as meta.
- **Structured data**: `BreadcrumbList` (Home → Features) and `ItemList` of the six feature pages. The source hub emits no JSON-LD at all; the individual Chrome page emits `Question` blocks for its FAQ, so FAQ schema lives on feature pages, not here. Skip `Product` (that belongs to `/pricing`).
- **Internal links in**: landing nav "Features", footer "Product" column, `/pricing` feature-comparison rows, each `/features/<slug>` page's breadcrumb. **Links out**: six `/features/<slug>` pages, `/pricing`, `/signup` (primary CTA), `/security` (from the realtime/workspaces row).

## 2. Source page anatomy (what Anthropic does)

`/product/overview` is Anthropic's "Meet Claude" hub: 8,032px tall at 1440w, 5 sections plus footer, `<main>` container 1312px wide (64px page gutters). Every section opens with a ~600px "breathing" block — a small line illustration centered, then empty space — before content appears; it reads as a scroll pause, not a header.

`## 1. Hero` — 937px · 1312 container · no explicit padding (grid-centered) · page bg · 2 cols: text 528px wide at x=64, illustration ~700px on the right · h1 64/70 serif 500, subhead 20/32 muted · CTA = an input-shaped pill (`How can I help you today?`) with an accent submit button inside (h=36, radius 7.5) — the CTA *is* the product. A floating "Latest news" toast (380×210, radius 16) sits bottom-right. Why: puts the product's own input in the reader's hands above the fold.

`## 2. Three-benefit split` — 1,747px · bg secondary (warm sand) · left rail 362px at x=64 with three h3 19/23 serif rows separated by 1px rules, each with a 15/24 body and a 20px line icon · right ~900px: animated mind-map illustration · then a full-width white banner card (1312×184, radius 32) with a 30/38 serif two-line headline and one ink button ("Start importing") right-aligned. Why: this is the positioning section — three reasons in a list, one big illustration, one lateral CTA.

`## 3. Tabbed showcase` — 1,456px · bg white · a 6-tab pill group (h=40, radius 12, active tab white on sand) at x=176 → a media panel 1088×612 (16:9, radius 32, tinted background with an inset "Prompt / Connectors" dark card) → caption row split 50/50 inside an 864px inner column (x=288..1152): h3 25/38 serif left, 15/24 body + secondary pill button "Explore Claude Cowork" right. Why: one demo per tab; the caption row is how the hub links to individual product pages — a small secondary button, **not** a card grid.

`## 4. Video + question banner` — 1,559px · page bg · 1088×?? video card (radius 32, dark) with centered 80×80 play button → same 50/50 caption row (h3 25/38 "Your curiosity's collaborator" left, one-line body right) → a white banner card (1312×184, radius 32) with a 38/46 serif question left and the input-pill CTA right. Why: emotional beat, then a second chance to type.

`## 5. Model list` — 1,304px · bg secondary · container narrows to **960px** · three stacked white cards (960×~220, radius 24, 32px gap), each 50/50: 36/47 serif name left; 20/28 headline, 13px bullet-dot meta line, and a secondary "Model details →" button right. Why: a compact list-of-siblings pattern — the closest thing the hub has to "cards linking to sub-pages."

`## Footer` — 1,029px dark ink, 5 link columns + an input pill in the brand column.

Shared numbers:
- **Type scale**: h1 64/70/500 serif (feature pages go to 72/79) · section h2 52/62/500 serif (used as an animated intro heading, often empty in DOM) · h3 25/38/500 serif (caption rows) and 19/23/500 serif (grid cards) · body 20/32 (hero subhead), 15/24 (cards), 12/19 with 0.12px tracking (captions/notes) · nav 20/400 sans.
- **Container + rhythm**: 1312px max (1440 − 2×64); inner content column 864px for caption rows; 960px for the list section. Sections 1,300–1,750px tall, ~600px of which is the illustration pause. Card radius 32 (media/banners), 24 (list cards), 16 (toasts), 12 (tabs/buttons), 8 (small secondary buttons). Borders 1px at ~8% ink. Shadow only on the floating toast.
- **Palette roles**: page bg warm off-white; secondary bg warm sand; surface white; text ink; muted ~55% ink; accent = terracotta, used only for the submit arrow button and the logo mark; ink buttons for primary actions.
- **Mobile (390w)**: 9,205px tall. Hero stacks text over illustration, input pill goes full-width; the three-benefit rail stacks above the mind-map; tab groups become a horizontally scrolling strip; media panels keep radius and go full-bleed minus 16px gutters; caption rows stack (h3 above body); model cards stack the two halves. Nothing is hidden except the floating news toast.
- **Nav / footer**: shared chrome; the hub adds a 52px sub-nav strip under the header ("Product · Explore here ▾") — a breadcrumb + section jump menu.

## 3. Kolumn version

Six features, one page, ordered by how a new user meets them: the pill, chat, workspaces, templates, realtime sync, search & shortcuts. Keep Anthropic's rhythm of *media panel → split caption row → small secondary link* for each feature; drop the 600px illustration pauses (they need custom line art we do not have, and they double page height). Target ≈ 5,200px at 1440w.

### 1. Hero — keep, adapt
- **Eyebrow**: `Features` (mono 12px, `--text-muted`, tracking 0.04em).
- **h1**: `Everything the board does that you used to do`
- **Subhead**: `Kolumn is a kanban with an AI layer on top. Type what you need and the cards appear. Ask a question and the answer comes from your own boards. The rest is the kanban you already know.`
- **CTA**: the pill, rendered inert as a demo input: placeholder `Type a task or paste notes...` with an ink `ArrowUp` submit button (`Button size="icon-sm"`). Clicking anywhere on it navigates to `/signup`. Secondary text link below: `See pricing →` → `/pricing`.
- **Right column**: a static board illustration — three columns, five cards, one card mid-drag — built from the landing page's existing demo card components (`PlanCard`-style tiles), not a screenshot.
- **Layout**: 2 cols, text 528px left at the container edge, media right; section height 720px (source 937 minus the news toast allowance). Drop the floating toast.
- **Primitives**: `Button`, landing `Section`/container, existing demo card tiles. **Tokens**: `--surface-page`, `--text-primary`, `--text-secondary`, `--font-heading` (weight 300 for this pre-auth display size, per the brief), `--font-mono` for the eyebrow.

### 2. Three reasons — keep, adapt
Left rail (362px) with three rows separated by `1px solid var(--border-subtle)`, Phosphor icon 20px `regular` weight; right side reuses the hero board illustration in a "captured from anywhere" state: a note, a pasted thread, and a transcript feeding cards into the board. Banner card below.
- **h3 / body rows**:
  1. `Sparkle` — **`Write it, don't file it`** — `Cards come from plain sentences. No form, no required fields, no picking a column first.`
  2. `ChatCircle` — **`Ask instead of scroll`** — `Chat reads your boards and answers in words: what is overdue, what shipped this week, what is still open.`
  3. `Kanban` — **`Still a kanban`** — `Columns, drag-and-drop, due dates, labels, checklists. Nothing to learn twice.`
- **Banner card** (radius 12, `--surface-card`, 1px `--border-default`, 1312×160): headline `Coming from Trello, Asana, or Notion?` / second line `Paste your list into the pill and it becomes a board.` · ink `Button` `Start free` → `/signup`.
- **Tokens**: section bg `--surface-raised`, rails `--border-subtle`, icons `--text-secondary`.

### 3. Feature showcase — keep, adapt (this is the core of the page)
One `FeatureTabs` block per feature is too heavy; instead use **one** tab group for the two AI surfaces (the pill, chat) followed by **four** stacked rows for the rest. Both follow the source proportions.

**3a. Tabbed AI showcase** — tab pills `SegmentedControl`-style (h=40, radius 8, active `--surface-card` on `--surface-raised`) with two tabs: `The pill` · `Chat`. Below: media panel 1088×612 (16:9, radius 12, bg `--surface-raised`, 1px `--border-default`) containing a looping animation (or a static frame with reduced motion) of the real component: the pill expanding, three progress rows appearing (`Check` icon mono 12px, exactly as `QuickAddBar` renders them). Caption row split 50/50 inside an 864px inner column:
- Tab "The pill": **h3** `Type it, and it is on the board` · body `Open the pill on any board and say what you need. "Move the login bug to In review and give it to Sam." The AI creates, moves, updates, and completes cards on that board — and only that board. Paste a comma or newline list and it becomes cards instantly, no AI involved.` · `Button variant="secondary" size="sm"` `Explore the pill →` → `/features/pill`.
- Tab "Chat": **h3** `Ask your boards a question` · body `Chat is the conversation side. What is overdue on the launch board? What did we finish this week? It reads your boards and answers. It never edits them.` · secondary `Explore chat →` → `/features/chat`.

**3b–3e. Feature rows** — four rows, each `media panel 1088×612 + caption row`, alternating media background between `--surface-raised` and `--surface-card` so the scroll does not flatten. Media is a static product frame (real UI, real tokens, mocked data), not illustration.
- **Workspaces** — h3 `One board, or a whole team` · body `Boards live in workspaces with members and invitations, or stay personal and get shared one board at a time. Members see what they are invited to and nothing else.` · `Explore workspaces →` → `/features/workspaces`. Media: the workspace dropdown in its three states (`CubeFocus` All / `Cube` Personal / filled `Cube` workspace).
- **Templates** — h3 `Start from something` · body `Board and card templates so the third sprint board looks like the first two. New accounts open on a getting-started board that explains itself.` · `Explore templates →` → `/features/templates`. Media: the getting-started board.
- **Realtime sync** — h3 `Everyone sees the same board` · body `Move a card and your teammates see it move. Edits sync live across members. No refresh, no "who has the latest."` · `Explore sync →` → `/features/sync`. Media: two browser frames side by side, same card mid-move in both.
- **Search and shortcuts** — h3 `Find it without leaving the keyboard` · body `⌘K or / opens search across every board. N starts a new card, ⌘B tucks the sidebar. Undo is one click away on anything destructive.` · `Explore search →` → `/features/search`. Media: the `SearchDialog` over a dimmed board.

Caption rows: h3 `font-heading font-[425] text-2xl` (source 25/38 → 24/32), body `text-[15px] leading-6 text-[var(--text-secondary)]`, buttons `Button variant="secondary" size="sm"` (source 28px pill → our 32px, radius 8). Row spacing 96px between rows, 112px above the first.

### 4. Video + question banner — drop
No video exists. The question banner is folded into the closing CTA below.

### 5. Plans list — adapt into "What each plan includes"
Container 960px, two stacked cards (radius 12, `--surface-card`, 1px `--border-default`, 40px padding), 50/50 split:
- **Free** — right: `Every board feature. 20 AI messages a day.` · meta line (mono 12px, `--text-muted`, dot separators): `Pill creates cards · Chat answers in text · Unlimited boards` · secondary `Compare plans →` → `/pricing`.
- **Pro** — right: `Every AI action. $8 a month.` · meta: `Pill moves, updates, completes · Chat reads your boards · 7-day trial` · ink `Button` `Start Pro trial` → `/signup?plan=pro`.
Card name left in `font-heading font-[425] text-4xl`. Numbers must come from `src/content/plans.js` (see §4), never typed inline.

### 6. Closing CTA — keep (from source's ink footer band, 602px on feature pages)
Full-bleed band, bg `--surface-sidebar` in light theme (ink), 320px tall, centered: h2 `Start with a board. The AI shows up when you type.` · ink-on-light `Button` `Create a free account` → `/signup` · text link `or read about security →` → `/security`. Tokens only; no lime.

**Proportions kept**: 1312 container at 1440 (`max-w-[1312px] px-16`, collapsing to the landing's `max-w-6xl px-6 sm:px-10` below 1280), 1088-wide media panels, 16:9 media, 864px caption column split 50/50, 960px plan list, 40px tab height, 128px section gaps.
**Proportions changed**: radii 32/24 → 12 (panels, banners) and 8 (tabs, buttons); serif headings → Clash Grotesk 425; body 20/32 → 17/28 for the hero subhead and 15/24 unchanged elsewhere; drop the 600px illustration pauses; hero 937 → 720; section heights ~1,450 → ~900 each.

**Mobile (390w)**: hero stacks text → demo pill → illustration; three-reasons rail stacks above its media; tab strip scrolls horizontally with 16px gutters; media panels become 358px wide at aspect 4:3 (cropped frame, `object-position: left top`); caption rows stack; plan cards stack name over details; closing band keeps its height.

## 4. Data and content sources
- **Page copy**: `src/content/features.js` exporting `FEATURES` (ordered array of `{ slug, title, tagline, hubHeading, hubBody, icon, mediaKey }`) plus `FEATURES_HUB` (`hero`, `reasons[]`, `banner`, `closing`). The hub renders `FEATURES` in order; `/features/<slug>` pages import the same array so tagline and title cannot drift. Media components map from `mediaKey` in `src/components/marketing/featureMedia.jsx`.
- **Plan facts**: `src/content/plans.js` — `FREE_DAILY_LIMIT` (mirror of `supabase/functions/chat/tier.ts`), `PRO_PRICE_MONTHLY` (mirror of `UpgradeProPage.jsx`'s `8`), `PRO_TRIAL_DAYS` (7). Add a Vitest that imports both sources and asserts equality so the marketing number cannot silently lag the edge function.
- **Shortcut list**: read from `src/hooks/useKeyboardShortcuts.js` bindings in `AppLayout.jsx` (⌘K, /, ⌘B, N) — hardcode in `features.js` but reference the source in a comment.
- **Prerender**: static HTML at build with `<title>`, meta, canonical `https://kolumn.app/features`, OG tags, `BreadcrumbList` + `ItemList` JSON-LD generated from `FEATURES`.
- Nothing on this page reads Supabase.

## 5. Open questions
- Slugs for the non-AI feature pages (`/features/workspaces`, `/templates`, `/sync`, `/search`) are proposed here; only `/features/pill` and `/features/chat` are specified in `feature-page.md`. Confirm the set before the sitemap is generated.
- Are the media panels animated (motion, reduced-motion aware) or static frames? The source uses autoplay video; we have no video pipeline.
- Canonical domain (`kolumn.app` assumed) — needed for canonical/OG URLs.
- Does the hub get the source's sub-nav strip ("Features · Explore here ▾") or is that a shared-chrome decision for the chrome spec?
- Should the Free/Pro cards mention Team at all? The tier exists in code with no price; this spec omits it.
