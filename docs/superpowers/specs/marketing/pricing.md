# Pricing — marketing page spec

> Source crawled: https://claude.com/pricing on 2026-09-02. Screenshots + metrics in the crawl harness `out/` dir (`pricing.json`, `pricing.txt`, `pricing.png`, `pricing-mobile.png`, plus `pricing-extra.json`, `pricing-cards.png`, `pricing-table.png`, `pricing-faq.png`, `pricing-team.png`, `pricing-mobile-cards.png`, `pricing-mobile-table.png`).
> Kolumn route: `/pricing` · Priority: P1 · Template family: hub

## 1. Purpose and SEO target

- **Job of this page:** let a visitor pick Free or Pro in under a minute, with every number matching what the app enforces.
- **Primary query intent:** `kolumn pricing` (navigational). Secondary: `ai kanban pricing`, `kanban app free plan`, `trello alternative pricing`, `kolumn pro`.
- **`<title>`** (26 chars): `Pricing — Kolumn`
- **Meta description** (147 chars): `Kolumn is free for boards, cards, and 20 AI messages a day. Pro is $8 a month for unlimited AI on every board. Team is on the way.`
- **OG title:** `Kolumn pricing` · **OG description:** `Free for boards, cards, and 20 AI messages a day. Pro is $8 a month.` · OG image: the shared marketing card (chrome spec) — no page-specific image.
- **Canonical:** `https://<host>/pricing`.
- **Structured data:** the source emits one `Question`/`Answer` block per FAQ item (nine of them). Kolumn emits:
  - `Product` (name `Kolumn`, `brand` → `Organization`) with two `Offer`s: Free (`price: 0`, `priceCurrency: USD`) and Pro (`price: 8`, `priceCurrency: USD`, `priceSpecification` → `UnitPriceSpecification` with `billingDuration: P1M`; a second `UnitPriceSpecification` at `price: 80`, `billingDuration: P1Y`). No Team offer until a price exists.
  - `FAQPage` wrapping the seven questions in section 3.7 as `Question` → `acceptedAnswer` → `Answer`.
  - `BreadcrumbList` (Home → Pricing) — the source shows a breadcrumb bar under the nav; emit it only if the chrome spec adopts breadcrumbs.
- **Internal links in:** landing nav "Pricing", landing pricing section heading ("Compare plans" → "See full pricing"), Settings → Billing "See plans" (external link from the app), footer "Pricing" (chrome spec), `/upgrade/pro` back-link when the user arrives unauthenticated.
- **Internal links out:** `/onboarding` (all Free CTAs), `/onboarding?plan=pro` (Pro CTAs — see open question 3), `/privacy` and `/terms` (FAQ answers + footnote), `/` (lockup), `mailto:` contact for Team (open question 1).

## 2. Source page anatomy (what Anthropic does)

Page is 7,417px tall at 1440w, 12,077px at 390w. Two `<section>`s: an off-white one (`rgb(250,249,245)`, 0–5,177px) holding hero, plan cards, and the comparison table; a white one (5,177–6,388px) holding the FAQ. Then the shared ink footer (1,029px). There is **no CTA band** on this page — the FAQ runs straight into the footer, whose newsletter input does the closing job.

### 2.1 Nav + breadcrumb bar — 84px nav + ~46px bar
Standard chrome (see chrome spec). Beneath it a full-width hairline bar: "Pricing" left, "Explore here ⌄" jump-menu right, 15px body-3 text. Exists so the very long page has an in-page nav.

### 2.2 Hero — height ≈ 150px (y 240–389) · container 1312px (64px side margins) · no bg
`h1` "Pricing", Anthropic Serif 64/70 weight 500, centered, one word. 100px gap to the selector. Exists only to name the page; all persuasion happens in the cards.

### 2.3 Audience selector — y 389, height 40 · centered
Three-segment tab group: `Individual · Team & Enterprise · API`. Segment = 40px tall, padding 8/16, radius 12, 20px text; active segment white fill + ink text, inactive transparent + `rgb(94,93,89)` text; group sits in a pale-sand track (`rgb(240,238,230)`, radius ~16, ~284px wide). Swapping segments swaps the card row and the comparison table below it (API swaps to a model-price grid). Exists because Anthropic sells three unrelated things from one URL.

