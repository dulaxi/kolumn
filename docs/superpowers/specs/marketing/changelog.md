# Changelog — marketing page spec

> Source crawled: https://www.anthropic.com/news on 2026-09-02 (Newsroom index — the structural
> model for a dated, tagged list). Card/typography cross-reference from https://claude.com/blog.
> Screenshots + metrics in the crawl harness `out/` dir (`news.*`, `news-probe.json`).
> Kolumn route: `/changelog` (single page; entries are anchors `/changelog#2026-08-04-create-board-anywhere`) ·
> Priority: P2 · Template family: utility (list)

## 1. Purpose and SEO target
- **Job of this page**: show, in plain language and with real dates, that Kolumn is actively maintained and that user-facing changes are announced rather than slipped in.
- **Primary query intent**: "kolumn changelog" / "kolumn updates" / "what's new in kolumn". Secondary: none worth chasing — this page ranks for the brand only. Its real job is trust for people already evaluating.
- **`<title>`**: `Changelog · Kolumn` (18) · **meta description**: `Every user-facing change to Kolumn, dated and tagged New, Improved, or Fixed. No version numbers, no marketing — just what changed.` (131) · **OG**: same; static `public/og/changelog.png`.
- **Structured data**: none. The source news index emits none. (`BreadcrumbList` is pointless on a one-level page.) Emit `/changelog/feed.xml` (RSS) at build so people who want to follow it can without a newsletter.
- **Internal links in**: landing footer, `/blog` CTA ("Follow the changelog"), in-app "What's new" link in the sidebar's bottom-left block (open question), `/pricing` FAQ "How often does Kolumn ship?". **Out**: `/blog/<slug>` when an entry has a longer write-up, `/tutorials/<slug>` when a feature has a tutorial, `/app` for "try it".

## 2. Source page anatomy (what Anthropic does)

Newsroom index, 2961px at 1440w, one `article` root (y 68–1923), container **1272px (x 84)**, page off-white, text ink.

1. **Nav** — 68px, wordmark left, links right (Research ▾ / Policy / Commitments ▾ / Learn ▾ / News), ink "Try Claude" split button. Shared anthropic.com chrome.
2. **Title row** — y 164–320 · h1 "Newsroom" **sans 52/52 weight 700** in a 620px left column · right column (620px, x 736): a 3-row **contact table** — label left (15px), icon + value right (15px), 1px rules top and between rows, 32px row pitch. Exists to give press a way in without a separate page. A 1px rule spans the container below (y 355).
3. **Featured block** — y 405–1040 · left: **video/image 837×471 (16:9)**, then h2 sans 32/38 weight 600 (2 lines) beside a category + date line (sans 14/17 weight 500 muted, "Announcements  Sep 1, 2026") and a **serif 15/21** summary in a 403px column · right rail (x 953, 403px wide): **4 stacked items**, each: category + date 14/17 muted, h4 sans 19/23 weight 600, serif 15/21 summary, 1px rule between; ~130–170px per item. Exists to pin what matters this week above the chronological list.
4. **List** — y 1120–1290+ · h2 "News" sans 32/38 weight 600 · left column 946px: a **table** with a header row (DATE / CATEGORY / TITLE, 12px uppercase-ish muted, 1px rule) and **10 rows**, each a link: date 14px muted (col 1, ~145px) · category 14px (col 2, ~145px) · title 14–15px ink (col 3, rest) · 36px row height · 1px `border-subtle` rule between rows · titles wrap to 2 lines when long (row grows to 58px). Below: full-width **"See more ↓"** button (946px × 36, pale wash, 1px rule, 14px) that appends the next 10.
   Right rail (x 1057, 292px): a **search input** (full width, 44px, magnifier icon, 1px border, radius 8) and a decorative 292×292 illustration tile (blue, radius 12).
5. **Footer** — ink background, y 1923–2961, wordmark + 4 link columns × 207px (gap 32), 12px bold headings, 14px links. Shared chrome.

**Type scale**: h1 52/52/700 sans · h2 32/38/600 sans · featured h4 19/23/600 sans · summary 15/21/400 serif · table cells 14/17 · header cells 12 · nav 14.
**Container + rhythm**: 1272px, 84px side padding, 1px rules everywhere instead of cards, radius 8 (search) / 12 (tile), no shadows, no card surfaces in the list at all.
**Palette roles**: page off-white; ink text; muted grey (dates, categories, header cells); pale wash on the "See more" button; one accent colour on the illustration tile only.
**Mobile (390w)**: title row stacks (h1, then the contact table full-width); featured image full-width, h2 drops to ~32, right-rail items stack under it as a plain list; the **table collapses to a stacked list** — each row becomes date + category on one 12px line over a title line; search input moves above the list; footer columns stack.

## 3. Kolumn version

Kolumn's changelog is the Newsroom's **list**, promoted to the whole page, with the featured block trimmed to a single "latest" entry and the table rows expanded to carry a one-paragraph body. No press table, no illustration tile, no search until the list is long.

