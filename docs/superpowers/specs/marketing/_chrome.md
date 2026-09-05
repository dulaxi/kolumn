# Shared chrome — nav, footer, type scale, container, palette, buttons

> Source crawled: `https://claude.com/` (home) on 2026-09-02 at 1440w and 390w. Screenshots + metrics in the
> crawl harness `out/home.{json,txt,png}`, `out/home-mobile.png`, plus supplementary probes
> `out/home-probe.json`, `out/home-mega.{json,png}`, `out/home-mobile-{top,menu,menu-open}.png`.
> Kolumn route: none (shared shell for every `/…` marketing route) · Priority: P1 · Template family: chrome

Every other spec in this directory inherits the numbers below. Page specs only restate chrome when they
deviate from it. All measurements are computed styles at 1440×900 (desktop) and 390×844 (mobile),
`deviceScaleFactor` 1 and 2 respectively.

## 1. Purpose and SEO target

- **Job of this layer**: one nav, one footer, one type/spacing system so the ~30 marketing routes read as one
  site and as the same product as the app.
- **Shared meta the layout must emit on every page** (page specs supply the values): `<title>` (≤60 chars,
  pattern `<Page> · Kolumn`; the home page is just `Kolumn`), meta description (≤155), `<link rel="canonical">`,
  `og:title / og:description / og:url / og:site_name="Kolumn" / og:image (1200×630) / og:image:alt`,
  `twitter:card=summary_large_image`, `meta name="robots" content="index, follow, max-image-preview:large"`.
  The source emits exactly this set (see `out/home.json → meta`).
- **Structured data emitted once, site-wide** (source does the same as a single `@graph`): `WebSite`
  (`name: "Kolumn"`, `url`) + `Organization` (`name`, `url`, `logo`, `sameAs[]`). `sameAs` entries are an
  open question (no social handles in the brief).
- **Internal links**: the nav links to Features, Solutions, Pricing, Resources, Sign in, Get started; the
  footer links to all Tier 1 pages (link map in §3.7). Every marketing page therefore has at least one
  inbound link from the chrome, which is what makes the prerendered sitemap crawlable.

## 2. Source chrome anatomy (what claude.com does)

### 2.1 Nav

| Metric | Observed |
|---|---|
| Height | **84px** desktop, **72px** mobile |
| Position | `position: fixed; top: 0` — always visible while scrolling (no hide-on-scroll; probed at 600/1200/900 scrollY, transform stays identity) |
| Background | page cream `rgb(250,249,245)`, **no** border, **no** shadow, no backdrop blur; the hero's `padding-top: 104px` reserves the space |
| Inner container | 1312px wide at 1440 → **64px** side padding (same container as every section) |
| Logo | link 120×26, sits at y=29 (vertically centered in 84) — an SVG wordmark with an orange asterisk mark, no `<img>` |
| Left/centre cluster | 5 dropdown triggers (`Meet Claude`, `Platform`, `Solutions`, `Pricing`, `Resources`) + 1 plain link (`Login`). 15px / 400 / lh 24, colour `rgb(48,48,46)`, chevron icon 6px after the label, **24px** gap between items, 40px tall hit area (8px vertical padding). The cluster is right-aligned next to the CTAs, not centred. |
| Dropdowns | Mega-menu panels, not simple lists: white `rgb(255,255,255)` panel, **12px radius**, shadow `0 4px 16px rgba(0,0,0,0.10)`, no border, panel padding 12px 8px, top edge at y=70 (i.e. overlapping the last 14px of the header). Columns inside have a 12px muted eyebrow heading (`Products`, `Features`, …) and 15px link rows (~38px pitch). Widths vary per menu: 843px (4 cols), 425px (2 cols), 1043px (5 cols). Opens on hover, closes on mouse-out; trigger chevron flips. |
| CTAs | `Contact sales` — secondary: 36h, 12px side padding, **8px radius**, cream fill, 1px ring `rgb(209,207,197)` drawn as a box-shadow, 15px / 400, text `rgb(94,93,89)`. `Try Claude` — primary: 36h, 12px padding, 8px radius, ink `rgb(20,20,19)` fill, cream text, 15px / 400. **12px** gap between them; 25px between `Login` and the first CTA. Both are `<a>`. |
| Skip link | `Skip to main content → #main-content` as the first focusable element |

