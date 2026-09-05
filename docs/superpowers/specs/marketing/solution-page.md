# Solution page — marketing page spec (template for `/solutions/<slug>`)

> Source crawled: https://claude.com/solutions/small-business, https://claude.com/solutions/nonprofits,
> https://claude.com/solutions/education on 2026-09-02. Screenshots + metrics in the crawl harness
> `out/sol-small-business.*`, `out/sol-nonprofits.*`, `out/sol-education.*` (plus `*-m2.json` targeted
> DOM pass and `*-{hero,quotes,benefits,tabs,faqcta,plans,connect,logos,rows,products,commit,cta}.png` crops).
> `claude.com/solutions/startups` and `/solutions/engineering` are 404 — small-business was the closest
> third page. There is **no** `/solutions` hub on claude.com (it redirects to claude.ai and 403s); the
> hub is the nav mega-menu. The Kolumn hub is specced separately in `solutions.md`.
> Kolumn route: `/solutions/<slug>` · Priority: P2 · Template family: solution

This file is the **template**. Per-vertical copy (8 verticals) lives in `solutions.md` § "Vertical copy
blocks" and in `src/content/solutions/<slug>.js`. Everything below applies to every `/solutions/<slug>`.

## 1. Purpose and SEO target
- **Job of this page**: convince one kind of team ("startups", "legal", …) that Kolumn fits how they
  already work, show them a board they recognise, and send them to sign up with that board seeded.
- **Primary query intent**: `kanban for <vertical>` / `<vertical> project management board`.
  Secondary: `ai task board for <vertical>`, `trello alternative for <vertical>`,
  `<vertical> to-do board template`, `simple kanban <vertical> team`.
- **`<title>`**: `Kolumn for <vertical> — an AI kanban for <one-word job>` (≤60 chars; per-slug value in
  content file, e.g. `Kolumn for startups — an AI kanban for launches`).
  **meta description** (≤155): per slug, pattern "Boards, columns, cards. Paste <what they have>, get
  cards with dates and owners. Free to start; Pro is $8/month." **OG title** = `<title>`; **OG
  description** = meta description; OG image: one shared `og-solutions.png` with the vertical name
  overlaid at build (open question 5).
- **Structured data**: `BreadcrumbList` (Home › Solutions › <vertical>) and `FAQPage` for the FAQ
  section. The source emits `Question`/`Answer` JSON-LD per FAQ item (nonprofits, small-business) and a
  breadcrumb bar in the DOM; nothing else. Do not emit `Product` here — that belongs to `/pricing`.
- **Internal links in**: `/solutions` hub tiles; landing page footer "Solutions" column (chrome spec);
  `/pricing` "Who is Kolumn for?" row if it exists. **Out**: `/onboarding` (primary CTA), `/pricing`,
  `/solutions` (breadcrumb + "All solutions"), the other 7 solution pages (footer of page, "Also for"),
  `/privacy` from the security FAQ answer.

## 2. Source page anatomy (what Anthropic does)

All three pages share one Webflow template (`u-section` / `section_contain` / `list_marginalia` /
`card_feature` classes). Ordered top to bottom at 1440w; page heights 9,550 / 10,143 / 9,537 px.

`## 0. Nav + breadcrumb bar` — nav 84px, static, transparent over page bg; beneath it a **50px
breadcrumb bar** (`Solutions / Small business` at 14px muted, `Explore here ▾` dropdown at far right,
1px hairline below). Solution pages are the only family with this bar. *Why:* orients the reader
inside a 20-page solutions tree and offers lateral navigation without the mega-menu.