1. **Chrome** — shared marketing chrome.
2. **Title row** — **adapt**. Container `max-w-6xl px-6 sm:px-10` (1152 content vs source 1272), `pt-16 pb-8`.
   - h1: **Changelog** `font-heading font-[425] text-4xl sm:text-5xl tracking-tight` (44/48; source 52/700 sans is heavier than anything on Kolumn's landing).
   - p: **Every change you'd notice, dated and tagged. No version numbers — Kolumn is a web app; the version you have is the one that's live.** `text-lg text-[var(--text-secondary)] max-w-2xl mt-3`.
   - Right column (source's contact table) → **adapt** into a 3-row utility table, same 1px-rule anatomy, `font-mono text-xs`, `lg:w-[420px]`:
     - **Follow** · RSS icon · `changelog/feed.xml`
     - **Longer write-ups** · `Article` icon · `/blog`
     - **Something broken?** · `Bug` icon · `support@kolumn.app` (open question — confirm the support address)
   - `border-b border-[var(--border-subtle)]` under the row.
3. **Latest** — **adapt** the featured block down to one entry, no image. `py-10 border-b border-[var(--border-subtle)]`.
   - Eyebrow `font-mono text-xs text-[var(--text-muted)]`: `Latest · Aug 4, 2026`
   - Entry rendered with the full `ChangelogEntry` anatomy (below) but with the title at `text-2xl` and the body not clamped.
   - Exists so the first screen answers "is this thing alive" without scrolling. Drop the four-item right rail: on a changelog, the list *is* the rail.
4. **The list** — **keep** the table idea, **adapt** into expandable rows. h2: **All changes** `font-heading font-[425] text-2xl mb-4`. Filter chips right of the h2 (`TagChip`, same component as the blog): **All · New · Improved · Fixed** — client-side, sets `?tag=`. No search field (open question 2).
   - Month group headers: `font-mono text-xs uppercase tracking-wide text-[var(--text-muted)] pt-8 pb-2` — `August 2026`. Source has none; Kolumn adds them because entries cluster (several per day on release days) and a flat table of 40 rows loses its shape.
   - **Entry anatomy** (`ChangelogEntry`, `src/components/marketing/`) — a `<details>`-free static block (everything visible; prerender needs the body in HTML for search engines, and 2–3 sentences don't need collapsing):
     - Grid `grid-cols-[120px_88px_1fr]` at ≥ md, `border-b border-[var(--border-subtle)] py-4`, whole row has an `id` = `YYYY-MM-DD-slug` for deep links.
     - Col 1: date `font-mono text-xs text-[var(--text-muted)] pt-1` — `Aug 4, 2026`. Repeats on every row (source does too); one date per row beats "same day" dashes for link targets.
     - Col 2: tag chip — `font-mono text-[11px] h-6 px-2 rounded-full border`, colour by kind: **New** `--label-green-bg/--label-green-text`, **Improved** `--label-blue-bg/--label-blue-text`, **Fixed** `--label-yellow-bg/--label-yellow-text`. Reuses `LABEL_BG` from `src/utils/formatting.js` — same palette the app's card labels use, so "New" on the changelog looks like a label on a card. Lime is not used (it's a state colour, and "New" is not a state).
     - Col 3: title `text-[17px] font-medium text-[var(--text-primary)]` as a link to its own anchor (Phosphor `Link` 14px appears on hover, `--text-faint`) · body `text-[15px] leading-6 text-[var(--text-secondary)] mt-1 max-w-[640px]` (one to three sentences; markdown allowed — inline code for settings paths) · optional trailing links row `font-mono text-xs mt-2`: `Tutorial →` / `Read the post →` / `Open Settings →`.
     - Hover: none on the row (it isn't a card). Focus ring on the title link only.
   - Page size: **20 entries** in the prerendered HTML, then a full-width **Show more** `Button variant="secondary"` (`w-full font-mono text-xs`, Phosphor `ArrowDown`) — direct lift of the source's "See more ↓" — appending 20 at a time client-side. Counter under it `20 of 47`.
5. **Right rail** — **drop** (no search, no tile). At ≥ lg the list runs at `max-w-[880px]`; the remaining width stays empty rather than being filled.
6. **CTA** — **drop**. A changelog reader is already a user or already evaluating; the nav has the button.
7. **Footer** — shared.

**Proportions kept**: 1px-rule table instead of cards, date/tag/title column order, 14px-ish cell text (Kolumn: 12px mono date + 17px title), 36px+ row pitch, full-width "See more" bar, 8px radius inputs, 12px tiles.
**Changed**: h1 44–48 Clash Grotesk 425 (not 52/700), no image, rows carry a body, month headers, label-palette tag chips, no rail, `max-w-6xl` container.

### Entries (from `git log`, user-visible only, rewritten; oldest last)

These six ship as the initial `src/content/changelog/*.md`. Dates are the commit dates.

```md
---
date: 2026-08-04
tag: new
title: Create a board from anywhere
links: { tutorial: start-from-a-template }
---
The "New board" dialog now opens from any page — the dashboard, a workspace, or the
middle of another board — instead of only from the boards list. Press the same
button you always did; it just works in more places.
```

```md
---
date: 2026-07-30
tag: improved
title: A new mark
---
Kolumn's logo is now the sprout. It's the same one Klay carries around the app, and
it replaces the old wordmark-only lockup in the sidebar, the sign-in screen, and the
browser tab.
```

```md
---
date: 2026-07-28
tag: new
title: Motion preference in Settings
links: { tutorial: export-theme-and-motion }
---
Settings → General has a new Accessibility section with a Motion control: **System**
follows your OS's reduce-motion setting, **Full** keeps every animation, **Reduced**
turns them down regardless of the OS. Modals, the card editor, tooltips, and Klay all
respect it.
```

```md
---
date: 2026-07-28
tag: improved
title: Modals and the card editor animate in and out
---
Opening a card, a dialog, or a tooltip now has a short enter/exit transition instead of
a hard cut, and dropping a card after a drag no longer flashes. Everything runs on
transform and opacity, and all of it honours the new Motion preference.
```

```md
---
date: 2026-07-28
tag: fixed
title: Drag-and-drop flicker on cross-column moves
---
Dragging a card into a different column could briefly show it in both places while
the move was saved. It now lands once, where you dropped it. Dragging inside a busy
board is also smoother, because columns re-render less while you drag.
```

```md
---
date: 2026-07-27
tag: improved
title: Boards load faster
---
Archived cards are no longer fetched when a board opens — they load the first time you
toggle **Archived**. Combined with a lighter first-load bundle, boards with a lot of
history open noticeably quicker. Also fixed on the way: unreadable text on some
lime-tinted pills and on the active Archived toggle in dark mode.
```

Deliberately **not** entries (from the same log): dev-server binding, self-hosted icon font, CSP fixes, RLS and RPC hardening, chat-usage counter tampering, billing of forged tool results, test/docs commits, the landing-page redesign (marketing, not product), the Kanbanning loader vocabulary (too small to announce). Security fixes get a changelog entry only when a user has to do something; otherwise they're a line in `/security` (open question 4).

## 4. Data and content sources

- **Content**: `src/content/changelog/<YYYY-MM-DD>-<slug>.md`, frontmatter `date (YYYY-MM-DD, required), tag: new|improved|fixed (required), title (≤ 72 chars), links?: { tutorial?: slug, post?: slug, app?: path }`. Body is markdown, 1–3 sentences; the loader warns in dev if it exceeds 80 words. Filename order = display order within a day; ties break by filename.
- **Loader**: same `src/lib/content.js` (`import.meta.glob` raw + frontmatter splitter), third glob for `changelog/`. Derived: month groups, tag counts, `latest`. `links.tutorial` / `links.post` are validated against the tutorials and blog globs at load — a dangling slug fails the build, not the page.
- **Renderer**: `react-markdown` + `remark-gfm` restricted to inline elements (`p`, `strong`, `em`, `code`, `a`) via `allowedElements` — no headings or images inside an entry.
- **Prerender + feeds**: `/changelog` prerendered with the first 20 entries and the latest block; `changelog/feed.xml` with one item per entry (title prefixed by tag: `New: Create a board from anywhere`); sitemap `lastmod` = newest entry date. No Supabase.
- **Process**: the entry is written **in the same PR** as the change, in the `docs:` or feature commit, so the changelog can't drift from what shipped. Add a lint rule later if it does.
- **Must stay in sync with app code**: Settings section names and control labels quoted in entries (`Settings → General`, `Motion`, `Archived`) — grep `src/components/settings/` when renaming; the support address in the title-row table.

## 5. Open questions
- Deep-link target for an in-app "What's new" affordance: the sidebar's bottom-left block (name + tier) is the natural spot, but it's a new sidebar item and CLAUDE.md asks for restraint there. Include it, or leave the changelog to the marketing footer only?
- Search: the source has one; with < 50 entries the tag chips plus browser find are enough. Add it at 100 entries?
- The support contact in the title-row table — `support@kolumn.app` is a guess; the app currently has no support email surfaced anywhere (Settings → Account uses in-app flows). Confirm or replace the row with a link to `/security`.
- Whether security hardening (RLS scoping, RPC lockdown, usage-counter tamper fix — three commits on 2026-07-27) gets a single combined **Improved** entry ("Tightened database access rules") for transparency, or stays off the changelog to avoid advertising the prior gap.
- Version-less is the brief's call, but a `#2026-08-04-create-board-anywhere` anchor is the only identifier an entry has. Is a short monotonically increasing `#47` in the date column wanted for support conversations ("which change broke it?")?