**Mobile collapse (390w)**: header 72px, logo 120×26 at x=34 (so **34px** side padding), a 24×24
three-line "Toggle menu" button at the right (48px hit area with 12px padding). Both CTAs are removed from
the bar. Tapping the toggle opens a **full-viewport overlay** on the page cream (rendered outside `<header>`
via a portal): the logo and an ✕ stay in the 72px bar; below it, an accordion — one row per dropdown
(`Meet Claude`, `Platform`, `Solutions`, `Pricing`, `Resources`) at ~76px row height, ~18px text, a `+`
icon at the right edge, hairline divider between rows; then `Login` as a plain row. The two CTAs are pinned
to the bottom of the overlay as a 50/50 pair (`Contact sales` outlined, `Try Claude` ink), ~52px tall,
8px radius, 34px inset. Body scroll is locked. Accordion rows expand in place to reveal the same links the
desktop mega-menu shows.

### 2.2 Footer

| Metric | Observed |
|---|---|
| Height | **1070px** at 1440; 2339px at 390 |
| Background | ink `rgb(20,20,19)`; text cream `rgb(250,249,245)`; headings/muted `rgb(135,134,127)`; hairline `rgb(48,48,46)` |
| Padding | 96px top / 96px bottom (66/66 on mobile); same 1312px container (64px sides; 34px on mobile) |
| Grid | Brand column 427px wide (x 64–491) · 32px gutter · **4 link columns of 189px with 32px gaps** (x = 523, 744, 965, 1187; 221px pitch). Column groups are *stacked* inside a column with ~48px between groups: col 1 = Products / Features / Models · col 2 = Solutions / Claude Platform · col 3 = Resources / Company · col 4 = Programs / Help and security / Terms and policies. 10 groups, 80 links total. |
| Brand column | Logo 144×31 (larger than the nav's 120×26) · a chat-style prompt input 427×~50 with a 28px orange (`rgb(198,97,63)`) send button, 8px radius · then, at the bottom of the column, an `ANTHROPIC` wordmark 108×12 and `© 2026 Anthropic PBC` 11px / lh 17 muted. |
| Group heading | `<h2>` 12px / 400 / lh 19 / letter-spacing 0.12px / muted grey. Semantically each group is an `h2` + `ul`. |
| Links | 12px / 400 / lh 19, cream, 4px vertical padding → **27px row pitch**. No underline at rest. `Privacy choices` is a `<button>` (opens a consent dialog), not a link. |
| Bottom row | 1px hairline top border, 16px padding-top, 63px tall: left = 4 social icons 16×16 on a 40px pitch (Instagram, LinkedIn, X, YouTube); right = language selector button 128×46, 12px text, 1px border `rgb(48,48,46)`, 12px radius, globe icon + chevron. |
| Mobile | Same content in **2 columns** (x 34 and 211, 145px wide, 32px gap), groups paired left/right and stacked (Products|Features, Models|Solutions, …). Brand block moves to the top (logo + prompt input), `ANTHROPIC` wordmark + © line sit above the hairline, social + language row below it. |

### 2.3 Type scale (computed)

| Level | Font | Size / lh | Weight | Colour | Notes |
|---|---|---|---|---|---|
| h1 (hero) | anthropicSerif | **72 / 79** (1.10) | 330 | ink | 51 / 61 on mobile |
| h2 (section) | anthropicSerif | **52 / 62** (1.19) | 500 | ink | 35 / 42 on mobile; centred |
| h3 (card title) | anthropicSerif | **30 / 36** | 400 | ink | plan-card names |
| Lead / hero sub | anthropicSans | **23 / 35** | 400 | `rgb(94,93,89)` | |
| Body (page default) | anthropicSans | **15 / 23** | 400 | `rgb(20,20,19)` | `<body>` computed |
| Body (inside cards) | anthropicSans | 16 / 24–26 | 400 | `rgb(48,48,46)` | list rows have 12px gap |
| FAQ question | anthropicSans wrapper 15/23; rendered glyphs are the serif at ≈18px | | | | |
| Caption / price note | anthropicSans | 14 / 20 | 400 | `rgb(94,93,89)` | |
| Small / eyebrow / footer | anthropicSans | 12 / 18–19 | 400 | muted | letter-spacing 0.12px on eyebrows |
| Micro | anthropicSans | 11 / 17 | 400 | muted | © line |
| Mono | anthropicMono | loaded, unused above the fold | | | |

### 2.4 Container and rhythm

- **Container**: `max-width: 1440px` with 64px side padding → **1312px** content width at 1440. At 390: **34px** padding → 322px.
- **Section vertical padding**: hero 104 top (below the 84 fixed nav; visual start at 128) / 0 bottom; plans **128 / 64**; FAQ **128 / 128**. Mobile: 92; 96/32; 96/96.
- **Two-column hero**: 632 + 632 with a **48px** gutter; copy column has a 32px vertical stack gap.
- **Card grid**: 3 × 416px, **32px** gaps; card = white, **24px radius**, **1px border `rgb(209,207,197)`**, 32px padding, **no shadow**.
- **Segmented control**: 44px pill, 4px padding, 12px radius, fill `rgb(240,238,230)`; buttons 36h, 24px side padding, 8px radius, 14px / 500.
- **Auth card (hero)**: 390px inputs/buttons inside a bordered tile (~24px radius); buttons 44h, 9.6px radius, 17px / 600.
- **FAQ**: 660px centred column; rows 89px, hairline dividers, `+` icon right.
- **Shadows**: none on cards; `0 4px 16px rgba(0,0,0,.10)` on floating menu panels only.

### 2.5 Palette roles (source)

| Role | Value | ×uses |
|---|---|---|
| Page bg | `rgb(250,249,245)` warm cream | 425 |
| Surface (cards, menus) | `rgb(255,255,255)` | 14 |
| Surface-raised (segmented track) | `rgb(240,238,230)` / `rgb(232,230,220)` | 10 |
| Text primary | `rgb(20,20,19)` | 471 |
| Text secondary | `rgb(48,48,46)` | 91 |
| Text muted | `rgb(94,93,89)` | 46 |
| Text faint / eyebrows | `rgb(135,134,127)` | 54 |
| Border | `rgb(209,207,197)` (cards, secondary button ring) | |
| Dark section bg | `rgb(20,20,19)` (footer) with `rgb(48,48,46)` hairlines and `rgb(176,174,165)` muted text | |
| Accent | `rgb(198,97,63)` terracotta — logo mark and one 28px send button; **never** a text or CTA colour | 1 |

### 2.6 Buttons (source)

| Tier | Where | Height | Padding | Radius | Fill / border | Type |
|---|---|---|---|---|---|---|
| Primary | nav `Try Claude`, plan cards | 36 (nav) / 40 (cards) / 44 (hero) | 12 / 16 / 20 | 8 (9.6 in hero) | ink fill, cream text | 15/400 · 16/500 · 17/600 |
| Secondary | nav `Contact sales`, hero OAuth | 36 / 44 | 12 / 20 | 8 / 9.6 | cream fill, 1px ring `rgb(209,207,197)` | 15/400 · 17/600 |
| Tertiary | nav `Login`, footer links | 40 | 0 | 0 | none | 15/400, colour only |

### 2.7 Homepage anatomy — reference only (Kolumn's landing exists and is not being rebuilt)

Page height 4040px at 1440.

1. **Hero** — 876px · pad 104/0 · 2 cols 632/632 gap 48 · left: h1 72/330 + 23px lead + 390px auth card (Google / email / SSO, privacy line) + outlined "Download desktop app" · right: 632×724 grey demo tile ≈24px radius.
2. **Explore plans** — 1413px · pad 128/64 · centred h2 52 · segmented `Individual | Team and Enterprise` · 3 plan cards 416×919 (icon, h3 30, 16px tagline, price, 40px primary CTA, hairline, checklist 16/26) · 12px footnote.
3. **FAQ** — 681px · pad 128/128 · h2 52 · 660px accordion, 3 rows × 89px.
4. **Footer** — 1070px (see §2.2).

## 3. Kolumn version

Keep the proportions (84px nav, 1312 container at 1440, 32px grid gaps, 4-column ink footer, 8px button
radius, hairline dividers). Change: fonts (Clash Grotesk 425 + Inter, no serif), radii above 12px (cards go
to 12px; the kanban-card 16px exception does not apply to marketing tiles), the terracotta accent (Kolumn has
no warm accent; lime is a state colour, not a brand fill), and every hex → token.

### 3.1 Nav — `MarketingNav`

| Property | Kolumn |
|---|---|
| Height | **84px** desktop (`py-6` + 36px controls — the existing landing `MobileNav` already lands on exactly 84) · **72px** mobile (`py-[18px]` + 36px) |
| Position | `sticky top-0 z-50` (sticky rather than fixed so pages don't need a padding-top offset). Background `--surface-page`, no border or shadow at rest. Optional: add `border-b border-[var(--border-subtle)]` once `scrollY > 8` — a 1px hairline, never a shadow or blur. |
| Container | `max-w-[90rem] mx-auto`, width `calc(100% - 2 * clamp(2rem, 1.43rem + 2.86vw, 4rem))` → 64px sides at 1440 (1312 inner), 32px at ≤640. This is the landing nav's existing container; reuse it verbatim. |
| Logo | `<KolumnLockup text={28} />` linking to `/` (visual ≈120×28, parity with the source's 120×26). |
| Links | Flat row, right-aligned beside the CTAs: **Features** `/features` · **Solutions ▾** · **Pricing** `/pricing` · **Resources ▾**. Inter 15px / 400, `--text-secondary`, hover `--text-primary`, 40px hit height, **24px** gap. Chevron = Phosphor `CaretDown` 12px, `gap-1.5`. Four items only; Templates and Connectors live inside the footer and the Features page, not the bar. |
| Dropdown panels | Two mega-menu panels rendered with the `Popover` primitive (`placement="bottom-start"`, open on hover + focus, 150ms `--dur-overlay-in`). Panel: `--surface-card` bg, **12px radius**, `1px solid var(--border-subtle)`, shadow `0 4px 24px rgba(27,27,24,0.10)` (the design-system raised shadow; the source's 16px blur is close enough), padding 12px 8px. Inside: eyebrow `h3` IBM Plex Mono 11px uppercase tracking `0.06em` `--text-muted`, then link rows 15px / 400 `--text-primary`, 36px tall, 8px radius hover `--surface-hover`. **Solutions** = 2 columns × 4 (Startups, Small business, Nonprofits, Students / Legal, Healthcare, Customer support, Engineering), ≈420px wide. **Resources** = 1 column (Blog, Tutorials, Customer stories, Support, Status), ≈220px wide. |
| Sign in | Secondary: `h-9 px-5 min-w-[5rem] text-[15px] rounded-lg` `--text-secondary` on `--surface-page` with `border-[0.5px] border-[var(--color-sand)]` — exactly the landing's current "Sign in" control. Destination: the landing's `#sign-in` anchor today (`/#sign-in` from other routes). |
| Get started | Primary: same box, `bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)]`, → `/onboarding`. **12px** gap between the two. |
| Button primitive | Both map to `<Button size="md">` (h-9, 8px radius) with `className="px-5 text-[15px] font-normal"`. Recommend adding a `size="nav"` (`h-9 px-5 text-[15px] gap-2`) to `Button.jsx` rather than repeating the override on every page; until then the override is the spec. |
| Skip link | `<a href="#main" class="sr-only focus:not-sr-only …">Skip to content</a>` first in DOM; `MarketingLayout` renders `<main id="main">`. |

**Mobile (< `sm`, 640px)**: bar = lockup + a 36×36 icon button (Phosphor `List` 20px; `X` when open;
`aria-label="Open menu" / "Close menu"`, `aria-expanded`). Tapping opens a **full-viewport overlay**
(`fixed inset-0 top-[72px]`, `--surface-page`, body scroll lock via the same helper `Modal` uses, enter with
the existing `animate-dropdown` class, reduced-motion aware). Content, 20px side padding:

- Rows: `Features`, `Solutions`, `Pricing`, `Resources` — 56px tall, Inter 17px / 400 `--text-primary`,
  1px `--border-subtle` divider between rows. `Solutions` and `Resources` are accordions: Phosphor `Plus`
  (→ `Minus` when expanded) 20px at the right edge; expanded children are 44px rows, 15px, `--text-secondary`,
  indented 0 (source keeps them flush).
- Then `Sign in` as a plain 56px row.
- Bottom-pinned CTA pair (`fixed bottom-0`, 20px inset, 16px bottom padding, 12px gap): `Sign in`
  secondary + `Get started` primary, each `flex-1 h-11 text-[15px] rounded-lg` (= `Button size="lg"`).

This replaces the landing's current two-button dropdown for marketing routes; whether the landing itself
adopts it is an open question (§5).

### 3.2 Footer — `MarketingFooter`

| Property | Kolumn |
|---|---|
| Background | Dark section: `bg-[var(--color-ink)]`. `--color-ink` is one of the deliberately theme-stable raw tokens (not overridden in dark), so the footer is ink in both themes. Text needs theme-stable light tokens — see §5; until they exist, use `--surface-page` and `--text-*` on a `--surface-raised` footer with a `border-t border-[var(--border-default)]` as the fallback (quiet footer). |
| Padding | **80px** top / **48px** bottom (source 96/96; trimmed because Kolumn's footer is ~⅓ the link count). Mobile 56 / 40. |
| Container | Same as the nav (1312 at 1440, 32px sides ≤640). |
| Grid (≥1024) | `grid-cols-12 gap-8` (32px): brand column `col-span-4` (≈416px, source 427) · 4 link columns `col-span-2` each (≈189px, source 189). Column order and **stacking** copies the source: col 1 = **Product**; col 2 = **Solutions**; col 3 = **Resources** then **Company** stacked with **48px** between groups; col 4 = **Legal**. |
| Grid (640–1023) | Brand full-width on top, then link groups `grid-cols-3 gap-8`. |
| Grid (<640) | Brand on top, then `grid-cols-2 gap-x-8 gap-y-12` (source: 2 cols at 145px, 32px gap) — Product|Solutions, Resources|Company, Legal|—. |
| Brand column | `<KolumnLockup text={32} />` (source 144×31 — the footer mark is one step larger than the nav's) · one-line tagline, Inter 14px `muted`: *"A kanban that stays a kanban."* (from the landing FAQ positioning; not verbatim Anthropic copy) · no prompt input (Kolumn has no public chat) · at the column's bottom: `© {year} Kolumn` IBM Plex Mono 11px / lh 17 muted. |
| Group heading | `<h2>` IBM Plex Mono **11px** uppercase, tracking `0.06em`, `muted`, `mb-3` (source: 12px sans muted; mono is Kolumn's small-caps chrome voice per the brief). |
| Links | Inter **13px** / 400 / lh 19, light text, `py-1` → **27px row pitch** (identical to source pitch), hover: underline `underline-offset-[3px] decoration-[var(--color-sand)]` (the landing's existing link hover), no colour change. |
| Bottom row | `mt-12 pt-4 border-t` 1px hairline (theme-stable dark border — see §5) `flex justify-between items-center`, 56px tall. Left: social icons Phosphor `XLogo`, `GithubLogo`, `LinkedinLogo` at 16px, 24px gap (40px pitch), `muted` → light on hover (handles TBD, §5). Right: replaces the source's language selector with the theme `SegmentedControl` (options `system / light / dark`, Phosphor `Monitor` / `Sun` / `Moon` icons, `ariaLabel="Theme"`), wired to `settingsStore.theme` — 36px, `--surface-raised`-on-ink is not available, so render it with `bg-transparent border border-[…hairline]` (§5). Drop it if the theme tokens question isn't settled; nothing else depends on it. |
| Height estimate | ≈ 80 + 32 (lockup) + 12 + 19 + 8×27 (longest column, Solutions) + 48 + 56 + 48 ≈ **520px** at 1440; ≈ 1100px at 390. |

### 3.3 Type scale — Kolumn mapping

Font roles: **headings = Clash Grotesk (`--font-heading`) weight 425**, tracking `-0.01em` (`tracking-tight`);
**body = Inter Variable (`--font-sans`) 400/500**; **chrome small caps / captions in code-ish contexts = IBM
Plex Mono (`--font-mono`)**. No serif anywhere. Hero display may drop to weight 300 (the brief's pre-auth
display weight); the landing's own h1 is 400 — either is acceptable for a display line, 425 is the default.

| Level | Source | Kolumn desktop | Kolumn mobile (<640) | Tailwind |
|---|---|---|---|---|
| Display / h1 | 72 / 79 serif 330 | **56px / 1.08** (3.5rem) Clash 425, `-0.02em` | 40px / 1.1 (2.5rem) | `font-heading font-[425] text-[2.5rem] sm:text-[3.5rem] leading-[1.08] tracking-[-0.02em]` |
| h2 (section) | 52 / 62 serif 500 | **36px / 1.15** (2.25rem) Clash 425 | 30px / 1.2 (1.875rem) | `font-heading font-[425] text-3xl sm:text-4xl leading-[1.15] tracking-tight` |
| h3 (card / group) | 30 / 36 serif 400 | **24px / 1.25** (1.5rem) Clash 425 | 22px | `font-heading font-[425] text-2xl leading-[1.25]` |
| h4 (row / tile) | — | **18px / 1.35** (1.125rem) Inter 500 | 17px | `text-lg font-medium` |
| Lead | 23 / 35 | **20px / 1.5** (1.25rem) Inter 400 `--text-secondary` | 18px | `text-lg sm:text-xl leading-relaxed` |
| Body | 15 / 23 | **16px / 1.625** (1rem) Inter 400 `--text-secondary` (primary in prose pages) | 16px | `text-base leading-relaxed` |
| Body small / list rows | 16 / 26 | 15px / 1.6 | 15px | `text-[15px] leading-relaxed` |
| Caption | 14 / 20 | **13px / 1.5** (0.8125rem) Inter `--text-muted` | 13px | `text-[13px]` |
| Eyebrow / label | 12 / 19 + 0.12px | **11px** IBM Plex Mono uppercase `0.06em` `--text-muted` | 11px | `font-mono text-[11px] uppercase tracking-[0.06em]` |
| Micro | 11 / 17 | 11px mono `--text-faint` | 11px | `font-mono text-[11px]` |

Note: the landing's section `h2` is currently `text-3xl` (30px). Marketing hub/feature pages use the 36px
level above; the landing may stay at 30px until it is next touched (§5).

### 3.4 Container and rhythm — Kolumn

| Thing | Source | Kolumn |
|---|---|---|
| Chrome container (nav, footer) | 1440 max, 64px sides | `max-w-[90rem]` + `clamp(2rem, 1.43rem + 2.86vw, 4rem)` sides → **1312 @ 1440**, 32px @ ≤640 (existing landing nav container) |
| Content container (sections) | 1312 | **`max-w-6xl` (1152px) `px-6 sm:px-10`** — the landing's section container. Wide sections (3-card pricing grids, galleries) may use `max-w-[74rem]` (1184) as `LandingPage` already does for plans. |
| Prose container (articles, legal) | 660 (FAQ) | `max-w-2xl` (672px) |
| Section vertical padding | 128 / 128 | **`py-20` (80px)** desktop, `py-14` (56px) mobile — matches the landing's rhythm. Page hero on hub pages: `pt-16 pb-20`. |
| Heading → body gap | 24–32 | `mb-3` heading→lead, `mb-12` intro block→content (landing convention) |
| Grid gaps | 32 | **`gap-8` (32px)** desktop, `gap-4` (16px) mobile; 2-col hero `gap-10` (40px) |
| Card / tile | 24px radius, 1px `rgb(209,207,197)`, 32px pad, white | **12px radius**, `1px solid var(--border-default)`, `p-6 sm:p-8`, `bg-[var(--surface-card)]`, **no shadow**. Cards inside a dark section: `bg-[var(--surface-raised)]`-equivalent is not available on ink — keep dark-section tiles borderless with a hairline (§5). |
| Floating panels | 12px radius, shadow 16px | 12px radius, `0 4px 24px rgba(27,27,24,0.10)` (design-system raised shadow), 1px `--border-subtle` |
| Segmented control | 44px pill, 12px radius | `SegmentedControl` primitive as-is |
| Dividers | 1px `rgb(232,230,220)` | `border-[var(--border-subtle)]` (hairline lists), `--border-default` (structural) |
| Accordion row (FAQ) | 89px, `+` | landing `FaqItem` as-is |

### 3.5 Palette roles → tokens

| Role | Source | Kolumn token |
|---|---|---|
| Page bg | warm cream | `--surface-page` |
| Surface (cards, panels) | white | `--surface-card` |
| Surface raised / tracks / hover | `rgb(240,238,230)` | `--surface-raised`, hover `--surface-hover` |
| Text primary | `rgb(20,20,19)` | `--text-primary` |
| Text secondary | `rgb(48,48,46)` | `--text-secondary` |
| Text muted | `rgb(94,93,89)` | `--text-muted` |
| Text faint / eyebrows | `rgb(135,134,127)` | `--text-faint` (eyebrows use `--text-muted` for AA) |
| Borders | `rgb(209,207,197)` / `rgb(232,230,220)` | `--border-default` / `--border-subtle` (`--color-sand` for the landing's 0.5px nav ring) |
| Primary button | ink / cream | `--btn-primary-bg` / `--btn-primary-text` / `--btn-primary-hover` |
| Accent | terracotta (mark only) | none in chrome. Lime (`--accent-lime`, `--accent-lime-wash`, `--accent-lime-text`) appears only as *state*: "current plan" badges, success notices, the selected segment. Never a fill for a CTA or a logo mark. |
| Dark section bg | `rgb(20,20,19)` | `--color-ink` (theme-stable). Light-on-ink text and hairline tokens do not exist yet — §5. |

### 3.6 Button system → `Button`

| Tier | Source | Kolumn | Primitive |
|---|---|---|---|
| Primary (nav) | 36h · 12px pad · r8 · ink | 36h · 20px pad · r8 · `--btn-primary-bg` · 15px/400 | `Button variant="primary" size="md"` + `px-5 text-[15px] font-normal` (or proposed `size="nav"`) |
| Primary (card / section CTA) | 40h · 16px · r8 · 16/500 | **44h** · 20px · r8 · 14–16px/500, `w-full` inside cards | `Button size="lg"` (h-11 px-5 text-sm) or `size="xl"` (text-base) |
| Primary (hero) | 44h · 20px · r9.6 · 17/600 | 44h · 20px · r8 (`!rounded-[0.6rem]` only inside `HeroAuthCard`, which already does this) · 16/500 | `Button size="xl"` |
| Secondary | cream + 1px ring · same heights | `--surface-card`/`--color-cream` fill, `1px var(--color-sand)` border, `--text-primary` | `Button variant="secondary"` at the matching size; nav variant uses the landing's `border-[0.5px]` sign-in style |
| Tertiary / text | 40h, no box, colour only | 40h hit, no box, `--text-secondary` → `--text-primary`, optional Phosphor `ArrowRight` 14px trailing | `Button variant="ghost"` or a plain `<Link>` with `underline-offset-[3px] decoration-[var(--color-sand)]` |
| Destructive | n/a | red | `Button variant="destructive"` — not used in chrome |

Rules carried over from `CLAUDE.md`: ink for every affirmative action, **no lime button**, 8px radius,
`focus-visible` ring is the primitive's (`--color-lime-dark`, 2px, offset 1) — do not restyle. Loading state
uses the primitive's `LetterWave`.

### 3.7 Kolumn footer link map (Tier 1 pages only)

Grouping mirrors claude.com (Products · Solutions · Resources · Company · Terms and policies), collapsed to
Kolumn's five groups. Column placement: 1 = Product, 2 = Solutions, 3 = Resources + Company (stacked),
4 = Legal. `Log in` and `Privacy choices` are not page routes (noted inline).

**Product** (col 1)
| Label | Route |
|---|---|
| Features | `/features` |
| Pricing | `/pricing` (marketing; distinct from the in-app `/plans` picker) |
| Templates | `/templates` |
| Connectors | `/connectors` |
| Changelog | `/changelog` |
| Log in | `/#sign-in` (landing auth card anchor; a dedicated `/login` route is an open question) |

**Solutions** (col 2, base `/solutions/`)
| Label | Route |
|---|---|
| Startups | `/solutions/startups` |
| Small business | `/solutions/small-business` |
| Nonprofits | `/solutions/nonprofits` |
| Students | `/solutions/students` |
| Legal | `/solutions/legal` |
| Healthcare | `/solutions/healthcare` |
| Customer support | `/solutions/customer-support` |
| Engineering | `/solutions/engineering` |

**Resources** (col 3, top)
| Label | Route |
|---|---|
| Blog | `/blog` |
| Tutorials | `/tutorials` |
| Customer stories | `/customers` |
| Support | `/support` |
| Status | `/status` |

**Company** (col 3, stacked 48px below Resources)
| Label | Route |
|---|---|
| About | `/about` |
| Careers | `/careers` |
| Security | `/security` |

**Legal** (col 4)
| Label | Route |
|---|---|
| Terms | `/terms` (exists — `TermsPage` via `LegalPage` shell) |
| Privacy | `/privacy` (exists — `PrivacyPage`) |
| Usage policy | `/legal/usage-policy` |
| Responsible disclosure | `/legal/responsible-disclosure` |
| Privacy choices | `<button>` opening analytics/cookie preferences (PostHog opt-out) — no route; falls back to `/privacy#choices` if no dialog ships |

The same array feeds the nav dropdowns (Solutions, Resources), the footer, and the build-time sitemap, so
it should live once in `src/content/marketing-nav.js` (see §4).

### 3.8 Proposed shared React shape

`src/components/marketing/MarketingLayout.jsx` — a react-router **layout route** (`<Route element={<MarketingLayout />}>` wrapping every marketing `<Route>` in `App.jsx`, rendering `<Outlet />` inside `<main id="main">`). Props: `nav` (`'full' | 'minimal'` — minimal = lockup + Get started only, for legal/utility pages), `footer` (`'full' | 'minimal'` — minimal = one-row footer like the landing's today), `cta` (`{ label, to }`, default `Get started → /onboarding`), `className`. It composes `MarketingNav.jsx` (desktop bar + mobile overlay + the two `Popover` panels) and `MarketingFooter.jsx` (grid + bottom row), both reading `NAV_LINKS` / `FOOTER_GROUPS` from `src/content/marketing-nav.js`; page-level meta goes through a small `Seo.jsx` in the same folder (`title`, `description`, `canonical`, `ogImage`, optional `jsonLd`) that sets `<head>` tags for the prerenderer. `LandingPage.jsx` keeps its own `MobileNav`/footer for now; migrating it onto `MarketingLayout` is a separate change. Everything wraps the `landing-font` scope so Inter is the base and `font-heading` is opt-in, exactly as the landing does.

## 4. Data and content sources

- `src/content/marketing-nav.js` — `NAV_LINKS` (flat items + dropdown groups) and `FOOTER_GROUPS`
  (heading → `[{ label, to, external? }]`) as plain constants. The sitemap generator imports the same file so
  nav, footer, and `sitemap.xml` cannot drift.
- Footer tagline, © year (`new Date().getFullYear()`), social handles: constants in the same file.
- Theme selector reads/writes `settingsStore.theme` (already persisted locally).
- No Supabase reads in the chrome; nothing here depends on auth state except that a signed-in user hitting
  a marketing route should see `Open Kolumn → /dashboard` in place of `Sign in` + `Get started`
  (`useAuthStore((s) => s.user)`, same check `LandingPage` makes).

## 5. Open questions

- **Theme-stable light-on-ink tokens.** The footer (and any dark section) needs text/hairline tokens that do
  not flip in dark mode (`--surface-page`/`--text-*` all invert; `--btn-primary-text` becomes ink). Proposal:
  add `--text-on-ink`, `--text-on-ink-muted`, `--border-on-ink` to `index.css` with identical values in both
  themes. Until decided, the fallback is the quiet `--surface-raised` footer.
- **`/login` route.** Sign-in currently lives only in the landing's `HeroAuthCard` behind `#sign-in`. Nav and
  footer "Log in" links from other routes need either a `/login` page or the `/#sign-in` deep link.
- **Social handles and `Organization.sameAs`.** No X/GitHub/LinkedIn URLs in the brief; icons are specced but
  the hrefs are blank.
- **`Button size="nav"`.** Whether to add the `h-9 px-5 text-[15px]` size to the primitive or keep the
  className override the landing uses today.
- **Landing parity.** Whether `LandingPage` adopts `MarketingLayout` (36px h2, full footer, overlay mobile
  menu) or stays as-is until its next redesign.