`## 1. Hero` — h ≈ 794 (small-business) / 785 (nonprofits) / 1,050 (education) · container 1,312
(1440 − 2×64) · content starts ≈310px below hero top · bg page cream · **two-column**: text left
(eyebrow 15/24 muted → h1 64/70 serif 500, max-w 665 → subhead 20/32 muted, max-w 727 → buttons),
illustration right (≈330×350 blob-and-line doodle, x≈1000) · CTAs: 1 primary ink pill (44px tall,
radius 8, 15px medium) + 1 secondary sand-fill; nonprofits has primary only. Education is the
**display variant**: h1 112/123 serif 400 spanning the full 1,312, then a 2-col row (illustration
left, subhead 23/35 + one primary button right). *Why:* the headline is the vertical's promise; the
illustration signals "this page is for you" before a word is read.

`## 2. Proof strip` — h ≈ 422 (sb) / 693 (np) / 450 (edu) · container 1,312 · bg cream ·
three variants: (a) **3 testimonial columns** 448px each with 1px vertical hairlines and no outer
border; each column = logo 176×40 at top, quote 17/27 ink at 32px inset, attribution 13px muted
pinned to the bottom; column ≈330 tall. (b) nonprofits: same card as a **carousel** — 4 visible
columns of 328px, 12 slides, dot pager + 40px circular prev/next. (c) education: **logo wall**,
9 logos 126–160px wide × 36–51 tall on a 4 + 4 + 1 grid, 110px row pitch, no quotes. *Why:* social
proof before any feature claim.

`## 3. Section opener (repeats)` — every section after the hero opens with a **64px centred doodle
icon** ≈140px below the section top and ≈250px of whitespace before content; an **empty h2**
(52/62 serif 500, 1,012 wide) is left in the DOM as an anchor. Sections alternate bg: cream → white
→ cream. A **128px `u-section-spacer`** sits between major blocks. *Why:* pacing; the pages are
deliberately airy (≈1,200–1,500px per section).

`## 4. Benefit list ("marginalia")` — h ≈ 1,277 (sb) / 1,446 (np) · **narrow 640px column** centred
(x 400–1040) · bg white · **4 rows**, each a `grid 304px 304px`, gap 32, padding-top 32, 1px top
hairline · left cell: icon 24px + 12px gap + h3 19/23 serif 500 (ink-2, a step lighter than body ink); right cell:
body 20/32 muted · row pitch ≈197 (sb) / ≈252 (np). Flanking **marginalia cards** in the gutters
(x=64 and x=1,160): 216px wide, radius 12, 1px hairline, white, 16px padding, 182×100 image tile
(radius 4, flat colour + doodle), 13px semibold label, 13px muted caption, 30px secondary button.
*Why:* the four reasons to believe, in a reading column; the side cards park "trust centre" /
"tutorials" without interrupting the list.

`## 4b. Benefit grid (education variant)` — h ≈ 1,143 · inner grid 1,086 wide (x 177–1,263) ·
**3 columns × 362px** separated by 1px vertical hairlines (no top/bottom rule, no radius, no fill) ·
each: 32px padding, icon 24–28px, ≈48px gap, h3 19/23 serif 500, body 15/24 muted; card ≈336 tall.
Followed by a **banner** 1,312×190, radius 24, cream fill, 1px hairline: 48px icon + h2 28 serif +
primary button right ("K-12 teacher? …"). *Why:* same four-reasons job, wider and shallower.

`## 5. Tabbed demo` — h ≈ 1,459 (sb) / 1,432 (np) · bg cream · **tab bar**: sand-fill pill container
(radius 16, 8px inner padding) holding 4–5 tabs, each 40px tall, radius 12, padding 8/16, 20px sans,
16px icon + 8px gap; active = white fill + ink text, inactive = muted. A hand-drawn "NOTE" annotation
(10px uppercase, 0.5px tracking) points at the canvas. **Canvas** 1,088×608 (x 176–1,264), radius 24,
tinted fill (mint / lavender), containing a dark "Prompt" card 300×140 (radius 12) and a
"Connectors" card. Below: caption row on a `416px 416px` grid (gap 32, centred): h3 25/38 serif left,
body 17/27 muted right. nonprofits swaps the canvas for a rendered document mock. *Why:* the one
place the page shows the product doing the vertical's job.

