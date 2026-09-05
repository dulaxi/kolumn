# Tutorials — marketing page spec

> Source crawled: https://claude.com/tutorials (301 → https://academy.claude.com/tutorials) and
> https://academy.claude.com/tutorials/intro-to-projects on 2026-09-02. Written-article typography
> borrowed from https://claude.com/blog/best-practices-for-getting-started-with-claude-cowork because
> the Academy article is video-only. Screenshots + metrics in the crawl harness `out/` dir
> (`tutorials.*`, `tutorial-article.*`, `blog-post.*`, `learn-bp-*.png`).
> Kolumn route: `/tutorials` (hub) and `/tutorials/<slug>` (article) · Priority: P2 · Template family: hub + article

## 1. Purpose and SEO target
- **Job of this page**: teach one Kolumn feature per article in under ten minutes so a new user gets to the "AI moved my cards" moment without reading docs.
- **Primary query intent**: "kolumn tutorial" / how-to for an AI kanban. Secondary: "turn notes into kanban cards", "AI kanban board how to", "kanban keyboard shortcuts", "share a kanban board with my team".
- **Hub `<title>`**: `Tutorials · Kolumn` (18) · **meta description**: `Short guides to Kolumn: turn notes into cards with the pill, ask your boards questions, set up a workspace, share a board, and find anything with ⌘K.` (152) · **OG**: same title; description trimmed to the first sentence.
- **Article `<title>`**: `<Tutorial title> · Kolumn tutorials` (≤60; truncate title at 38 chars) · **meta description**: the article's `summary` frontmatter field (≤155) · **OG**: title + summary + `ogImage` from frontmatter (fallback: hub OG image).
- **Structured data**: `BreadcrumbList` on every article (source emits exactly this and nothing else: Home → Tutorials → Article). Add `HowTo` only on step-based tutorials where every `## Step` heading maps to a `HowToStep` — the sample tutorial below qualifies; the settings tour does not. Hub emits nothing beyond the shared `Organization`/`WebSite` graph from the chrome spec.
- **Internal links in**: landing nav "Learn" dropdown, landing FAQ ("How does the AI work?" → pill tutorial), onboarding board's "Learn more" card, `/blog` post footers, app Help menu (`?` in the sidebar). **Out**: `/onboarding` (sign up), `/pricing` (Pro-only steps), `/blog`, `/changelog`, sibling tutorials.

## 2. Source page anatomy (what Anthropic does)

### Hub (`academy.claude.com/tutorials`, 3927px tall at 1440w)

1. **Nav** — 57px, sticky, off-white. Academy wordmark left; "AI Fluency / Products ▾ / Resources ▾" centre (14px, active item gets a 5% ink wash, 8px radius, 32px tall); search icon + "Sign in" outline button right. Deviates from claude.com chrome — it's a separate sub-site.
2. **Breadcrumb + title** — y 121–275 · container 1088px (x 176) · breadcrumb "← Academy" 14px secondary · h1 "Tutorials" serif 36/54, weight 400, ls −0.9px · intro p 18/28 secondary, full container width. No CTA. Exists to name the section and set expectations (written + video).
3. **Product sections × 7** — each 572–597px tall, 48px gap between sections · h2 serif 28/42 ls −0.7px left, "View all →" 14/500 link right (same baseline) · grid `3 cols × 349px, gap 20px` · 6 cards per section (2 rows), one section has 1 card. Sections: Claude.ai, Cowork, Code, Platform, AI Fluency, More ways to use Claude. Exists to group by product so the reader self-selects.
4. **Card anatomy** — 349 × 243–268px · radius 16px · surface near-white on off-white page, no visible border (hairline at 10% ink) · **thumbnail 349×128 (2.73:1)**, flat pastel field (peach / sage / lavender, three rotating) with a small product-screenshot illustration centred · body padding 16px · h3 serif 20/25 (wraps to 2–3 lines) · meta 13/17 muted: "5 min" or "Claude in Excel · 7 min" (product · read time). Whole card is one link; hover lifts slightly.
5. **Footer** — 56px one-liner: © left; Privacy choices / Privacy policy / Usage policy / language / theme toggle right.

No filters, no pagination, no search on the hub. "View all" goes to `/all?kind=tutorial&product=…` (a separate catalogue page with filters).

### Article (`/tutorials/intro-to-projects`, 1203px tall)

