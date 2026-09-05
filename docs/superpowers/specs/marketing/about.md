# About — marketing page spec

> Source crawled: https://www.anthropic.com/company on 2026-09-02. Screenshots + metrics in the crawl harness `out/company.{json,txt,png,-mobile.png}`.
> Kolumn route: `/about` · Priority: P2 · Template family: article

## 1. Purpose and SEO target
- **Job of this page**: tell a visitor in under a minute what Kolumn is, who makes it, and what it refuses to become — so they trust the product enough to sign up or to read `/security`.
- **Primary keyword / query intent**: "Kolumn app" (brand / navigational). Secondary: "what is Kolumn", "AI kanban board", "kanban with AI assistant", "Trello alternative with AI".
- **`<title>`**: `About Kolumn — a kanban that stayed a kanban` (46 chars)
- **meta description**: `Kolumn is a small, independent kanban app with an AI that does the busywork on your boards. Here's what it is, why it's shaped this way, and what we hold to.` (155 chars)
- **OG title**: `About Kolumn` · **OG description**: same as meta description.
- **Structured data**: `Organization` (name, url, logo, sameAs → open question). Source page emits none; `Organization` clearly applies since this is the canonical "who are you" URL. `BreadcrumbList` (Home › About).
- **Internal links in**: footer "Company" column, `/careers` hero, `/security` intro ("who runs this"), landing FAQ "Who makes Kolumn?" (new). **Out**: `/onboarding` (CTA), `/security`, `/careers`, `/privacy`, `/` (lockup).

## 2. Source page anatomy (what Anthropic does)

Page height 5306px at 1440w. Sticky nav 68px. Every content section sits inside one 1272px container (84px side margins), separated by 1px hairlines, on a warm off-white ground. The layout is a consistent **two-column split**: left column ≈ 493–620px carries the section h2 (+ lede), right column starts at x=736 and holds the content — either prose or a **2×2 grid of 294px cells with a 32px gutter**.

1. **Hero** — h ≈ 258px · container 1272 · pad 96 top / 48 bottom · page bg · 2 cols (h1 left 620w, intro right 620w) · h1 52/52/700 sans · body 20/31 serif · 1 CTA: ink pill button "Join us" 40h, 16px padX, 8px radius. *Why*: state the company in one sentence and route to jobs.
2. **Our Purpose** — h ≈ 569px · pad 48/48 · left: h2 32/38/600 + lede-as-h2 25/30/600 (493w) · right: 2×2 grid, cells 294w, 32 gap, each h3 25/30/600 + p 16/21 serif. *Why*: four short pillars unpack the one-liner.
3. **The Team** — h ≈ 1004px · left h2 + p 16/21 sans (493w) · right: 2×2 grid of photo tiles (294×~190, ~8px radius) each followed by h3 25/30 + p 16/21. *Why*: humanize the org by function (Research / Policy / Product / Operations) rather than by names.
4. **What we value and how we act** — h ≈ 1473px · left h2 + p · right: 2-col numbered list, 7 items, index in 12px caption ("01"–"07"), h3 25/30/600, p 16/21 serif. *Why*: culture page as a numbered manifesto.
5. **Governance** — h ≈ 424px · left h2 · right: 3 paragraphs 16/21, inline bold labels ("Board of Directors", "LTBT Trustees"). *Why*: legal structure + named board.
6. **Closing CTA band** — h ≈ 472px · full-bleed ink bg · centered h2 ≈ 52/1.1 in page-bg color · 1 CTA: outline button 36h "Join us →" (page-bg text/border on ink). *Why*: last conversion nudge, mirrors the hero CTA.