`## 6. Feature rows (education)` — h ≈ 2,140 · same 640px marginalia list as §4 but 3 rows
("Faculty / Researchers / Administrators"), row pitch ≈306, plus a floating prompt-card stack in the
left gutter (216 wide, "How can I help?" + copper "Ask Claude" 32px button). *Why:* audience split
inside one page.

`## 7. Product / resource cards (education)` — h ≈ 1,627 · **3 × 2 grid** across the full 1,312,
cards 437 wide × ≈340 tall separated by 1px vertical hairlines, row gap 64; each: 32px padding,
icon 24, h3 19/23 serif at ≈72px below the icon, body 15/24 muted, "Learn more" secondary button
30px tall radius 6. Ends with a "Connected to your educational ecosystem" 3-logo strip. *Why:*
cross-sell the product family. (Nonprofits has the analogous "connects to your tools" split card:
1,088×432, radius 24, left half tinted with a 3×3 grid of 80px app tiles, right half h2 32/35 +
body 17/27 + secondary button.)

`## 8. Pricing pair (nonprofits only)` — h ≈ 1,292 · two cards 464 wide (x 240 / 736), radius 24,
1px hairline, white, 32px padding: 48px icon, h3 32/35 serif, sub 17, price 26 semibold, full-width
primary button, hairline, 17px check-list. Footnote 15px muted. *Why:* discount tiers are the
nonprofit offer.

`## 9. FAQ` — h ≈ 965 (sb) / 819 (np) · 640px column · 5 (sb) / 3 (np) items · row 88px (padding
32/0), question 20 serif ink, 16px plus icon right, 1px hairlines · accordion. *Why:* objections
(data training, safety, price, setup, support).

`## 10. CTA band (small-business only)` — h 298 incl. 128 bottom margin · card 1,312×170, radius 24,
1px hairline, cream · h2 28 serif left at 64px inset · right: secondary + primary buttons (44px).
Nonprofits ends on the FAQ; education ends on a "Students / Educators / Administrators" tabbed
prompt-card trio (3 cards 298×298, radius 12, 1px hairline, copper 40px send button). *Why:* last
conversion point.

`## 11. Footer` — 1,029px, 5 link columns + legal row (shared chrome; see chrome spec).

**Type scale observed** (Anthropic Serif for headings, Anthropic Sans for body):
h1 64/70/500 (display variant 112/123/400) · h2 52/62/500 (anchor; usually empty) · h2-alt
32–36/35–47/500 · h3 19/23/500 (list rows, cards) · h3-demo 25/38/500 · h3-pricing 32/35 · body
20/32/400 · body-2 17/27 · small 15/24 · caption 12–13/19 · eyebrow 10 uppercase 0.5px ·
buttons 15–16/500.

**Container + rhythm**: 1,312 max (64px gutters) · reading column 640 · demo canvas 1,088 · prose
column 960 (nonprofit FAQ) · section padding ≈128 top + 128 bottom, plus the 128 spacer · big
radii (24 canvas/band, 12 cards, 8 buttons) · 1px hairlines everywhere, **no outer borders on
grids** (dividers only) · no shadows except the floating marginalia cards (soft 24px blur).

**Palette roles**: page cream; alternating section white; card white; text ink; muted (body);
ink-2 (h3); hairline warm grey; accent copper (demo send buttons only); tinted canvases (mint,
lavender, sand). No lime, no blue.

**Mobile (390w)**: everything single-column. Hero: illustration first, then eyebrow, h1 ≈40px,
subhead, full-width stacked buttons. Proof strip → one-card-at-a-time carousel. Marginalia rows →
icon + h3 on one line, body under it; side cards fall inline between sections. Tab bar scrolls
horizontally; canvas becomes full-bleed with 16px gutters and ≈420px tall. FAQ full width. CTA band
stacks h2 over buttons. Footer columns collapse to accordions. Nothing is hidden except the
"Explore here" dropdown label (icon only).

