# Careers — marketing page spec

> Source crawled: https://www.anthropic.com/careers on 2026-09-02. Screenshots + metrics in the crawl harness `out/careers.{json,txt,png,-mobile.png}`. (`/careers/jobs` is the roles list; not crawled — the roles-card anatomy below is specified from scratch for Kolumn.)
> Kolumn route: `/careers` · Priority: P2 · Template family: article

## 1. Purpose and SEO target
- **Job of this page**: answer "can I work on Kolumn?" honestly (today: no open roles), leave a door open for people who want to say hi, and be ready to list roles without a redesign.
- **Primary keyword / query intent**: "Kolumn careers" / "Kolumn jobs" (navigational). Secondary: "work at Kolumn", "Kolumn hiring". Low search volume by design; this page exists for completeness of the company family and for footer parity, not for acquisition.
- **`<title>`**: `Careers at Kolumn` (17 chars)
- **meta description**: `Kolumn is built by a very small team. There are no open roles right now, but if you'd like to talk about working on it, say hi.` (128 chars)
- **OG title**: `Careers at Kolumn` · **OG description**: same as meta.
- **Structured data**: `FAQPage` for the FAQ section (the source emits exactly this). `JobPosting` per role **only when `ROLES` is non-empty** — never emit an empty or placeholder posting. `BreadcrumbList` (Home › Careers).
- **Internal links in**: footer "Company" column, `/about` (Details / Who makes it). **Out**: `/about`, `/onboarding`, `/security`, contact address (open question), `/` (lockup).

## 2. Source page anatomy (what Anthropic does)

Page height 4949px at 1440w. Same chrome and 1272px container as `/company`; same two-column split (left ≈ 620w for h2 + p, right column from x≈736). Two sections break the split with a full-width **raised tile** (page-bg-adjacent warm grey, ≈16px radius, 32px inner padding). Accordions are the dominant content pattern: 14 disclosure rows across three sections.

1. **Hero** — h ≈ 351px · pad 96/48 · h1 52/52/700 sans left (620w) · right: p 20/31 serif (620w) + ink button "Explore open roles" 40h / 16px padX / 8px radius. *Why*: one sentence on the mission, one button to the job list.
2. **Building Anthropic (video)** — h ≈ 634px · pad 0/48 · left: 16:9 video tile ≈ 980×537, 16px radius, centered play control · right: h3 19/23/600 + p 15/21 serif (318w). *Why*: founders on camera as a trust signal.
3. **Principles carousel** — h ≈ 642px · raised tile, padX 32, ≈16px radius · left h2 32/38/600 (381w) · center: 400×400 illustration tile (tinted, 16px radius) · right: h3 19/23 + p 15/21 (365w) · footer: counter "01 / 07" in 12px caption + prev/next 36×36 outline buttons (1px border, 8px radius). 7 slides. *Why*: same seven values as `/company`, made browsable.
4. **How we support you (benefits)** — h ≈ 271px · left h2 + p 16/21 serif · right: 3 accordion rows (Health and wellness / Compensation and support / Additional benefits), each ≈ 52px closed, 1px divider, "+" glyph right-aligned; open state reveals a bullet list. *Why*: benefits without a wall of text.
5. **How we hire** — h ≈ 401px · same split · 5 accordion rows (What we are looking for / The interview process / Your safety matters to us / Privacy policies / Applicant and interview accommodations). *Why*: process transparency + scam warning + accommodations.
6. **AI-in-applications policy** — h ≈ 607px · raised tile, padX 32 · left: h2 32/38 (381w) + p 15/21 + "Read more" 28h outline chip (6px radius) · right: 2:1 illustration tile. *Why*: distinctive policy, promoted.
7. **FAQ** — h ≈ 466px · left h2 · right: 6 accordion rows, `FAQPage` JSON-LD. *Why*: pre-empt recruiter mail.
8. **Closing CTA band** — h ≈ 472px · ink bg · centered h2 ≈ 52 in page-bg color · outline button "Explore open roles →" 36h.