### 2.4 Plan cards — y 465, height 901 · container 1312 · grid 3 cols / 32px gap
- **Card:** 416px wide (3 × 416 + 2 × 32 = 1312), equal-height 901px, padding 32, radius 24, `1px solid rgb(240,238,230)`, white fill, no shadow.
- **Stack inside a card** (top → bottom, measured on the Free card): 64×64 line illustration (y+33) · 32px gap · `h3` serif 32/35 weight 500 ("Free") · tagline sans 17/27 · 24px gap · price sans 24/38 weight 600 ("$0", "$17", "From $100") · price caption 15/24 at 70% ink ("Free for everyone", "Per month with annual subscription discount ($200 billed up front). $20 if billed monthly.") · ~60px gap · CTA · 24px gap · 1px hairline · 24px gap · feature list.
- **CTA:** full-width 350×40, radius 8.5, ink fill, 17px cream text, one per card ("Try Claude" ×3 — identical labels, differentiated only by `?plan=` query).
- **List:** 17/27 items, 16px outlined check glyph, 6px row gap (33px pitch); Free has 10 items, Pro 9, Max 4. Pro/Max open with a bold 17px "Everything in Free, plus:" / "Everything in Pro, plus:" line.
- **Highlighted plan (Max, rightmost):** same white fill, border tinted `rgba(106,155,204,0.2)` and shadow `0 4px 20px rgba(98,158,218,0.16)` — a faint blue halo, not a fill change; the illustration gets blue dots. Pro (the middle card) is *not* highlighted.
- **Footnote** at y 1415: 15/24 in `rgb(94,93,89)`, centered, "Usage limits apply…" with an underlined link.
- **Team & Enterprise tab (measured):** two cards, 462px wide, 34px gap, centered in a 958px block. Team card swaps the single price for two seat rows ("Standard seat … $20", "Premium seat … $100": 20px label left, 20px price right, 15px caption under each). Enterprise card stacks a second, secondary CTA (pale sand fill, 1px border, ink text, "Chat with buying specialist") under the primary.
- **Plan recommender ("How big is your team?"):** lives in the DOM as `.pricing-calculator_toast`, `display:none` at load in a 1440w headless render. It is a five-step form (team size → seat count → security needs → usage pattern → contract type) that ends in one of three recommendation cards (Team / Enterprise self-serve / Enterprise sales-assisted) with a "Start over" ghost button and an ink CTA. It is a popover, not a section; something (scroll depth or a timer on the Team tab) triggers it.

Exists to make the decision at a glance: name, price, one button, then proof.

### 2.5 Comparison table — y ≈ 1554–5049 (~3,500px) · container 1312 · no bg
- Lead-in: 96×96 line illustration (y 1554) · 32px · `h2` "Compare features across plans", serif 52/62 weight 500, centered, `max-width: 30ch` · ~150px to the table.
- **Sticky header row** (y ≈ 1875, h ≈ 80): search input left (310×52, radius 8, 1px border, magnifier icon, placeholder "Search") that filters rows live; four plan columns right, each = serif 20 plan name over a small ink button (≈88×30, radius 6, 13px "Try Claude"). Column pitch 246px, centered at x 515/761/1007/1253; label column ≈ 400px.
- **Group accordion trigger:** 81px tall, padding 24/16, serif 25/38 heading ("Features and capabilities", "Security and administration", "Payment options", "Models and usage"), "—" collapse glyph right-aligned, hairline above and below.
- **Rows:** 54px pitch, `h4` label sans 15/24 in `rgb(48,48,46)`, optional 14px ⓘ tooltip glyph; hairline `rgb(240,238,230)` between rows. Cells: 16px ink filled-circle check for yes, 12px thin × for no, and small outlined pills (`n/a`, `200K`, `Opt-out`, `Monthly and annual`, `Usage credits`) for values — 12px text, ~24px tall, radius ~6.
- ~50 rows across four groups. Exists to answer "which one has X?" without reading prose; the search box exists because the list is too long to scan.