**Nav / footer**: the 50px breadcrumb bar is the only deviation from shared chrome.

## 3. Kolumn version

Container: `max-w-6xl px-6 sm:px-10` (1,152 content at ≥1,232 viewport) — the landing's container,
narrower than the source's 1,312. Reading column `max-w-[40rem]` (640) keeps the source's ratio.
Section padding `py-20` (80) instead of 128 + 128: Kolumn pages are shorter on purpose; target
≈5,000px total at 1440w vs the source's ≈9,500. Page font scope `landing-font` (Inter). Headings
`font-heading` (Clash Grotesk). Radii: 8 buttons, 12 cards/canvas/band (never 24). 1px
`--border-subtle` dividers; `--border-default` on cards. No decorative section-opener icons and no
empty anchor h2s — each section gets a real h2.

### 0. Breadcrumb bar — **keep**
- Copy: `Solutions / <Vertical>` left; right: `All solutions` (link to `/solutions`) and a `Menu`
  trigger `Other teams ▾` listing the other 7 verticals.
- Renders: new `SolutionBreadcrumb` (in `src/components/marketing/`), `Menu` + `Menu.Item` for the
  dropdown. 44px tall, `font-mono text-xs text-[var(--text-muted)]`, `border-b border-[var(--border-subtle)]`,
  sticky under the nav. The current vertical in `--text-primary`.

### 1. Hero — **keep (two-column variant; never the display variant)**
- Eyebrow: `Kolumn for <vertical>` — `font-mono text-xs uppercase tracking-[0.08em] text-[var(--text-muted)]`.
- h1: from content file. `font-heading font-normal text-5xl sm:text-6xl tracking-tight leading-[1.08] max-w-[42rem]`
  (same as the landing h1). Two lines max.
- Subhead: from content file, ≤ 200 chars. `text-xl leading-8 text-[var(--text-secondary)] max-w-[44rem]`.
- CTAs: `Button variant="primary" size="lg"` **Start free** → `/onboarding?board=<slug>`;
  `Button variant="secondary" size="lg"` **See the example board** → `#board`. Both ink/cream; no lime.
- Right column: **not a doodle** — the vertical's example board, cropped to its first two columns
  (≈2 cards each), rendered with the static board renderer the landing demos use (`/sandbox/landing-board`,
  `PlanCard`/landing card markup). Tilted 0°, no shadow, 12px radius, `--surface-raised` frame.
  Width 480, hero height target ≈620 (source 790).
- Tokens: `--surface-page` bg, `--text-primary`, `--text-secondary`.

### 2. Proof strip — **conditional; ships hidden**
- Layout when populated: 3 columns, `divide-x divide-[var(--border-subtle)]`, each `p-8`, logo slot
  40px tall (`Avatar` initials if no logo), quote `text-[17px] leading-7`, attribution
  `font-mono text-xs text-[var(--text-muted)]` at the bottom. No carousel (never more than 3).
- Renders only when `solution.testimonials.length > 0`. Today every vertical has `[]` (open question 1).
  Nothing is faked in the meantime — the section is simply absent.

### 3. Section opener — **drop.** No 64px doodles, no 128px spacers.

### 4. Pain points ("Where it breaks today") — **adapt** the marginalia list
- h2: `Where it breaks today` — `font-heading font-[425] text-3xl tracking-tight` centred above the column.
- **3 rows** (source has 4) in the 640 reading column; each row `grid grid-cols-[1fr_1fr] gap-8 pt-6 border-t border-[var(--border-subtle)]`:
  left = Phosphor icon 20px (`text-[var(--text-muted)]`) + 8px + h3 `font-heading font-[425] text-xl leading-snug`;
  right = body `text-[17px] leading-7 text-[var(--text-secondary)]`. Row pitch ≈150 (source 197).
- Content from `solution.pains[3]` (`{ icon, title, body }`). Marginalia gutter cards: **drop**.
- Mobile: rows stack (icon + h3, then body).

