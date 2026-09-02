# Blog — marketing page spec

> Source crawled: https://claude.com/blog (index) and
> https://claude.com/blog/best-practices-for-getting-started-with-claude-cowork (post) on 2026-09-02.
> Screenshots + metrics in the crawl harness `out/` dir (`blog.*`, `blog-post.*`, `blog-probe.json`,
> `blog-post-probe.json`, `learn-bp-top.png`, `learn-bp-mid.png`).
> Kolumn route: `/blog` (index) and `/blog/<slug>` (post) · Priority: P2 · Template family: gallery + article

## 1. Purpose and SEO target
- **Job of this page**: say something true about how Kolumn is built and why, so people who care about the product's opinions find it before they find the pricing page.
- **Primary query intent**: brand + topic ("kolumn blog", "kolumn ai kanban"). Secondary long-tail from individual posts: "kanban without custom fields", "AI that edits a kanban board", "kanban privacy row level security". The index itself ranks for nothing; posts do.
- **Index `<title>`**: `Blog · Kolumn` (13) · **meta description**: `Notes from building Kolumn: why it stayed a kanban, how the AI decides what to touch, and what we do and don't do with your boards.` (133) · **OG**: same.
- **Post `<title>`**: `<Post title> · Kolumn` (≤60; the title field is capped at 52 chars in the loader) · **meta description**: frontmatter `summary` (≤155) · **OG**: title, summary, `ogImage` (1200×630) generated at build from the post's tile colour + title if none is provided.
- **Structured data**: `BlogPosting` on every post (source emits `headline, description, image, publisher → Organization, datePublished, dateModified, mainEntityOfPage`) plus `BreadcrumbList` (Home → Blog → Post). Index: nothing beyond the shared `Organization`/`WebSite` graph. Emit a `/blog/feed.xml` RSS at build (source doesn't; it costs nothing and readers of this kind of blog ask for it).
- **Internal links in**: landing nav "Learn", landing footer, `/changelog` entries that link to a longer write-up, `/tutorials` "Next up" when a post explains the why behind a how. **Out**: `/tutorials`, `/pricing`, `/changelog`, `/onboarding` from the end-of-post CTA.

## 2. Source page anatomy (what Anthropic does)

### Index (`claude.com/blog`, 5646px at 1440w)

1. **Chrome** — shared claude.com nav (84px) + a 38px sub-bar with breadcrumb "Blog" left and "Explore here ▾" right.
2. **Hero** — y 0–791 · container 1312px (x 64) · two-column: left column 244px with h1 "Blog" as a small **20/32 weight 600 sans label**, p 17/27 secondary ("Product news and best practices…"), ink "Try Claude" button 36px; right column lists the **four categories as serif 52/62 weight 500 links with arrows** (Agents →, Claude Code →, Enterprise AI →, Product announcements →), 64px line pitch. Exists to make categories the headline, not the word "Blog".
3. **Featured strip** — ~120px, horizontally scrolling row of 5 featured posts: title serif 19/23 + date 12/19, separated by 1px vertical rules; bleeds off both edges. Editorial picks independent of date.
4. **Spacer** — 128px.
5. **Filter rail + grid** — y 920–3823 (2903px) · container 1312 · **left rail 240px**: "Filter and sort" 15px label, then four dropdowns (Sort by / Category / Product / Use case) as 12/19 uppercase-ish labels with a caret, 1px rules between · **right area 976px**: search input (240px, full radius, magnifier icon) left, Grid/List `SegmentedControl` right (36px) · grid `3 × 304px, gap 32px`, **15 cards per page** (5 rows) · pagination below: ink "View more" button + "1 / 16" counter (loads next 15 in place).
6. **Card anatomy** — 304 × 414px, no border, no radius on the card itself · **tile 304×~200 (≈1.5:1)**, flat colour field (rotates through lavender, copper, peach, blue, sage, plum, olive — 7 hues) with a 130×130 line-art illustration centred · below tile, on `surface-secondary` wash, padding 20: date 12/19 muted (letter-spacing 0.12px), title serif 19/23 weight 500 (2–3 lines), category row 12/19 with a small line icon · whole card is a link.
7. **Spotlight card** — 1312 × ~280, `surface-secondary`, radius 12: "Link" eyebrow, serif 25 title, 15/24 summary, "Read more" ink button; illustration right. One editorially pinned item.
8. **Dark CTA band** — 666px, ink background: serif 52 "Transform how your organization…", two buttons, plus a newsletter form (serif 25 label, email input with arrow button, 12px consent text). Exists to convert scroll-to-bottom readers.
9. **Footer** — shared.

### Post (`/blog/best-practices-…`, 14295px)

1. **Hero** — y 0–999 · container 1312 · breadcrumb "Blog / <title>" 12px · square illustration tile 130×130 in lavender at top of column · **h1 serif 52/62 weight 500 in a 640px column at x 400** (wraps to 3 lines = 165px) · dek 23/35 secondary (names the author and what the post covers) · ink "Try Claude" 36px · **meta rail** right of the column (x ≈ 1100, 200px wide): three stacked label/value pairs — Category, Product, Date — 12/19 with 1px rules. Column starts at x 400, not centred, to leave room for the rail.
2. **Body** — 640px measure at x 400 · **p 20/32**, 32px paragraph gap · h2 serif 36/47 (mt 64, mb 40) · h3 serif 32/35 (mt 64, mb 32) · lists 20/32, bold lead-in, 8px item gap · images 640w radius 12 inside a copper frame (~40px inset, radius 16) · example table/prompt panel on `surface-secondary` radius 12 that **bleeds to ~860w** (110px past the measure each side), 2-column table with 1px rules · links ink with a muted underline · no TOC, no author avatar, no share row.
3. **Related posts** — 860px band on `surface-secondary`: h2 serif 52 "Related posts", `4 × 304`, gap 32, same card anatomy as index.
4. **Dark CTA band** — same as index (666px).
5. **Footer** — shared.

**Type scale**: index h1 20/32/600 sans (label) · category links 52/62/500 serif · card title 19/23/500 serif · card meta 12/19/400 sans · post h1 52/62/500 serif · dek 23/35 · body 20/32 · h2 36/47 · h3 32/35.
**Container + rhythm**: 1312px, 64px side padding, 128px section spacers, 32px grid gap, 12px radius on tiles/panels, 0 on cards, no shadow, 1px rules for the filter rail and meta rail.
**Palette roles**: page off-white; secondary wash for card bodies and panels; ink text; muted grey meta; seven flat hues for tiles; ink band for the CTA.
**Mobile (390w)**: hero stacks (label, p, button, then the four category links at ~36px); featured strip becomes a swipe row; filter rail collapses into a "Filter and sort" disclosure above the grid; grid → 1 column, tile keeps ratio; post h1 drops to ~36px, meta rail moves under the dek as a single row; example panel loses its bleed; related posts → 1 column, 2 shown.

## 3. Kolumn version

### Index `/blog`

1. **Chrome** — shared marketing chrome. No sub-bar; breadcrumbs live in the page.
2. **Hero** — **adapt**. Keep the source's trick of making categories the big type, but Kolumn's blog has three tags rather than four product lines, and they read better as one line than as a stack.
   - Eyebrow (source's tiny h1): **Blog** — `font-mono text-xs uppercase tracking-wide text-[var(--text-muted)]`. Rendered as the `h1` for semantics, styled small, exactly like the source.
   - Big type: **Notes from building a kanban that stayed a kanban.** — `font-heading font-[425] text-4xl sm:text-5xl tracking-tight leading-[1.08] max-w-3xl` (the landing h1 classes). Source uses this slot for category links; Kolumn uses it for a sentence because three tag names in 52px type would look like a nav.
   - Tag row under it: **Product · Design · Engineering** as `TagChip`s (see card anatomy) that filter the grid in place and set `?tag=`. All three plus "All".
   - No button in the hero. The end-of-page CTA is enough; a "Try Kolumn" here competes with the reading.
   - Container `max-w-6xl px-6 sm:px-10`, `pt-16 pb-12`, `bg-[var(--surface-page)]`.
3. **Featured strip** — **drop** until there are more than ~12 posts. Editorial pinning is `featured: true` in frontmatter; when present, the first row of the grid shows it as a 2-column-wide card (same anatomy, tile `aspect-[2.2/1]`). Simpler than a second surface.
4. **Filter rail + grid** — **adapt**: no rail. Sort is always newest-first; the only filter is the tag row from the hero; search is `⌘K`-shaped but out of scope (open question). Grid/List toggle: **drop** (one view).
   - Grid: `grid gap-8 sm:grid-cols-2 lg:grid-cols-3` — 3 × ~349px at the 1152 container, **32px gap** (source proportion).
   - Page size: **12** (3 full rows at three columns and at two). "Show more" `Button variant="secondary"` centred, `font-mono text-xs` counter "12 of 31" under it. Prerender: `/blog` ships the first 12 in HTML; "Show more" appends client-side from the eager glob (all posts are in the bundle anyway — under 100 posts this is a few tens of KB of markdown).
5. **Card** — **adapt**. New `PostCard` in `src/components/marketing/`, sharing its shell with `TutorialCard`.
   - `rounded-xl border border-[var(--border-default)] bg-[var(--surface-card)] overflow-hidden` — Kolumn adds the 1px border and 12px radius the source lacks; the wash-only body of the source reads as unfinished against Kolumn's bordered app.
   - Tile: `aspect-[3/2]` (source ≈1.5:1), background from a **6-hue cycle** keyed on post index: `--label-purple-bg`, `--label-blue-bg`, `--label-green-bg`, `--label-yellow-bg`, `--label-pink-bg`, `--accent-lime-wash`. Centred glyph: a single Phosphor icon at 48px, `weight="duotone"`, colour = the matching `--label-*-text`, chosen per post via frontmatter `icon` (the app already renders arbitrary Phosphor names through `DynamicIcon` — reuse it). No illustrations to commission.
   - Body `p-5`: date `font-mono text-xs text-[var(--text-muted)]` (`Jun 3, 2026` format via date-fns `MMM d, yyyy`) · title `font-heading font-[425] text-lg leading-snug` (≈ source 19/23) `line-clamp-3` · tag row: one `TagChip` (`font-mono text-[11px] px-2 h-6 rounded-full border border-[var(--border-default)] text-[var(--text-secondary)]`), source uses a line icon + label; Kolumn drops the icon.
   - Hover: `border-[var(--border-focus)]`, title stays; no lift (the tutorial card lifts because it's a "start this" affordance; posts are quieter).
6. **Spotlight card** — **drop**. Same job as `featured`.
7. **CTA band** — **adapt**: no newsletter (Kolumn has none — open question), no dark band. A single `InlineNotice`-style panel is too small for a page end; use the landing's existing final-CTA section pattern instead: `bg-[var(--surface-raised)] border-t border-[var(--border-subtle)]`, `py-20`, centred.
   - h2: **Try the thing the posts are about.** `font-heading font-[425] text-3xl`
   - p: **Free to start. Twenty AI messages a day, every board feature, no card required.** `text-[var(--text-secondary)]`
   - `Button variant="primary"`: **Start a board** → `/onboarding`. `Button variant="ghost"`: **See pricing** → `/pricing`.
8. **Footer** — shared.

### Post `/blog/<slug>`

1. **Hero** — **adapt**. Source spends 999px; Kolumn spends ~420.
   - Container `max-w-6xl`; inner column `max-w-[720px] mx-auto` (**centred** — with no meta rail, the source's x 400 left offset has no reason to exist).
   - Breadcrumb `← Blog` (`font-mono text-xs text-[var(--text-muted)]`, Phosphor `ArrowLeft`).
   - Tile glyph: **drop** the 130px illustration; a 40px `DynamicIcon` in the post's tile colour sits left of the tag row instead (keeps the index ↔ post visual link without a hero image).
   - h1: `font-heading font-[425] text-4xl sm:text-5xl leading-[1.1] tracking-tight` (44/48px; source 52 serif).
   - Dek: frontmatter `summary`, `text-xl text-[var(--text-secondary)] leading-relaxed mt-4`.
   - Meta line (replaces the rail): `font-mono text-xs text-[var(--text-muted)] mt-6 flex gap-3` — `TagChip` · `Jun 3, 2026` · `6 min read` · `by <author>` (author is a plain name from frontmatter, no avatar; source names the author in the dek, Kolumn puts it here). If `updated` differs from `date`, append `· updated Jun 21`.
   - No button in the hero.
   - `pt-14 pb-10 border-b border-[var(--border-subtle)]`.
2. **Body** — **adapt**: `article` with `max-w-[640px] mx-auto py-12` (**640px measure, kept from source**).
   - p `text-[17px] leading-7 text-[var(--text-primary)]`, `mb-6` (source 20/32 — see tutorials spec for the reasoning; both article families share one `Prose` component and one scale).
   - h2 `font-heading font-[425] text-2xl mt-12 mb-4` · h3 `font-heading font-[425] text-xl mt-8 mb-3`.
   - ul/ol 17/28, `pl-6`, marker `text-[var(--text-muted)]`, bold lead-ins allowed.
   - Images `rounded-lg border border-[var(--border-default)]`, full measure; `figcaption` `font-mono text-xs text-[var(--text-muted)] mt-2`. No coloured frame.
   - Wide panels (tables, comparison blocks): `not-prose` wrapper that **bleeds to 800px** (`-mx-20` at ≥ lg, none below) on `bg-[var(--surface-raised)] rounded-xl border border-[var(--border-default)] p-6` — keeps the one thing the source does that helps (giving a table room) but at 80px per side, not 110.
   - Code: `pre` on `bg-[var(--surface-input)] border border-[var(--border-default)] rounded-lg p-4 font-mono text-[14px] leading-6 overflow-x-auto`; inline `code` `font-mono text-[15px] px-1 rounded bg-[var(--surface-input)]`. (Source has no code; Kolumn's engineering posts will.)
   - Blockquote: `border-l-2 border-[var(--border-default)] pl-5 text-[var(--text-secondary)]`.
   - Links: ink text, `underline decoration-[var(--border-default)] underline-offset-4`, hover decoration ink.
   - No TOC (source has none). No share row. No author box.
3. **Related posts** — **adapt** → "More from the blog": h2 `font-heading font-[425] text-2xl`, **3** `PostCard`s (same tag first, then newest), `grid gap-8 lg:grid-cols-3`, `max-w-6xl`, `py-16`, `border-t border-[var(--border-subtle)]`. Source shows 4 on a wash band with a 52px title; three fit Kolumn's grid and the band is unnecessary.
4. **CTA** — **keep** the index CTA block, identical component.
5. **Footer** — shared.

**Proportions kept**: 3-col / 32px grid, ≈3:2 tile, 640px measure, 12px radius on tiles/panels, 12px meta, ~19px card title, 1px rules.
**Changed**: bordered 12px cards (source borderless, 0 radius), Clash Grotesk 425 headings (no serif), h1 44–48 (not 52), body 17/28 (not 20/32), 80px bleed (not 110), Phosphor glyph tiles from the label palette (not commissioned line art), no dark band, no newsletter, no rail.

### Sample posts (titles + summaries + tag; no dates — they get a date when they're written)

| Slug | Title | Summary | Tag · icon |
|------|-------|---------|-----------|
| `why-kolumn-stayed-a-kanban` | Why Kolumn stayed a kanban | Every project tool grows fields, views, and rituals until the board is the least-used screen. We kept the board and moved the busywork to the AI instead. What that ruled out. | Product · `Kanban` |
| `how-the-pill-decides` | How the pill decides whether to call the AI | Line breaks and commas are handled locally; anything that reads like an instruction goes to the model. The heuristic, the cases it gets wrong, and why it's still a regex. | Engineering · `TextAa` |
| `what-we-dont-do-with-your-boards` | What we don't do with your boards | Row-level security on every table, members-only access, export and delete in Settings, and no training on your content. The specifics, and the one thing we can't promise yet. | Engineering · `ShieldCheck` |

The third post's "one thing we can't promise yet" must stay vague about SOC 2 (unknown — brief). Draft copy for these lives with the content, not in this spec.

## 4. Data and content sources

- **Content**: `src/content/blog/<slug>.md`, frontmatter `title, slug, summary, date (YYYY-MM-DD), updated?, author, tag: product|design|engineering, icon (Phosphor name), featured?: true, ogImage?`. Slug = filename; `date` is required and a post without one is excluded from the index and sitemap (this is how "drafts" work — no separate flag).
- **Loader**: the same `src/lib/content.js` as tutorials (`import.meta.glob` raw + frontmatter splitter + `react-markdown` / `remark-gfm`), with a second glob for `blog/`. Sorting, tag filtering, read time (`words / 200`), and "related" selection are pure functions over the parsed list; unit-test them.
- **Shared renderer**: `src/components/marketing/Prose.jsx` — the `components` map for `react-markdown` (h2, h3, p, ul, ol, li, a, img, pre, code, blockquote, table). Tutorials and blog both use it; the tutorial-only Try-it/Pro notices are plugins layered on top.
- **Prerender + sitemap + RSS**: the build script enumerates dated posts, prerenders `/blog` (first 12) and each `/blog/<slug>`, writes `lastmod` = `updated ?? date`, and emits `/blog/feed.xml` (title, link, summary, date) — no external service.
- **OG images**: build-time `satori`-style generation is one more dep; start with a static `public/og/blog.png` and per-post `ogImage` only when someone bothers. Note it as tech debt.
- **Must stay in sync with app code**: the CTA's "twenty AI messages a day" (`tier.ts`), "no card required" (confirm the onboarding plan step doesn't collect a card for free — `OnboardingPage.jsx`), and anything a post claims about the pill heuristic (`QuickAddBar.jsx` `commandStart`). Posts are dated; if the product changes, add an `updated` line and a one-sentence note at the top rather than silently rewriting.

## 5. Open questions
- Newsletter: the source's dark band is half newsletter form. Kolumn has no mailing list or provider today — leave it out, or add a plain `mailto:`-free "Follow the changelog" link to `/changelog` in the CTA?
- Search on the index: the source has a search box. With < 30 posts, tag chips are enough; is a search field wanted for parity anyway (client-side over titles + summaries is ~20 lines)?
- Author display: names only, or a link to a profile/X handle? The source shows no author chrome at all.
- Whether `Product` posts should auto-link to a `/changelog` entry of the same date (a `changelog: <id>` frontmatter field) so a launch post and its entry cross-reference each other.
- OG image generation at build (`satori` + `resvg`) vs one static image — decide before the first post ships, since the OG URL is what social scrapers cache.