### 2.6 FAQ — y 5177, height 1211 · white bg · content column 640px centered (x 400)
- 128px spacer above (the `u-section-spacer`). Inside: 96px illustration (y ≈ 5300) · `h2` "FAQ" serif 52/62 (y 5433) · 3-segment tab group (`Plans and usage · Billing and payments · Managing your plan`, same style as 2.3, y 5605) · group `h3` serif 32/35 (y 5729) · hairline · question rows.
- **Question row:** serif 20/32 question, ~88px tall (28px padding top/bottom), 20px "+" glyph right, hairline between rows; answers are 17/27 rich text with links and lists. Five questions per tab; "Prev / Next" pager under the list.
- Exists to answer the billing questions that generate support tickets (annual, refunds, cancel, upgrade).

### 2.7 Footer — 1029px, ink bg
Shared chrome. Notable only because it doubles as the page's CTA: the first column is a newsletter/email field "How can Claude help you today?" plus a copper arrow button.

### Shared numbers
- **Type scale:** h1 64/70/500 serif · h2 52/62/500 serif · h3 (card name, FAQ group) 32/35/500 serif · h3 (table group) 25/38/500 serif · FAQ question 20/32/400 serif · body 20/32 sans (page default) · card list 17/27 sans · table row 15/24 sans · caption/footnote 15/24 sans at 70% ink or `rgb(94,93,89)` · price 24/38/600 sans.
- **Container + rhythm:** 1312px content width at 1440 (64px gutters); FAQ narrows to a 640px reading column. Section gaps are large: 100px hero→selector, 76px selector→cards, ~140px cards→illustration, 128px spacer before FAQ. Card radius 24; button radius 8.5 (large) / 6 (small); tab radius 12; input radius 8; 1px hairlines everywhere, `rgb(240,238,230)`; no shadow except the highlighted card's blue halo.
- **Palette roles:** page bg = warm off-white; surface = pure white cards and FAQ band; text = near-black ink; muted = warm gray (`rgb(94,93,89)`) and 70%-alpha ink for captions; accent = a blue tint reserved for the highlighted plan (the copper brand accent appears only in the footer button and logo). Yes/no are ink and thin-gray glyphs, not green/red.
- **Mobile (390w):** h1 drops to 37.75/41.5. Selector becomes a full-width 3-segment control. Cards stack, 356px wide (17px margins), padding 24, name 23.5px, list 17px, equal-height rule released (Free card 880px). Comparison table keeps four value columns but moves the row label onto its own line above the glyph row (each row ≈ 195px tall); search box and per-column buttons are hidden. FAQ tabs stack into a vertical pill list. Footer collapses to one column.
- **Nav / footer:** the breadcrumb + "Explore here" bar under the nav is specific to this page.

## 3. Kolumn version

Kolumn's `/pricing` keeps the source's skeleton (name → selector → cards → footnote → comparison → FAQ) but has one audience and two live tiers, so the page is roughly a third as tall: ~3,400px at 1440w. Target structure and measurements follow the landing page (`max-w-6xl px-6 sm:px-10`, section `py-20`) so pricing and landing feel like one site.

### 3.1 Nav + breadcrumb bar — **adapt**
Shared marketing chrome (chrome spec). **Drop** the breadcrumb/"Explore here" bar — the page is short enough to scroll. If breadcrumbs are adopted site-wide, render `Home / Pricing` in `--font-mono` 12px `--text-muted`, not a bar.

### 3.2 Hero — **adapt** (height ≈ 190px incl. padding)
- Heading: **Pricing** — `font-heading font-[425] text-5xl sm:text-6xl tracking-tight leading-[1.08]` in `--text-primary` (matches the landing h1 scale; Clash Grotesk 425 replaces the serif).
- Subhead (new — the source has none, Kolumn needs one line of framing): **Free for as long as you like. Pro when the AI should do more than create cards.** — `text-lg text-[var(--text-secondary)] max-w-xl mx-auto`.
- Padding: `pt-16 pb-10`. Container `max-w-6xl`. No CTA here; the cards are 300px away.

### 3.3 Audience selector — **drop**
Kolumn has one audience. Three tiers fit on one row, so no segmentation. A **billing-period toggle** (`SegmentedControl`, options `Monthly · Yearly`) is deferred to open question 2 — the Pro card shows the monthly price with the yearly figure in the caption instead, which the source also does.