### 5. How Kolumn helps — **adapt** the tabbed demo
- h2: `How Kolumn helps` + one-line sub (from `solution.helpIntro`).
- Tab bar: `SegmentedControl` with 3 options (`solution.helps[i].tab`, 16px Phosphor icon +
  label). Centred, 40px tall, matches the source's pill bar but in Kolumn's control (radius 8 thumb).
- Canvas: `max-w-6xl` wide, `min-h-[520px]`, radius 12, `bg-[var(--surface-raised)] border border-[var(--border-default)]`
  — **no tinted mint/lavender fill**. Inside, left: the real pill (`QuickAddBar` chrome, static) with
  `solution.helps[i].prompt` typed out; right: the board state after the prompt (static cards from
  `solution.helps[i].result`, 2–4 cards with the fields the prompt set). For a `chat` help block the
  left side is a chat bubble pair instead (landing `CHAT_MESSAGES` markup) and the right side is the
  summary text.
- Caption row under the canvas, `grid md:grid-cols-2 gap-8 max-w-[54rem] mx-auto`: h3
  `font-heading font-[425] text-2xl` + body `text-[17px] leading-7 text-[var(--text-secondary)]`
  (`solution.helps[i].title/body`).
- Free/Pro honesty: every help block that uses move/update/complete is annotated in the caption with a
  `font-mono text-xs text-[var(--text-muted)]` line: `Pro — free plan creates cards only`. Chat blocks:
  `Chat answers questions on every plan; read tools on Pro`. Pull these strings from the shared
  tier constants (section 4), never hardcode.
- Mobile: `SegmentedControl` full width; canvas stacks pill over board.

### 6. Example board — **new section** (no source analog; replaces §7/§8 product cards + pricing)
- Anchor `#board`. h2: `<solution.board.name>` with sub `An example board. Start with it, then make it yours.`
- Renders the full board read-only: 4 columns, 4 cards total (`solution.board.columns[].cards[]`),
  using the landing static renderer. Column headers `font-sans text-sm font-semibold` (existing
  landing header style). Card surfaces keep the product's 16px radius (coherency exception).
  Cards show icon, title, and whichever of `labels / priority / due / checklist / assignee` the content
  sets. Horizontal scroll inside `overflow-x-auto` on narrow screens; never shrink cards.
- Under the board: `Button variant="primary"` **Start with this board** → `/onboarding?board=<slug>`
  and `Button variant="ghost"` **Browse all templates** → `/solutions#boards` (open question 3).

### 7. Feature rows / product cards / connectors / pricing pair — **drop.**
Kolumn has one product and no integrations to grid. Pricing gets one line in the FAQ and a link.

### 8. FAQ — **keep**
- h2 `Questions` (landing style). 4 items: 3 from the shared pool + 1 vertical-specific
  (`solution.faq` overrides/extends `SHARED_FAQ`). Rendered with the landing `FaqItem` (h3 16px,
  hairline rows) — not the source's 20px serif rows. Emit `FAQPage` JSON-LD from the same array.
- Shared pool (final copy):
  - **Is it free?** — Yes. The free plan has boards, columns, cards, sharing and 20 AI messages a
    day; the pill creates cards for you. Pro is $8/month and adds the rest of the AI: moving,
    updating and completing cards from the pill, and read tools in chat.
  - **Who can see a board?** — Members, and only members. Every table sits behind row-level
    security in Postgres. Personal boards are private until you share them; workspace boards are
    visible to that workspace's members.
  - **Does the AI train on our cards?** — No. We don't train on your content. You can export your
    data and delete your account from Settings.
  - **Do we have to set anything up?** — No. There are no custom fields, workflows or required
    rituals. A board with three columns is a complete Kolumn setup; the AI handles the busywork.
  - **Can we bring work in from elsewhere?** — Paste it. Notes, a chat thread, a meeting transcript
    or an email pasted into the pill become cards. There is no importer and no live integrations
    today.