1. **Hero band** — y 57–457 (400px) · full-bleed peach tint with a dotted texture right · content container 768px (x 176, left-aligned, not centred) · breadcrumb "← Academy / Tutorials" 14px · h1 serif 36/54 · dek 18/28 secondary · two pill chips (clock icon "7 min", laptop icon "Claude.ai") 13px, 1px border, full radius · two buttons: "▶ Watch" ink 44px + "Open Claude ↗" outline 44px · product screenshot illustration 358×220 pinned bottom-right of the band.
2. **Body** — container 768px **centred** (x 336), padding 48px top/bottom · one 16:9 YouTube embed (768×432, radius 12) · "Watch on YouTube ↗" 13px muted link · "Was this helpful?" feedback card: 1px border, radius 12, serif 17px label left, thumbs-up / thumbs-down icon buttons right (36px).
3. **Footer** — as hub.

### Written-article typography (from the claude.com blog post, used as the reference for text tutorials)

- Measure **640px** at x 400 (left third of a 1312 container; meta rail sits to the right).
- **Body p 20/32**, weight 400, 32px paragraph gap.
- h2 serif 36/47 (mt 64 / mb 40) · h3 serif 32/35 (mt 64 / mb 32).
- Lists 20/32 with bold lead-in phrase; ordered lists for steps.
- Images 640w, radius 12, sitting inside a coloured frame (copper/terracotta wash, ~40px inset).
- Example/prompt blocks: pale wash panel (`surface-secondary`), radius 12, **bleeds ~110px past the measure on each side** (≈860w), two-column "Prompt / Product" table inside.
- Links: ink text, underline in muted (`rgb(176,174,165)`-class) colour.
- No table of contents anywhere on the source; no author avatar on the blog post (author is named in the dek).
- "Related posts" band at the end: 4 × 304 cards, gap 32, secondary background, h2 serif 52.

**Type scale (hub/article)**: h1 36/54/400 serif · h2 28/42/400 serif · h3 (card) 20/25/400 serif · intro 18/28/400 sans · meta 13/17 sans · nav 14/20.
**Container + rhythm**: 1088px hub, 768px article, 20px card gap, 48px section gap, 16px card radius, hairline border, no shadow.
**Palette roles**: page off-white; card near-white; text ink; muted grey for meta; three pastel thumbnail fields (peach / sage / lavender) as the only colour.
**Mobile (390w)**: nav collapses to wordmark + search + Sign in; hub grid → 1 column, cards keep the 2.73:1 thumbnail; section h2 and "View all" stay on one row; article hero loses the illustration, buttons stack; video keeps 16:9 at full width.

## 3. Kolumn version

### Hub `/tutorials`

1. **Nav** — **adapt**: use the shared marketing chrome (see chrome spec); no sub-site wordmark. Active-item wash = `--surface-hover`, 8px radius.
2. **Title block** — **keep**, centred? No — keep left-aligned like the source; Kolumn's landing is also left-aligned.
   - h1: **Tutorials**
   - Intro: **Short guides to the parts of Kolumn worth learning on purpose. Most take under ten minutes. Each one ends with something on your board.**
   - Render: `font-heading font-[425] text-4xl` (36/44) for h1; intro `text-lg text-[var(--text-secondary)] max-w-2xl`. Container `max-w-6xl px-6 sm:px-10` (matches landing; 1152px content vs source 1088).
3. **Sections** — **adapt**: group by *what you're doing*, not by product (Kolumn has one product). Three sections, six cards total on launch, room for more. Drop "View all →" until a section exceeds 6 cards (then it links to `/tutorials?topic=…`, which is the same page filtered client-side).
   - **The AI** — pill + chat tutorials (1, 2, 3)
   - **Working together** — workspaces + sharing (4, 5)
   - **Getting around** — templates, search, settings (6, 7, 8)
   - Section h2: `font-heading font-[425] text-2xl` (28px) — matches source size, Clash Grotesk instead of serif. 48px gap between sections, 24px between h2 and grid.