### 3.4 Plan cards — **keep** (the page's core; ≈ 640px tall row)
- Container `max-w-[74rem]` (the landing's 1184px pricing grid), `grid grid-cols-1 lg:grid-cols-3 gap-6 justify-items-center`, cards `w-full max-w-sm` (384px). Source pitch was 416 + 32; Kolumn keeps three columns and a 24px gap so the row also fits inside the landing's grid without a second breakpoint. Equal heights via `items-stretch`; the CTA pinned at the bottom with `mt-auto` (as `PlanCard` already does).
- **Card chrome:** radius 12 (`rounded-xl`, not the source's 24 — Kolumn's raised radius), `border border-[var(--border-default)]`, `bg-[var(--surface-card)]`, padding 28 (`p-7`), no shadow. Free stays a **ghost** card (`bg-[var(--surface-page)]`, `border-[var(--color-sand)]`) as the current `PlanCard` does — the transparent card is the "nothing to buy" signal.
- **Highlighted plan = Pro** (middle). Source uses a blue halo on its most expensive plan; Kolumn highlights the plan it wants people on: `border-2 border-[var(--color-ink)]` and `bg-[var(--color-mauve-cream)]` — the treatment `PlanCard` already applies via `primaryCta`. Lime stays out of the card fill; it appears only as the check-mark color (`--color-logo`, existing) and, on Pro, as an `Recommended` state badge: mono 11px uppercase, `bg-[var(--accent-lime-wash)] text-[var(--accent-lime-text)]`, radius 6, top-right of the card. That is a state color use, not a button.
- **Stack inside each card** (Kolumn): Phosphor duotone icon 56px (existing: `Popcorn` / `Champagne` / `Cheers`) · 20px · name `font-logo text-3xl` (Clash Grotesk 300–425, per `PlanCard`) · tagline `text-base text-[var(--text-secondary)]` · 24px · price `font-logo text-4xl` + `/ period` in `--text-muted` · caption `text-sm text-[var(--text-muted)]` (new field, see 4) · 24px · "Everything in X, plus:" `text-base font-semibold` · list `text-base space-y-2.5` with `Check size=16 weight=bold` in `--color-logo` · `mt-auto` · CTA `h-11 rounded-[0.6rem]`.
- **Copy, final:**

  **Free** — *For getting started* — **$0** / forever — caption: *No card, no time limit.*
  - Unlimited boards, columns, and cards
  - Drag-and-drop, labels, priorities, due dates, checklists
  - Realtime sync with everyone on the board
  - The pill creates cards from plain language — 20 AI messages a day
  - Chat: ask questions about your boards
  - Board and card templates
  - CTA: **Start for free** → `/onboarding` (`Button variant="secondary"` styling as today's non-primary card CTA: `--surface-hover` fill, 1px sand border).

  **Pro** — *For daily use* — **$8** / month — caption: *Billed monthly, plus tax. $80 a year if you pay up front.*
  - Everything in Free, plus:
  - No daily AI message limit
  - The pill moves, updates, completes, and reorganizes cards — not just creates them
  - Chat can search cards and summarize boards for you
  - 7-day free trial, cancel in Settings anytime
  - CTA: **Try Pro free for 7 days** → `/onboarding?plan=pro` (`Button variant="primary"`, ink fill — the only ink button in the row).

  **Team** — *For workspaces* — **Coming soon** (set in the price slot at `font-logo text-3xl`, no period) — caption: *Shared workspaces for more than one team. Pricing is not set yet.*
  - Everything in Pro, plus:
  - Workspaces with members and invitations
  - Boards shared per workspace or per board
  - Row-level security on every table, members-only access
  - CTA: **Get notified** → `mailto:` or a one-field form (open question 1). Rendered as `Button variant="secondary"`; never as ink, so Pro stays the single primary.
  - Nothing on this card promises admin roles, SSO, or a price. `PLANS[2]` in `src/data/plans.js` currently shows `$24 / per month` and "Member roles & admin controls" — both must come out before this page ships (see 4 and open question 1).

- **Footnote** under the row (`mt-8 text-center text-sm text-[var(--text-muted)]`): *Prices are in USD and exclude tax. The free message limit resets every day. Plans can change; we will email you before anything you pay for does.*
- Component: existing `PlanCard` in `mode="landing"` with three additions — `caption` field, `priceOnly` rendering when `period` is null (Team), and an optional `badge`. `PlanPicker` is not used here (it is the in-app picker); the marketing grid is the landing's inline grid, extracted into `src/components/marketing/PlanGrid.jsx` so `/pricing` and `/` share it.

### 3.5 Comparison table — **adapt** (one group, 11 rows, ≈ 900px)
- Lead-in: `h2` **Compare plans** `font-heading font-[425] text-3xl tracking-tight text-center` · `p` *Same boards on every plan. The plans differ in what the AI is allowed to do.* · `mb-12`. No illustration (Klay may sit here as a 64px sprite if the illustration slot needs filling — decoration only).
- **Drop** the search box and the group accordion; eleven rows do not need either. **Drop** the per-column buttons in the header (the cards 500px above already have them); keep the header **sticky** (`sticky top-[nav-height]`, `bg-[var(--surface-page)]`, hairline below) so column names stay visible on mobile.
- Layout: `max-w-6xl`, CSS grid `grid-cols-[minmax(0,2fr)_repeat(3,minmax(0,1fr))]`, header cells `font-heading font-[425] text-lg text-center`; rows `min-h-[52px] py-3` (source 54px pitch), label `text-sm text-[var(--text-primary)]`, hairline `border-b border-[var(--border-subtle)]`. Yes = Phosphor `CheckCircle weight="fill"` 18px in `--text-primary` (ink, like the source — not lime, not green); no = `Minus weight="light"` 16px in `--text-faint`; values = mono 12px in `--text-secondary` (no pill box; a `--font-mono` string is Kolumn's "value" register). Optional ⓘ tooltips use the `Tooltip` primitive.
- **Rows (final):**

  | | Free | Pro | Team |
  |---|---|---|---|
  | Boards, columns, cards | Unlimited | Unlimited | Unlimited |
  | AI messages per day | `20` | `No limit` | `No limit` |
  | Pill: create cards from plain language | ✓ | ✓ | ✓ |
  | Pill: move, update, complete, reorganize | — | ✓ | ✓ |
  | Chat: ask questions about your boards | ✓ | ✓ | ✓ |
  | Chat: search cards and summarize boards | — | ✓ | ✓ |
  | Realtime sync across members | ✓ | ✓ | ✓ |
  | Board and card templates | ✓ | ✓ | ✓ |
  | Workspaces with members and invitations | ✓ | ✓ | ✓ |
  | Export your data, delete your account | ✓ | ✓ | ✓ |
  | Row-level security, members-only boards | ✓ | ✓ | ✓ |

  The Team column repeats Pro on purpose: nothing Team-specific is gated in code today, and the page must not imply otherwise. Add a `text-xs text-[var(--text-muted)]` note under the table: *Team is in progress. It will include everything in Pro; what it adds beyond that is not final.*
- Mobile: the header stays sticky; rows keep three glyph columns (they are only glyphs) with the label on its own line above, as the source does — ≈ 88px per row rather than the source's 195, because Kolumn has no per-column buttons.
- Component: new `src/components/marketing/CompareTable.jsx` (presentational, takes `PRICING.comparison`).

### 3.6 Trial / reassurance strip — **new** (≈ 120px)
The source has no CTA band; Kolumn adds a thin one between the table and the FAQ so the page has a second decision point after the proof. `InlineNotice`-style tile, not a full-bleed band: `max-w-3xl mx-auto`, `rounded-xl border border-[var(--border-default)] bg-[var(--surface-raised)] p-6`, flex row.
- Copy: **Not sure? Start on Free.** *Every plan uses the same boards. Move to Pro from Settings when you hit the daily limit; nothing is lost either way.*
- CTA: **Start for free** → `/onboarding`, `Button variant="primary" size="md"`. Ink, not lime.

### 3.7 FAQ — **keep** (≈ 700px)
- `h2` **Frequently asked questions** `font-heading font-[425] text-3xl text-center mb-12`; list `max-w-2xl mx-auto flex flex-col gap-2`; items are the landing `FaqItem` (16px question, `Plus` glyph that rotates 45°, grid-rows 0fr→1fr expand). Source's 640px reading column ≈ `max-w-2xl` (672px). **Drop** the three-tab grouping and pager — seven questions fit on one list. Extract `FaqItem` from `LandingPage.jsx` into `src/components/marketing/FaqItem.jsx` so both pages import it.
- Questions and answers (final; same register as the landing FAQ):

  1. **What do I get on Free?** — Boards, columns, and cards with no cap, realtime sync with your team, templates, and the AI pill on every board. Free gets 20 AI messages a day; the counter resets daily. Chat works too, as plain question-and-answer over your boards.
  2. **What does Pro change?** — Two things. The daily message limit goes away, and the AI is allowed to do more than create: it can move, update, complete, and reorganize cards on the board you are looking at, and chat can search cards and summarize boards instead of only answering from what it can see. Pro is $8 a month, billed monthly, or $80 for a year.
  3. **What counts as an AI message?** — Anything you send to the pill or to chat. Lists you paste into the pill with commas or line breaks are split into cards without touching the AI, so they never count. A single message that triggers several actions still counts once.
  4. **Is there a trial?** — Yes. Pro comes with a 7-day free trial. We tell you the end date when you start, and you can cancel from Settings before it renews.
  5. **Can I switch plans later?** — Any time, from Settings → Billing. Downgrading to Free keeps every board, card, and workspace exactly as it is; the only thing that changes is what the AI is allowed to do next.
  6. **What about the Team plan?** — Team is being built. It will include everything in Pro and is aimed at workspaces shared across more than one team. There is no price yet; if we announce one, people who asked to be notified hear first.
  7. **Is my data private?** — Yes. Every table uses row-level security, so only members of a board can read it. We do not train on your content, and you can export or delete everything from Settings → Privacy.

- Structured data: these seven become the `FAQPage` block in section 1, answers as plain text (strip the arrow characters).

### 3.8 Footer — **keep** (shared chrome)
No newsletter field; the reassurance strip in 3.6 already closed. The chrome footer's "Pricing" link points here.

### Proportions kept from the source
- Three-column card row with equal heights and the CTA on a shared baseline; price above CTA above list; "Everything in X, plus:" preamble.
- Card padding ≈ 28–32px; list rhythm ≈ 33px per item; 40–44px CTA; hairline separator above the list.
- One highlighted card, expressed by border + background, not by fill color.
- Comparison rows at ≈ 52–54px pitch with hairlines and glyph cells; sticky column header.
- FAQ as a narrow centered reading column with hairline-separated accordion rows.
- Generous section gaps (`py-20`, ≈ 80px) between hero, cards, table, FAQ.

### Proportions changed for Kolumn
- Card radius 24 → 12; button radius 8.5 → 8 (`rounded-lg`) / the existing `rounded-[0.6rem]` on PlanCard; tab radius 12 → 8 if a `SegmentedControl` is ever added.
- Serif display type → Clash Grotesk 425 (`--font-heading`) for h1/h2 and `--font-logo` for card names and prices; body 20/32 → Inter 16/1.6; captions → 14px or mono 12px.
- 1312px content width → `max-w-6xl` (1152) for everything except the card row (`max-w-[74rem]`).
- Highlight = ink 2px border + `--color-mauve-cream` fill (already in `PlanCard`) instead of a blue halo; no page-level shadows.
- Ink filled check glyphs are kept; "no" becomes a light minus instead of an ×.
- Nothing lime-filled anywhere; lime is limited to check marks and the `Recommended` badge.

## 4. Data and content sources

- **`src/content/pricing.js`** — new, the single source for this page. Shape:

  ```js
  export const PRICING = {
    meta: { title, description, ogTitle, ogDescription },
    hero: { heading, subhead },
    tiers: [
      { id: 'free', name, tagline, price: '$0', period: 'forever', caption, badge: null,
        inheritsFrom: null, bullets: [...], cta: { label: 'Start for free', to: '/onboarding' } },
      { id: 'pro',  name, tagline, price: '$8', period: 'month', caption, badge: 'Recommended',
        inheritsFrom: 'Free', bullets: [...], cta: { label: 'Try Pro free for 7 days', to: '/onboarding?plan=pro' } },
      { id: 'team', name, tagline, price: 'Coming soon', period: null, caption, badge: null,
        inheritsFrom: 'Pro', bullets: [...], cta: { label: 'Get notified', to: <open q. 1> } },
    ],
    footnote,
    comparison: { columns: ['free','pro','team'], rows: [{ label, cells: [true|false|'20'|'No limit'|'Unlimited'], tooltip? }] },
    reassurance: { heading, body, cta: { label, to } },
    faq: [{ q, a }],
    limits: { freeMessagesPerDay: 20, proMonthlyUsd: 8, proYearlyUsd: 80, trialDays: 7 },
  }
  ```

- **Where the same numbers already live (sync risk — four copies today):**
  1. `src/data/plans.js` — `PLANS` (prices, taglines, bullets, icons). Read by `LandingPage.jsx`, `OnboardingPage.jsx` (plan step), and `PlanPickerPage.jsx` via `PlanPicker`. Contains a Team price (`$24`) and Team bullets the brief does not allow.
  2. `src/pages/UpgradeProPage.jsx` — local `PRICES` (`$8`/month, `$80`/year, "Save 17%") and a hard-coded 7-day trial (`addDays(new Date(), 7)`).
  3. `supabase/functions/chat/tier.ts` — `FREE_DAILY_LIMIT = 20`; Pro returns `remaining: -1` (no limit).
  4. `src/pages/LandingPage.jsx` — `FAQ` constant and the "Compare plans" subhead.

- **Proposed direction:** `PRICING` becomes the source; `src/data/plans.js` is rewritten to derive `PLANS` from `PRICING.tiers` (adding the picker-only fields `topIcon`, `topIconClass`, `ghost`, `primaryCta`) so `PlanPickerPage`, `OnboardingPage`, and `LandingPage` all read the same prices and bullets. `UpgradeProPage` imports `PRICING.limits` for `$8`/`$80`/`trialDays` instead of its local `PRICES`. `tier.ts` runs in Deno and cannot import from `src/`; add a Vitest spec (`src/__tests__/pricing-sync.test.js`) that reads `supabase/functions/chat/tier.ts` as text and asserts `FREE_DAILY_LIMIT = ${PRICING.limits.freeMessagesPerDay}`, so a change on either side fails the build. The picker's Team card should render `Coming soon` and a disabled CTA until a price exists (today it commits `team` straight to `profiles.tier`).
- **Structured data** is generated from `PRICING` at prerender (Product/Offer from `tiers` + `limits`, FAQPage from `faq`) — one JSON-LD `<script>` per type, injected by the marketing page shell, not hand-written.
- **Nothing on this page reads Supabase.** No auth state, no live tier — the page is static and prerendered.

## 5. Open questions

1. **Team plan.** No price in the brief or in `tier.ts`; `src/data/plans.js` has a `$24` placeholder and bullets ("Member roles & admin controls", "Priority onboarding") that describe unshipped features. Confirm the card ships as "Coming soon" with a **Get notified** CTA, and decide where that CTA goes (`mailto:`, a one-field form, or nothing but a disabled button). Also confirm `PlanPickerPage` stops offering Team as a committable tier.
2. **Yearly toggle.** `UpgradeProPage` sells `$80/year`; the brief says "billed monthly". Should the Pro card show a `Monthly · Yearly` `SegmentedControl` (source has none, and its Pro card puts the annual price in the caption instead)? Spec currently keeps the caption approach.
3. **Pro CTA destination.** `/onboarding` has no `?plan=` handling today; the trial flow starts from `navigate('/upgrade/pro', { state: { trial: true } })` inside onboarding. Confirm whether `/onboarding?plan=pro` should preselect Pro + trial, or whether the CTA should be plain `/onboarding`.
4. **"No daily limit" wording for Pro.** Code has no cap for Pro (`remaining: -1`), and `plans.js` says "Unlimited AI messages". Confirm there is no fair-use ceiling that legal wants footnoted before the page says "no limit".
5. **Trial eligibility.** The 7-day trial is set client-side with no guard against repeat trials. Fine for the copy ("Pro comes with a 7-day free trial"), but confirm before the FAQ promises it to every account.