### 9. CTA band — **keep**
- Card `max-w-6xl`, `rounded-xl border border-[var(--border-default)] bg-[var(--surface-card)] p-10 md:p-12`,
  `flex justify-between items-center`, stacks on mobile.
- h2: `<solution.cta.heading>` (per vertical, see solutions.md) `font-heading font-[425] text-2xl`.
- Right: `Button variant="secondary" size="lg"` **See pricing** → `/pricing`;
  `Button variant="primary" size="lg"` **Start free** → `/onboarding?board=<slug>`.

### 10. "Also for" — **new, small**: one row of the other 7 verticals as ghost links
(`font-mono text-xs`), above the shared footer. Keeps the tree crawlable.

**Proportions kept from the source**: 640 reading column · 2-col benefit row grid with 32 gap and
32 top padding + hairline · 3-tab demo with caption `1fr 1fr` row · 44px large buttons · hero
text/illustration split ≈ 55/45 · FAQ hairline rows · full-width CTA band.
**Changed to Kolumn tokens**: 1,312 → 1,152 container · 24px radii → 12 · serif → Clash Grotesk 425
· 20/32 body → 17/27 · 128+128 section padding → 80 · doodle icons → none · tinted canvases →
`--surface-raised` + border · copper send button → ink `Button` · sand secondary → `Button secondary`
(cream + sand border, already the primitive).

## 4. Data and content sources
- `src/content/solutions/<slug>.js` — one module per vertical exporting `solution`:
  ```js
  export default {
    slug: 'startups', name: 'Startups', icon: 'Rocket',            // Phosphor name
    seo: { title, description },
    hero: { eyebrow, h1, subhead },
    testimonials: [],                                                // { quote, name, role, org, logo? }
    pains: [{ icon, title, body }, ×3],
    helpIntro,
    helps: [{ tab, icon, kind: 'pill' | 'chat', prompt, title, body, result: [card…] }, ×3],
    board: { name, columns: [{ title, cards: [{ icon, title, priority?, labels?, due?, checklist?, assignee? }] }] },
    faq: [{ q, a }],                                                 // vertical-specific extras
    cta: { heading },
  }
  ```
- `src/content/solutions/index.js` — ordered registry + the two hub groups; drives `/solutions`,
  the breadcrumb menu, "Also for", the prerender route list and the sitemap.
- `src/content/solutions/_shared.js` — `SHARED_FAQ`, tier strings.
- **Must stay in sync with app code**: `20 messages/day`, `$8/month`, and the free-vs-Pro tool split
  (create-only on free) — import from one constants module rather than retyping (whichever module the
  pricing spec designates; until then `src/content/pricing.js`). Card field names in `board`/`result`
  use the DB shape (`due_date`, `assignee_name`) so the static renderer and a future
  `?board=<slug>` seed share one schema. The seed itself would extend `seedOnboardingBoard.js`
  (`ONBOARDING_BOARD` already has the `columns[].cards[]` shape).
- Prerendered at build to `/solutions/<slug>/index.html`, canonical to the same, listed in the sitemap.
  No Supabase reads.

## 5. Open questions
1. **Testimonials** — none exist; the proof strip stays hidden until there are three real quotes per
   vertical (or one shared trio). Who collects them, and do we accept quotes without a logo?
2. **Healthcare / legal claims** — the copy avoids PHI and privilege language and says "keep clinical
   records in your clinical system", but is there a BAA / SOC 2 answer to give? If not, the
   healthcare FAQ says "not for patient records" outright.
3. **`?board=<slug>` seeding** — does onboarding accept a template parameter and seed the example
   board alongside (or instead of) the tour board? If not, the CTA drops to plain `/onboarding`.
4. **Hero illustration** — the mini-board crop stands in for the source's doodles. If a Klay pose per
   vertical is wanted, it goes in the CTA band, not the hero.
5. **OG images** — one shared image with the vertical name overlaid at build, or eight static files?