Shared numbers:
- **Type scale**: h1 52/52/700 · h2 32/38/600 · h3 19/23/600 (smaller than `/company`'s 25) · body 16/21 serif; tile body 15/21 · caption 12.
- **Container + rhythm**: 1272 max, 84px gutters; section padding 48 bottom, 0–48 top (the accordion sections sit tight, 0 top); tiles ≈16px radius, no border, no shadow; accordion rows 1px divider, ≈52px closed height; video tile 16px radius.
- **Palette roles**: bg warm off-white; raised tile = slightly darker warm neutral; illustration tints (teal, lavender); text ink; muted warm grey; no accent colour on buttons (ink or outline only).
- **Mobile (390w)**: everything stacks; hero h1 ≈ 36px with the intro under it; video tile full-width; the principles tile stacks h2 → illustration (full-width square) → text → counter/arrows; accordions become full-width single column; FAQ stays accordion; CTA band h2 ≈ 32px.
- **Nav / footer**: shared chrome, no deviation.

## 3. Kolumn version

Page target ≈ 2,600px at 1440w. Container `max-w-6xl px-6 sm:px-10`. Section rhythm `py-16` with `border-t border-[var(--border-subtle)]` between sections; hero `pt-24 pb-16`. Two-column split `grid md:grid-cols-[5fr_7fr] gap-10` where the source splits.

### 1. Hero — keep (adapt)
- **h1** (`font-heading text-5xl md:text-6xl tracking-tight leading-[1.08]`, weight 425): `Work on Kolumn`
- **Subhead** (right column, `text-lg leading-relaxed text-[var(--text-secondary)]`): `Kolumn is built by a very small team. There are no open roles right now. If you'd like to talk about working on it anyway — design, engineering, or something we haven't thought of — say hi.`
- **CTA**: `Button variant="primary" size="lg"` → `Say hi` → `CAREERS_CONTACT` (mailto; address is an open question). The button label is data-driven so it can flip to `See open roles` (anchor `#roles`) when `ROLES.length > 0`.

### 2. Video → **How Kolumn gets built** — adapt (no video)
- Drop the video tile. Replace with a **3-column grid** (`grid sm:grid-cols-3 gap-8`) of short practice statements, h3 `text-base font-semibold` + p `text-sm leading-relaxed text-[var(--text-secondary)]`, no icons:
  1. **Small surface, on purpose.** `Boards, a pill, a chat. Every new thing has to earn its place against those three, and most don't.`
  2. **Ship to real boards.** `Changes go to the product people actually use, quickly, with an undo. The verify step is opening the app and using it.`
  3. **Copy is held to the code.** `If the site says it, the code does it. That's true of the security page and it's true of this one.`
- **h2** above the grid, left-aligned: `How Kolumn gets built`

### 3. Principles carousel → **What we hold to** — adapt (static grid, shared content)
- Same four values as `/about`, imported from `src/content/about.js` (`VALUES`). Rendered as a raised tile: `rounded-xl border border-[var(--border-default)] bg-[var(--surface-raised)] p-8 md:p-10`, inside it `grid sm:grid-cols-2 gap-x-10 gap-y-8`, each item mono index `font-mono text-xs text-[var(--text-muted)]` + h3 `text-lg font-semibold` + p `text-sm text-[var(--text-secondary)]`.
- No carousel, no illustration, no counter. Four items fit on one screen; a carousel would hide three of them for no reason.
- **h2** inside the tile, spanning full width above the grid: `What we hold to`

### 4. Benefits — **drop**
- Nothing to claim. Do not scaffold an empty section. See open questions.

### 5. How we hire → **Open roles** — adapt (the roles list, ships empty)
- **h2** (left): `Open roles` · **left p**: `Everything listed here is real and current. When there's nothing, we say so.`
- **Right column, empty state** (ships): a bordered card `rounded-xl border border-[var(--border-default)] bg-[var(--surface-card)] p-6`, containing:
  - mono caption `font-mono text-xs text-[var(--text-muted)]`: `0 open roles`
  - h3 `text-base font-semibold`: `No open roles right now`
  - p `text-sm text-[var(--text-secondary)]`: `We're not hiring at the moment. If you'd like to be the first to hear when that changes, or you just want to talk shop, send a note.`
  - `Button variant="secondary" size="sm"` → `Say hi` → `CAREERS_CONTACT`.
  - Not an `InlineNotice` — this is a designed empty state, not an error grammar tier.
- **Role card anatomy (for later; renders when `ROLES.length > 0`)** — one card per role, stacked with `divide-y divide-[var(--border-subtle)]` inside the same bordered container, each row a single `<a>`:
  - Row padding `py-4 px-5`, min height 72px, `hover:bg-[var(--surface-hover)]`, whole row clickable.
  - Left: h3 title `text-base font-semibold text-[var(--text-primary)]`; beneath it a meta line `font-mono text-xs text-[var(--text-muted)]` — `{team} · {location} · {type}` (e.g. `Engineering · Remote (EU/UK hours) · Full-time`).
  - Optional one-line summary `text-sm text-[var(--text-secondary)]`, clamped to 1 line.
  - Right: Phosphor `ArrowRight` 16px in `--text-muted`, shifts 2px on hover (transform only, `--dur-fast`).
  - Group by `team` with a `Menu.Label`-style uppercase mono header when there are ≥ 2 teams; add filter chips (`SegmentedControl` by team) only past 6 roles.
  - Destination: `href` per role (ATS URL or `/careers/<slug>`); external opens in a new tab with `rel="noopener"`.
  - `JobPosting` JSON-LD per role with `title`, `datePosted`, `employmentType`, `jobLocationType`, `hiringOrganization` — only emitted for roles present.

### 6. AI-in-applications policy tile — **drop**
- Kolumn has no application process to write a policy for. Do not invent one. (If roles ever open, a single FAQ row "Can I use AI when applying?" is the right size for this.)

### 7. FAQ — keep (3 rows)
- **h2** (left): `Questions`
- Right: landing `FaqItem` (same component as `LandingPage.jsx` line ~1236), three rows:
  1. `Do you offer internships?` → `Not right now. The team is too small to give an intern a good experience, and a bad internship is worse than none.`
  2. `Can I send a speculative application?` → `Yes. A short note about what you'd want to work on and a link to something you've made is enough. We read all of them and reply to all of them, though not always fast.`
  3. `Is the work remote?` → open question; ship only if answered. Placeholder answer in the content file is `null`, and `FaqItem` rows with a `null` answer are filtered out at render.
- `FAQPage` JSON-LD generated from the same array, filtered the same way.

### 8. Closing CTA band — keep (adapt palette)
- Same band treatment as `/about` (`bg-[var(--surface-sidebar)] border-y border-[var(--border-subtle)]`, `py-24`), not ink.
- **h2**: `Meanwhile, try the thing.`
- **p**: `The best way to know if you'd want to work on Kolumn is to use it for a week.`
- **CTA**: `Button variant="primary" size="lg"` → `Start free` → `/onboarding`. Secondary text link `About Kolumn →` → `/about`.

Proportions kept from the source: the 5/7 split for h2-vs-content sections, ≈52px disclosure rows for FAQ, raised tile with 32px+ inner padding for the values block, one ink CTA per section, hairline section dividers.
Changed for Kolumn: 1152 container; Clash Grotesk 425 headings; Inter body; tiles get a 1px `--border-default` and 12px radius instead of borderless 16px; no carousel, no video, no illustration tiles; no benefits, no AI-policy section; roles list is a real component with a designed empty state rather than a link out to `/careers/jobs`.

## 4. Data and content sources
- `src/content/careers.js` exports `HERO`, `HOW_WE_BUILD` (3), `ROLES` (array of `{ slug, title, team, location, type, summary, href, datePosted }`, ships `[]`), `FAQ` (array of `{ q, a }`, `a` may be `null` → filtered), `CAREERS_CONTACT` (string; open question), `CTA`.
- Values come from `src/content/about.js` → `VALUES`. Do not duplicate.
- Hero CTA label/target derive from `ROLES.length` at render.
- Page component: `src/pages/CareersPage.jsx`, statically prerendered with the landing chrome. `FaqItem` should be lifted out of `LandingPage.jsx` into `src/components/marketing/FaqItem.jsx` so `/careers`, `/security` and the landing share one implementation (three consumers now).
- No Supabase. No ATS integration until a role exists; when one does, prefer a static entry in `ROLES` over a live fetch (prerender constraint).

## 5. Open questions
- **Contact address** for `CAREERS_CONTACT`: which mailbox? (Must exist and be read before this page ships.)
- **Remote / location**: FAQ row 3 is unanswered; ships hidden until it is.
- **Benefits**: dropped entirely. If a role opens, decide whether a benefits section is honest to add.
- **`JobPosting` schema**: confirm we want Google Jobs indexing when roles exist (it brings recruiter/aggregator traffic).
- **Speculative applications**: the FAQ promises "we reply to all of them" — only keep that sentence if someone owns the inbox.