4. **Card** — **adapt**. New component `TutorialCard` in `src/components/marketing/`.
   - Grid: `grid gap-5 sm:grid-cols-2 lg:grid-cols-3` (3 × ~357px at 1152 container, 20px gap — same proportions as source).
   - Surface: `bg-[var(--surface-card)] border border-[var(--border-default)] rounded-xl` (**12px**, not 16 — 16 is reserved for kanban cards) · hover: `border-[var(--border-focus)]`, `translate-y-[-1px]` on `--dur-fast`, no shadow.
   - Thumbnail: `aspect-[2.73/1]` (keep the source ratio) · background rotates through **`--accent-lime-wash`, `--label-blue-bg`, `--label-purple-bg`** by index (the app's own pastel trio, lime never as a fill for anything clickable — the wash is a surface, the card is what's clickable) · content is a small screenshot of the real UI (pill, chat, workspace switcher) exported at 2× from the app, or Klay as illustration on the settings tutorial only.
   - Body: p-4 · title `font-heading font-[425] text-lg leading-snug text-[var(--text-primary)]` (20/25 like source, heading font) · one-line summary `text-sm text-[var(--text-secondary)] line-clamp-2` (source has none; Kolumn adds it because titles alone don't say what you'll end up with) · meta row `font-mono text-xs text-[var(--text-muted)]`: `Free · 4 min` or `Pro · 6 min` (tier badge replaces the source's product badge; the tier is the thing a reader needs to know before clicking).
   - Whole card is a `<Link>`; title is the accessible name.
5. **Footer** — shared chrome.

**Eight tutorials (title — one-line summary — tier · time)**

| # | Slug | Title | Summary | Meta |
|---|------|-------|---------|------|
| 1 | `list-to-cards-with-the-pill` | Turn a list into cards with the pill | Paste notes, a comma list, or one sentence. Cards land on the board you're looking at. | Free · 4 min |
| 2 | `move-update-complete-with-the-pill` | Move, update, and complete cards by typing | Tell the pill what changed. It edits the cards on this board instead of creating new ones. | Pro · 5 min |
| 3 | `ask-your-boards-in-chat` | Ask your boards a question | Open Chat, ask what's overdue or what a board is about, get an answer. Nothing gets changed. | Free · 3 min |
| 4 | `set-up-a-workspace` | Set up a workspace and invite your team | Create a workspace, send invitations, and watch edits show up on everyone's screen as they happen. | Free · 6 min |
| 5 | `share-one-board` | Share a single board | Give someone access to one board without adding them to a workspace. | Free · 3 min |
| 6 | `start-from-a-template` | Start from a template | Reuse a board or card layout you've already got right, and revisit the getting-started board. | Free · 4 min |
| 7 | `search-and-shortcuts` | Find anything with ⌘K | Search cards across boards, open them without the mouse, and the shortcuts worth memorising. | Free · 3 min |
| 8 | `export-theme-and-motion` | Export your data, switch themes, reduce motion | A tour of Settings: download everything you own, pick light/dark/system, turn animation down. | Free · 4 min |

(Read times are estimates from draft word counts; recompute from the markdown at build — see §4.)

### Article `/tutorials/<slug>`

1. **Hero band** — **adapt**. Full-bleed `bg-[var(--surface-raised)]` band with a 1px `--border-subtle` bottom edge (no dotted texture, no pastel tint) · 320px min height (source 400 — Kolumn drops the illustration so it needs less) · container `max-w-6xl`, content column `max-w-[768px]` left-aligned.
   - Breadcrumb: `← Tutorials` (`font-mono text-xs text-[var(--text-muted)]`, Phosphor `ArrowLeft` 14px).
   - h1: tutorial title, `font-heading font-[425] text-4xl leading-[1.15] tracking-tight`.
   - Dek: summary from frontmatter, `text-lg text-[var(--text-secondary)]`.
   - Chips: two, `font-mono text-xs`, 1px `--border-default`, `rounded-full`, 28px tall: Phosphor `Clock` + "4 min", Phosphor `Sparkle` + "Free" (or `Crown` + "Pro").
   - Buttons: **Open Kolumn** (`Button variant="primary"` → `/app/boards` if signed in, `/onboarding` otherwise; app decides) and, only when frontmatter has `video`, **Watch** (`Button variant="secondary"`, scrolls to the embed). Source puts Watch first because its articles *are* the video; Kolumn's are text-first.
2. **Body** — **adapt**: written article, not a video embed.
   - Measure **640px**, **centred** (source blog post puts it at x 400 with a right rail; Kolumn has no rail, so centre it like the Academy article does). `mx-auto max-w-[640px] py-12`.
   - Body p **17/28** `text-[17px] leading-7 text-[var(--text-primary)]`, 24px paragraph gap. (Source is 20/32; that reads as a magazine. Inter at 17 is the largest size that still feels like the app; the landing uses 17–18 for body already.)
   - h2 `font-heading font-[425] text-2xl` (28px) mt-12 mb-4 · h3 `font-heading font-[425] text-xl` mt-8 mb-3. (Source 36/32 serif — too loud in Clash Grotesk; scale down one step.)
   - Ordered steps: `ol` with `font-mono` numerals in `--text-muted`, 17/28 body, bold lead-in phrase. Each `## Step N —` heading in the markdown becomes a `HowToStep`.
   - Screenshots: 640w, `rounded-lg border border-[var(--border-default)]`; **no coloured frame** (the source's copper frame is its brand; Kolumn's screenshots sit on a hairline). Always include `alt`.
   - **Try it** block (the source's "prompt table"): `InlineNotice variant="info"` with `icon={<Terminal/>}` and the exact text to type in the pill, in `font-mono`. Keep it inside the measure — no bleed; bleed needs a wider page.
   - Callouts for tier gates: `InlineNotice variant="warn"` — "This step needs Pro." with `action` = link to `/pricing`.
   - Inline code (`⌘K`, `Enter`): `font-mono text-[15px] px-1 rounded bg-[var(--surface-input)]`.
   - Links: `text-[var(--text-primary)] underline decoration-[var(--border-default)] underline-offset-4 hover:decoration-[var(--text-primary)]` — mirrors the source's muted underline.
   - No TOC (source has none; articles are ≤ 900 words). Revisit if any tutorial passes 1,500 words.
   - Optional `video` frontmatter → 16:9 embed above the first h2, `rounded-lg`, `loading="lazy"`, YouTube-nocookie.
3. **Was this helpful?** — **keep** as `HelpfulPrompt` component: `rounded-xl border p-4 flex justify-between`, label `text-[15px]`, two `Button variant="ghost" size="icon-md"` with Phosphor `ThumbsUp` / `ThumbsDown`. Fires a PostHog event `tutorial_feedback {slug, vote}`; swaps to "Thanks." Nothing else.
4. **Next up** — **add** (source's Related posts, trimmed): "Next up" h2 + 2 `TutorialCard`s chosen by frontmatter `next: [slug, slug]`, `max-w-[768px]`, on `--surface-page`. Exists so the hub isn't the only path between tutorials.
5. **Footer** — shared chrome.

**Proportions kept from source**: 3-col / 20px-gap grid, 2.73:1 thumbnail, 640px measure, 768px hero column, 48px section gap, h1 36, card title 20.
**Changed for Kolumn**: 12px card radius (not 16), 1px `--border-default` on cards (source is borderless), Clash Grotesk 425 for every heading (no serif), body 17/28 (not 20/32), no screenshot frame colour, Inter meta → IBM Plex Mono meta, pastel fields from the label palette.

### The full tutorial: "Turn a list into cards with the pill"

Frontmatter and body exactly as they should ship in `src/content/tutorials/list-to-cards-with-the-pill.md`:

```md
---
title: Turn a list into cards with the pill
slug: list-to-cards-with-the-pill
summary: Paste notes, a comma list, or one sentence. Cards land on the board you're looking at.
topic: ai
tier: free
order: 1
next: [move-update-complete-with-the-pill, ask-your-boards-in-chat]
---

Every board in Kolumn has a pill at the bottom. It looks like a text field. It is the
fastest way to get things onto the board, because it accepts whatever you already have:
a bulleted list from a doc, a sentence you'd say out loud, a pasted Slack thread.

This tutorial makes cards three ways. By the end you'll know which one the pill will
pick before you press Enter.

## Step 1 — Paste a list, one item per line

Open any board. Click the pill (it reads "Type a task or paste notes...") and paste this:

> Book the venue
> Send the invite list to Priya
> Draft the agenda

Press Enter. Three cards appear in the first column, one per line, in the order you
pasted them.

Nothing was sent to the AI. When the text contains line breaks, the pill splits on them
and creates a card per line straight away. It's instant and it doesn't count against
your daily AI messages.

## Step 2 — Or a comma list

Type this on one line:

> Order lanyards, confirm the caterer, print name badges

Enter. Same result: three cards. Commas work like line breaks, with one exception
covered in the next step.

## Step 3 — Or just say what you want

Now type a sentence:

> Add a card to follow up with the venue about parking, due Friday, high priority

This one goes to the AI. The pill notices the text starts like an instruction ("Add…",
"Create…", "I need…") rather than a list, so it stops splitting on commas and hands the
whole sentence over. A moment later one card arrives with the title, the due date, and
the priority already set.

The AI only ever works on the board you're looking at. It can't create cards on
another board from here.

## What the pill decides, and when

- **Has line breaks** → one card per line. No AI.
- **Has commas and reads like a list** → one card per item. No AI.
- **Has commas but starts like an instruction** → the AI reads the whole thing.
- **Anything else** → the AI reads it.

If a fast-path card lands with the wrong title, open it and fix it. If the AI got
something wrong, type a correction into the pill ("rename the parking card to
'Confirm parking with venue'") — on Pro, the pill can edit cards as well as create
them. That's the next tutorial.

## Limits worth knowing

On the free plan the pill can create cards and the AI answers up to 20 messages a day.
The list-splitting paths don't use a message. Moving, updating, and completing cards
through the pill is a Pro feature.

## Next up

- Move, update, and complete cards by typing
- Ask your boards a question
```

Rendering notes for this article: the three `>` blocks render as the **Try it** `InlineNotice` (remark plugin maps a blockquote whose parent section is a `## Step` heading to the notice; plain blockquotes elsewhere stay blockquotes). "Limits worth knowing" gets the Pro `InlineNotice variant="warn"` treatment via a `:::pro` container directive — or, simpler, the author writes the notice text in a blockquote and the plugin keys off a leading `Pro:` — decide in implementation (open question 3).

## 4. Data and content sources

- **Content lives in markdown**: `src/content/tutorials/<slug>.md` with the frontmatter shape above (`title, slug, summary, topic: ai|team|around, tier: free|pro, order, next[], video?, ogImage?, updated?`). One file per tutorial; the hub is derived, never hand-listed.
- **Loader**: `src/lib/content.js` — `import.meta.glob('/src/content/tutorials/*.md', { query: '?raw', import: 'default', eager: true })`, a 20-line frontmatter splitter (`---` fence → YAML-lite key: value / `[a, b]` arrays; **do not add `gray-matter`** — it pulls a Node `Buffer` polyfill into the client bundle), then `react-markdown` + `remark-gfm` (both already dependencies) with a `components` map that renders `h2/h3/ol/blockquote/img/a/code` with the classes in §3. Read time = `Math.max(1, Math.round(words / 200))` computed in the loader, not stored.
- **Prerender**: the build-time prerender script (chrome spec) imports the same `content.js` to enumerate `/tutorials/<slug>` routes and to emit them into the sitemap with `updated` as `lastmod`.
- **Screenshots**: `public/tutorials/<slug>/*.png` at 2×, captured with the `verify` skill's Playwright flow against a seeded board so they stay reproducible when the UI changes.
- **Must stay in sync with app code**: the free daily limit (20, `supabase/functions/chat/tier.ts`), the Pro price on any "needs Pro" notice ($8/month, `UpgradeProPage.jsx`), the pill placeholder string (`QuickAddBar.jsx`), and the comma heuristic (`commandStart` regex in `QuickAddBar.jsx`). Add a Vitest that greps the tutorial markdown for `20 messages` and fails if `tier.ts`'s constant changes.
- **Feedback**: PostHog event only; no Supabase table.

## 5. Open questions
- The source hub has no filters and a separate `/all` catalogue. Does Kolumn want `?topic=` filtering on `/tutorials` at launch, or wait until the count passes ~12?
- Video: none of the eight tutorials have a video today. Keep the `video` frontmatter field and the Watch button dormant, or drop both until a first recording exists?
- How the **Try it** and **Pro** notices are authored in markdown — blockquote-with-heuristic vs a `:::` container directive (`remark-directive`, one new dep). Recommend the directive if a second callout type ever appears.
- The tier badge on cards assumes tutorial 2 is Pro-only. Confirm that free users see *nothing* useful in it (server blocks the write tools) before labelling; otherwise label it "Free · Pro for edits".
- Whether `/tutorials` also appears inside the app Help menu, which would make the marketing shell need a "back to app" affordance when the user is signed in.