Shared numbers:
- **Type scale**: h1 52/52/700 sans · h2 32/38/600 sans · lede 25/30/600 sans · h3 25/30/600 sans · body 16/21 serif (hero intro 20/31 serif) · caption 12/400.
- **Container + rhythm**: 1272px max, 84px side gutters; section padding 48/48 (hero 96 top); 1px hairline dividers between sections; photo tile radius ≈ 8px; no card borders, no shadows anywhere.
- **Palette roles**: bg = warm off-white; text = near-ink; muted = warm grey (footer links); accent = none (ink button only); band = ink with page-bg text.
- **Mobile (390w)**: two columns stack to one (h2 above content); 2×2 grids become single column; photo tiles go full-width; numbered values stay a single numbered column; hero h1 drops to ≈ 36px; CTA band h2 ≈ 32px; hairlines kept.
- **Nav / footer**: shared chrome, no deviation.

## 3. Kolumn version

Page target ≈ 3,200px at 1440w (source is 5,306 — Kolumn has fewer things to say and shouldn't pad). Container `max-w-6xl px-6 sm:px-10` (landing standard, 1152 max) instead of 1272. Section padding `py-16` (64px) with a 1px `border-t border-[var(--border-subtle)]` between sections; hero `pt-24 pb-16`. Two-column split preserved: `grid md:grid-cols-[5fr_7fr] gap-10`.

### 1. Hero — keep (adapt)
- **h1**: `A kanban that stayed a kanban.`
- **Subhead** (right column, `text-lg leading-relaxed text-[var(--text-secondary)]`): `Kolumn is a small, independent project management app. Boards, columns, cards — and an AI that does the busywork on them without changing what a board is.`
- **CTA**: `Button variant="primary" size="lg"` → `Try Kolumn` → `/onboarding`. One CTA only.
- Renders with landing chrome (`KolumnLockup` nav + landing footer). h1 uses landing hero classes: `font-heading text-5xl md:text-6xl tracking-tight leading-[1.08]`, weight 425.
- Tokens: `--surface-page`, `--text-primary`, `--text-secondary`.

### 2. Our Purpose → **What Kolumn is** — keep (adapt)
- **h2** (left, `font-heading font-[425] text-3xl`): `What it is`
- **Lede** (left, under h2, `text-xl text-[var(--text-secondary)]`): `Most project tools grow until they need a setup guide. Kolumn is built to stay small enough to use on day one.`
- **Right: 2×2 grid** (`grid sm:grid-cols-2 gap-x-8 gap-y-10`), each cell h3 `text-lg font-semibold` + p `text-sm leading-relaxed text-[var(--text-secondary)]`:
  1. **The board** — `Columns and cards you drag by hand. Priority, due date, labels, checklist, assignees, an icon. Nothing you have to configure before you can start.`
  2. **The pill** — `A single line on every board. Type what you mean — "move the login bugs to done, assign the rest to Mia" — and the AI does it on that board. Paste a list and it becomes cards without an AI call.`
  3. **Chat** — `Ask questions across your boards and get summaries back. Chat reads; it doesn't write. Changing a board is the pill's job, on purpose.`
  4. **Workspaces** — `Invite people, share a board or a whole workspace, and watch edits land in realtime. Personal boards stay personal until you say otherwise.`
- No component beyond a plain grid; no icons (source uses none, and the landing feature grid already carries icons — this page reads as prose).

### 3. The Team → **Who makes it** — adapt (slim)
- **h2** (left): `Who makes it`
- **Right column, prose only** (`text-base leading-relaxed`, max 60ch): `Kolumn is built by a very small team, without a growth department. The people who answer support email are the people who ship the fix. That's not a virtue on its own — it's why the product can stay narrow: nobody is under pressure to add a feature so there's something to announce.`
- **No photo grid, no bios, no names.** Content module exposes `TEAM = []`; when it's non-empty the right column renders a 2×2 grid of `Avatar size="lg"` + name (`text-sm font-medium`) + role (`text-xs font-mono text-[var(--text-muted)]`), photos optional. Ships empty. See open questions.

### 4. Values → **What we hold to** — keep (4 items, not 7)
- **h2** (left): `What we hold to`
- **Left p**: `Four rules that decide most product arguments before they start.`
- **Right: numbered list**, 2 columns on `md`, 1 on mobile. Index in `font-mono text-xs text-[var(--text-muted)]` ("01"–"04"), h3 `text-lg font-semibold`, p `text-sm leading-relaxed text-[var(--text-secondary)]`.
  - **01 Stay a kanban.** `No custom-field schemas, no sprint rituals, no view that needs a tutorial. If a feature only works after setup, it doesn't ship.`
  - **02 Scope the AI.** `The AI acts on one board at a time, through the same operations you'd do by hand, and only when you ask. Destructive actions get a confirmation and an undo. Chat can't change anything.`
  - **03 Your data is yours.** `Every table is protected by row-level security. Only board members see a board. You can export everything as JSON or delete the account, from Settings, without asking us. We don't train on your content.`
  - **04 Say what it does.** `Marketing copy is held to the code. If something isn't shipped, it isn't on the site. The security page is written the same way.`
- Item 03 mirrors `/security`; keep the two in sync (see §4).

### 5. Governance → **Details** — adapt (fact list)
- **h2** (left): `Details`
- **Right: definition list** in `font-mono text-sm`, label in `--text-muted`, value in `--text-primary`, rows separated by `border-b border-[var(--border-subtle)]`:
  - `Product` → `Kolumn — kanban with an AI layer`
  - `Plans` → `Free · Pro $8/month` (Team: not listed until priced — open question)
  - `Runs on` → `React, Supabase (Postgres), Anthropic models`
  - `Founded` / `Based in` → open question; rows omitted until filled.
- Board/trustee rows from the source are dropped — nothing to put there.

### 6. Closing CTA band — keep (adapt palette)
- Full-bleed band using `bg-[var(--surface-sidebar)] border-y border-[var(--border-subtle)]`, **not** an ink fill (an ink band forces a light-on-dark button the design system doesn't have; the existing landing CTA stays on light surfaces).
- **h2** centered, `font-heading font-[425] text-3xl md:text-4xl`: `Try it on a real board.`
- **p** `text-[var(--text-secondary)]`: `Free plan, no card. Twenty AI messages a day.`
- **CTA**: `Button variant="primary" size="lg"` → `Start free` → `/onboarding`. Secondary text link `Read how it's secured →` → `/security`.
- Vertical padding 96px (`py-24`).

Proportions kept from the source: two-column split (≈5/7), 2×2 grids with 32px gutter, numbered values with mono index, hairline section dividers, 48–64px section rhythm, single ink CTA per section.
Changed for Kolumn: container 1152 (`max-w-6xl`) not 1272; Clash Grotesk 425 for h1/h2 instead of 700/600 sans; Inter body 16/1.6 instead of serif; 4 values not 7; no ink band; no photography.

## 4. Data and content sources
- `src/content/about.js` exports `HERO`, `WHAT_IT_IS` (4 cells), `TEAM` (array, ships `[]`), `VALUES` (4, each `{ index, title, body }`), `DETAILS` (array of `{ label, value }`), `CTA`.
- `VALUES` is imported by `/careers` (it renders the same four). One source, two pages.
- `DETAILS.plans` must match `UpgradeProPage.jsx` ($8/month) and `tier.ts` (`FREE_DAILY_LIMIT = 20`, quoted in the CTA band). Add a comment pointing at both.
- Page component: `src/pages/AboutPage.jsx`, statically prerendered; uses the landing nav/footer, not `LegalPage` (that shell is 672px single-column and too narrow for the split layout).

## 5. Open questions
- **Team names/bios**: `TEAM` ships empty. Do we ever list people? If yes, names + one-line roles only, no photos required.
- **Founded / based in**: not in code. Leave both rows out until confirmed.
- **Organization JSON-LD `sameAs`**: which social profiles exist for Kolumn, if any?
- **Team tier price**: not defined in code; the Details row lists Free and Pro only.
- **"Independent"**: the copy says "small, independent" — confirm there's no investor/parent to disclose before publishing.
