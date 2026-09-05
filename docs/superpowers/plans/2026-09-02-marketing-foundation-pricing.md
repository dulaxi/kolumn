# Marketing Foundation + Pricing Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the shared marketing shell (nav, footer, SEO head, build-time prerender, sitemap, robots) and the `/pricing` page as the first prerendered, indexable marketing route.

**Architecture:** Marketing routes are ordinary React Router routes nested under a `MarketingLayout` layout route, driven by a single route registry (`src/content/marketing-routes.js`) that also feeds the nav/footer link check, the sitemap, and the prerender script. At build time a second Vite SSR bundle renders each registry route with React 19's `prerender` (from `react-dom/static`) into `dist/<path>/index.html`, injecting the route's head tags; the client hydrates when it finds prerendered markup. All pricing numbers come from one `PRICING` constant that the in-app plan picker and upgrade page derive from, with a test pinning it to the edge function's free daily limit.

**Tech Stack:** React 19.2 (`react-dom/static` prerender, `hydrateRoot`), react-router-dom 7.18 (`StaticRouter`, layout routes), Vite 7 (`--ssr` build), Tailwind v4 tokens, Vitest + Testing Library + jsdom, Phosphor icons, existing `ui/` primitives (`Button`, `Popover`), `serve` on Railway.

**Spec:** `docs/superpowers/specs/2026-09-02-marketing-site-design.md` (umbrella), `docs/superpowers/specs/marketing/_chrome.md` (nav/footer/type/tokens), `docs/superpowers/specs/marketing/pricing.md` (page), `docs/superpowers/specs/marketing/_KOLUMN-BRIEF.md` (copy rules). Executors read the chrome and pricing specs before their task.

## Global Constraints

- Colors: `var(--token)` only. No hex codes in any `.jsx`. New tokens go in `src/index.css`.
- Fonts: headings `font-heading font-[425]` (Clash Grotesk), body Inter (inherited via `.landing-font`), small chrome `font-mono`. No serif.
- Buttons: ink (`Button variant="primary"`) for affirmative, `variant="secondary"` otherwise. **No lime-filled button anywhere.** Lime only as a state color (badge wash, check marks).
- Radii: 8px (`rounded-lg`) buttons/inputs, 12px (`rounded-xl`) cards/panels. No shadows on cards.
- Icons: `@phosphor-icons/react` only.
- Copy: original, sentence case, no exclamation marks, no "revolutionize"/"supercharge". Product name "Kolumn". No feature or number outside `_KOLUMN-BRIEF.md` and `src/content/pricing.js`.
- Title pattern: `<Page> — Kolumn` (em dash, matches `index.html`). Titles ≤ 60 chars, descriptions ≤ 155 chars.
- Canonical host: `https://kolumn.app` (assumed; single constant `SITE_URL`).
- Marketing routes are light-only (`pickBootTheme` pins non-app paths to light; `MarketingLayout` re-applies light on mount).
- Prerender output must not import `src/lib/env.js` (it throws without `VITE_SUPABASE_*`). Auth state in marketing chrome is read client-side only, via dynamic import.
- Every nav/footer link must resolve to a registered marketing route or a known legacy route (test-enforced). Links to pages not yet built are added by the plan that builds them.
- Commits: `feat(marketing): …` / `test(marketing): …` / `build(prerender): …`. Do not push.
- Verify each UI task in the browser (`npm run dev`, then load the route at 1440 and 390 wide). Do not claim done without seeing it render.

---

## File Structure

| Path | Responsibility |
|---|---|
| `src/content/marketing-routes.js` | `SITE_URL`, `MARKETING_ROUTES` registry (path, title, description, jsonLd, lazy Component), `findMarketingRoute(pathname)`. |
| `src/content/marketing-nav.js` | `NAV_LINKS`, `NAV_MENUS`, `FOOTER_GROUPS`, `FOOTER_TAGLINE`, `CONTACT_EMAIL`, `PRIMARY_CTA`. |
| `src/content/pricing.js` | `PRICING` (meta, hero, tiers, footnote, comparison, reassurance, faq, limits) and `pricingJsonLd()`. |
| `src/lib/headMeta.js` | Pure head-tag builders: `buildHeadTags(meta)`, `headTagsToHtml(tags)`, `applyHeadMeta(document, meta)`. |
| `src/lib/prerender.js` | Pure string helpers: `injectIntoTemplate(template, { head, body })`, `buildSitemap(siteUrl, paths)`, `buildRobots(siteUrl)`. |
| `src/prerender-entry.jsx` | SSR entry: `renderRoute(path)` via `react-dom/static`; re-exports the registry for the script. |
| `scripts/prerender.mjs` | Post-build script: renders each route into `dist/<path>/index.html`, writes `sitemap.xml`, `robots.txt`. |
| `src/components/marketing/MarketingRoutes.jsx` | `marketingRouteElements()` — the `<Route>` list shared by `App.jsx` and the SSR entry. |
| `src/components/marketing/MarketingLayout.jsx` | Layout route: skip link, `MarketingNav`, `<main id="main"><Outlet/></main>`, `MarketingFooter`, head meta effect, light theme. |
| `src/components/marketing/MarketingNav.jsx` | Desktop bar (links, `Popover` menus, Sign in / Get started), mobile overlay. |
| `src/components/marketing/MarketingFooter.jsx` | Ink footer: brand column + link groups + bottom row. |
| `src/components/marketing/useMarketingUser.js` | Client-only auth read (dynamic import of `authStore`). |
| `src/components/marketing/FaqItem.jsx` | Extracted from `LandingPage.jsx`, unchanged behavior. |
| `src/components/marketing/PlanGrid.jsx` | Three `PlanCard`s in the landing grid, shared by `/` and `/pricing`. |
| `src/components/marketing/CompareTable.jsx` | Sticky-header comparison grid from `PRICING.comparison`. |
| `src/pages/marketing/PricingPage.jsx` | Assembles hero, `PlanGrid`, footnote, `CompareTable`, reassurance strip, FAQ. |
| `src/components/PlanCard.jsx` (modify) | Adds `caption`, `badge`, null `period`, `ctaTo`, `comingSoon` handling. |
| `src/data/plans.js` (modify) | Derives `PLANS` from `PRICING.tiers` + picker-only fields. |
| `src/pages/UpgradeProPage.jsx` (modify) | `PRICES` amounts read from `PRICING.limits`. |
| `src/pages/LandingPage.jsx` (modify) | Imports `FaqItem` and `PlanGrid` instead of local copies. |
| `src/components/ui/Modal.jsx` (modify) | Export `lockBodyScroll` / `unlockBodyScroll`. |
| `src/index.css` (modify) | `--text-on-ink`, `--text-on-ink-muted`, `--border-on-ink`. |
| `src/main.jsx` (modify) | `hydrateRoot` when `#root` already has children. |
| `src/App.jsx` (modify) | Mount `marketingRouteElements()` under `MarketingLayout`. |
| `vite.config.js` (modify) | Skip `manualChunks` on SSR builds. |
| `package.json` (modify) | `build` runs client build, SSR build, prerender script. |

---

### Task 1: On-ink tokens and body-scroll-lock export

**Files:**
- Modify: `src/index.css` (light `:root` block, after `--btn-primary-hover`, ~line 102)
- Modify: `src/components/ui/Modal.jsx:42-70`
- Test: `src/__tests__/marketingTokens.test.js`

**Interfaces:**
- Produces: CSS vars `--text-on-ink`, `--text-on-ink-muted`, `--border-on-ink` (theme-stable). Named exports `lockBodyScroll()` / `unlockBodyScroll()` from `src/components/ui/Modal.jsx`.

- [ ] **Step 1: Write the failing test**

```js
// src/__tests__/marketingTokens.test.js
import { readFileSync } from 'node:fs'
import { describe, test, expect } from 'vitest'
import { lockBodyScroll, unlockBodyScroll } from '../components/ui/Modal'

const css = readFileSync(new URL('../index.css', import.meta.url), 'utf8')

describe('marketing tokens', () => {
  test('on-ink tokens are defined once and not overridden in dark', () => {
    for (const name of ['--text-on-ink', '--text-on-ink-muted', '--border-on-ink']) {
      const matches = css.match(new RegExp(`^\\s*${name}:`, 'gm')) || []
      expect(matches, name).toHaveLength(1)
    }
  })
})

describe('body scroll lock export', () => {
  test('lock and unlock toggle body overflow', () => {
    lockBodyScroll()
    expect(document.body.style.overflow).toBe('hidden')
    unlockBodyScroll()
    expect(document.body.style.overflow).not.toBe('hidden')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/__tests__/marketingTokens.test.js`
Expected: FAIL — `lockBodyScroll` is not exported; token count is 0.

- [ ] **Step 3: Add tokens and exports**

In `src/index.css`, inside the light `:root` block directly after the `--btn-primary-hover: #333333;` line, add:

```css
  /* Theme-stable light-on-ink text for dark marketing sections (footer).
     Defined once; the dark block intentionally does not override them. */
  --text-on-ink: #F2EDE8;
  --text-on-ink-muted: #A8A5A0;
  --border-on-ink: #33322F;
```

In `src/components/ui/Modal.jsx`, change the two function declarations to named exports (keep bodies as they are):

```js
export function lockBodyScroll() {
```

```js
export function unlockBodyScroll() {
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run src/__tests__/marketingTokens.test.js src/__tests__/Modal.test.jsx`
Expected: PASS (the existing Modal suite still passes).

- [ ] **Step 5: Commit**

```bash
git add src/index.css src/components/ui/Modal.jsx src/__tests__/marketingTokens.test.js
git commit -m "feat(marketing): on-ink tokens and exported body scroll lock"
```

---

### Task 2: Pricing content source and plan derivation

**Files:**
- Create: `src/content/pricing.js`
- Modify: `src/data/plans.js` (full rewrite)
- Modify: `src/pages/UpgradeProPage.jsx:12-16`
- Test: `src/__tests__/pricingContent.test.js`

**Interfaces:**
- Produces: `PRICING` object (shape below), `pricingJsonLd()` → array of JSON-LD objects. `PLANS` keeps every field `PlanCard`/`PlanPicker` read today (`id, name, tagline, price, period, cta, ghost, primaryCta, topIcon, topIconClass, inheritsFrom, bullets`) and adds `caption`, `badge`, `ctaTo`, `comingSoon`.

- [ ] **Step 1: Write the failing test**

```js
// src/__tests__/pricingContent.test.js
import { readFileSync } from 'node:fs'
import { describe, test, expect } from 'vitest'
import { Cheers, Champagne, Popcorn } from '@phosphor-icons/react'
import { PRICING, pricingJsonLd } from '../content/pricing'
import { PLANS, getPlan } from '../data/plans'

describe('PRICING', () => {
  test('free daily limit matches the edge function', () => {
    const tier = readFileSync(new URL('../../supabase/functions/chat/tier.ts', import.meta.url), 'utf8')
    const match = tier.match(/const FREE_DAILY_LIMIT = (\d+)/)
    expect(match).not.toBeNull()
    expect(Number(match[1])).toBe(PRICING.limits.freeMessagesPerDay)
  })

  test('meta lengths fit search snippets', () => {
    expect(PRICING.meta.title.length).toBeLessThanOrEqual(60)
    expect(PRICING.meta.description.length).toBeLessThanOrEqual(155)
  })

  test('tiers are free, pro, team in order and team has no price', () => {
    expect(PRICING.tiers.map((t) => t.id)).toEqual(['free', 'pro', 'team'])
    expect(PRICING.tiers[2].period).toBeNull()
    expect(PRICING.tiers[2].comingSoon).toBe(true)
  })

  test('comparison rows have one cell per column', () => {
    for (const row of PRICING.comparison.rows) {
      expect(row.cells, row.label).toHaveLength(PRICING.comparison.columns.length)
    }
  })

  test('json-ld has Product with two offers and a FAQPage with every question', () => {
    const [product, faq] = pricingJsonLd()
    expect(product['@type']).toBe('Product')
    expect(product.offers).toHaveLength(2)
    expect(faq['@type']).toBe('FAQPage')
    expect(faq.mainEntity).toHaveLength(PRICING.faq.length)
  })
})

describe('PLANS derives from PRICING', () => {
  test('same ids, prices and bullets', () => {
    expect(PLANS.map((p) => p.id)).toEqual(PRICING.tiers.map((t) => t.id))
    PLANS.forEach((p, i) => {
      expect(p.price).toBe(PRICING.tiers[i].price)
      expect(p.bullets).toEqual(PRICING.tiers[i].bullets)
      expect(p.cta).toBe(PRICING.tiers[i].cta.label)
    })
  })

  test('picker-only fields are present', () => {
    expect(getPlan('pro').primaryCta).toBe(true)
    expect(getPlan('free').ghost).toBe(true)
    expect(getPlan('team').comingSoon).toBe(true)
  })

  test('topIcon is the Phosphor component itself, not a wrapper', () => {
    // Phosphor v2 icons are forwardRef objects, not plain functions. Store
    // the component as-is; PlanCard renders it directly as <TopIcon />.
    expect(getPlan('free').topIcon).toBe(Popcorn)
    expect(getPlan('pro').topIcon).toBe(Champagne)
    expect(getPlan('team').topIcon).toBe(Cheers)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/__tests__/pricingContent.test.js`
Expected: FAIL — cannot resolve `../content/pricing`.

- [ ] **Step 3: Write `src/content/pricing.js`**

```js
// Single source of truth for every price, limit, and plan bullet shown to
// users. src/data/plans.js derives the in-app PLANS from `tiers`;
// UpgradeProPage reads `limits`; the /pricing page renders all of it.
// FREE_DAILY_LIMIT in supabase/functions/chat/tier.ts must equal
// limits.freeMessagesPerDay — src/__tests__/pricingContent.test.js pins it.

export const CONTACT_EMAIL = 'hello@kolumn.app'

export const PRICING = {
  meta: {
    title: 'Pricing — Kolumn',
    description:
      'Kolumn is free for boards, cards, and 20 AI messages a day. Pro is $8 a month for unlimited AI on every board. Team is on the way.',
    ogTitle: 'Kolumn pricing',
    ogDescription: 'Free for boards, cards, and 20 AI messages a day. Pro is $8 a month.',
  },
  hero: {
    heading: 'Pricing',
    subhead: 'Free for as long as you like. Pro when the AI should do more than create cards.',
  },
  limits: { freeMessagesPerDay: 20, proMonthlyUsd: 8, proYearlyUsd: 80, trialDays: 7 },
  tiers: [
    {
      id: 'free',
      name: 'Free',
      tagline: 'For getting started',
      price: '$0',
      period: 'forever',
      caption: 'No card, no time limit.',
      badge: null,
      comingSoon: false,
      inheritsFrom: null,
      bullets: [
        'Unlimited boards, columns, and cards',
        'Drag-and-drop, labels, priorities, due dates, checklists',
        'Realtime sync with everyone on the board',
        'The pill creates cards from plain language — 20 AI messages a day',
        'Chat: ask questions about your boards',
        'Board and card templates',
      ],
      cta: { label: 'Start for free', to: '/onboarding' },
    },
    {
      id: 'pro',
      name: 'Pro',
      tagline: 'For daily use',
      price: '$8',
      period: 'month',
      caption: 'Billed monthly, plus tax. $80 a year if you pay up front.',
      badge: 'Recommended',
      comingSoon: false,
      inheritsFrom: 'Free',
      bullets: [
        'No daily AI message limit',
        'The pill moves, updates, completes, and reorganizes cards — not just creates them',
        'Chat can search cards and summarize boards for you',
        '7-day free trial, cancel in Settings anytime',
      ],
      cta: { label: 'Try Pro free for 7 days', to: '/onboarding' },
    },
    {
      id: 'team',
      name: 'Team',
      tagline: 'For workspaces',
      price: 'Coming soon',
      period: null,
      caption: 'Shared workspaces for more than one team. Pricing is not set yet.',
      badge: null,
      comingSoon: true,
      inheritsFrom: 'Pro',
      bullets: [
        'Workspaces with members and invitations',
        'Boards shared per workspace or per board',
        'Row-level security on every table, members-only access',
      ],
      cta: { label: 'Get notified', to: `mailto:${CONTACT_EMAIL}?subject=Kolumn%20Team%20plan` },
    },
  ],
  footnote:
    'Prices are in USD and exclude tax. The free message limit resets every day. Plans can change; we will email you before anything you pay for does.',
  comparison: {
    columns: ['Free', 'Pro', 'Team'],
    note: 'Team is in progress. It will include everything in Pro; what it adds beyond that is not final.',
    rows: [
      { label: 'Boards, columns, cards', cells: ['Unlimited', 'Unlimited', 'Unlimited'] },
      { label: 'AI messages per day', cells: ['20', 'No limit', 'No limit'] },
      { label: 'Pill: create cards from plain language', cells: [true, true, true] },
      { label: 'Pill: move, update, complete, reorganize', cells: [false, true, true] },
      { label: 'Chat: ask questions about your boards', cells: [true, true, true] },
      { label: 'Chat: search cards and summarize boards', cells: [false, true, true] },
      { label: 'Realtime sync across members', cells: [true, true, true] },
      { label: 'Board and card templates', cells: [true, true, true] },
      { label: 'Workspaces with members and invitations', cells: [true, true, true] },
      { label: 'Export your data, delete your account', cells: [true, true, true] },
      { label: 'Row-level security, members-only boards', cells: [true, true, true] },
    ],
  },
  reassurance: {
    heading: 'Not sure? Start on Free.',
    body: 'Every plan uses the same boards. Move to Pro from Settings when you hit the daily limit; nothing is lost either way.',
    cta: { label: 'Start for free', to: '/onboarding' },
  },
  faq: [
    {
      q: 'What do I get on Free?',
      a: 'Boards, columns, and cards with no cap, realtime sync with your team, templates, and the AI pill on every board. Free gets 20 AI messages a day; the counter resets daily. Chat works too, as plain question-and-answer over your boards.',
    },
    {
      q: 'What does Pro change?',
      a: 'Two things. The daily message limit goes away, and the AI is allowed to do more than create: it can move, update, complete, and reorganize cards on the board you are looking at, and chat can search cards and summarize boards instead of only answering from what it can see. Pro is $8 a month, billed monthly, or $80 for a year.',
    },
    {
      q: 'What counts as an AI message?',
      a: 'Anything you send to the pill or to chat. Lists you paste into the pill with commas or line breaks are split into cards without touching the AI, so they never count. A single message that triggers several actions still counts once.',
    },
    {
      q: 'Is there a trial?',
      a: 'Yes. Pro comes with a 7-day free trial. We tell you the end date when you start, and you can cancel from Settings before it renews.',
    },
    {
      q: 'Can I switch plans later?',
      a: 'Any time, from Settings. Downgrading to Free keeps every board, card, and workspace exactly as it is; the only thing that changes is what the AI is allowed to do next.',
    },
    {
      q: 'What about the Team plan?',
      a: 'Team is being built. It will include everything in Pro and is aimed at workspaces shared across more than one team. There is no price yet; if we announce one, people who asked to be notified hear first.',
    },
    {
      q: 'Is my data private?',
      a: 'Yes. Every table uses row-level security, so only members of a board can read it. We do not train on your content, and you can export or delete everything from Settings.',
    },
  ],
}

export function pricingJsonLd() {
  const { limits, faq } = PRICING
  return [
    {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: 'Kolumn',
      brand: { '@type': 'Organization', name: 'Kolumn' },
      offers: [
        { '@type': 'Offer', name: 'Free', price: 0, priceCurrency: 'USD' },
        {
          '@type': 'Offer',
          name: 'Pro',
          price: limits.proMonthlyUsd,
          priceCurrency: 'USD',
          priceSpecification: [
            { '@type': 'UnitPriceSpecification', price: limits.proMonthlyUsd, priceCurrency: 'USD', billingDuration: 'P1M' },
            { '@type': 'UnitPriceSpecification', price: limits.proYearlyUsd, priceCurrency: 'USD', billingDuration: 'P1Y' },
          ],
        },
      ],
    },
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: faq.map(({ q, a }) => ({
        '@type': 'Question',
        name: q,
        acceptedAnswer: { '@type': 'Answer', text: a },
      })),
    },
  ]
}
```

- [ ] **Step 4: Rewrite `src/data/plans.js`**

```js
// In-app plan list (landing grid, onboarding plan step, /plans picker).
// Prices, bullets, and copy come from src/content/pricing.js; this file only
// adds the presentation-only fields the picker needs:
//   ghost        — true = transparent bg blending into page (Free only)
//   primaryCta   — true = the "recommended" tier; heavier border + ink CTA
//   topIcon      — Phosphor icon component for the card header
//   topIconClass — Tailwind classes for the top icon's color

import { Cheers, Champagne, Popcorn } from '@phosphor-icons/react'
import { PRICING } from '../content/pricing'

const PRESENTATION = {
  free: { ghost: true, primaryCta: false, topIcon: Popcorn, topIconClass: 'text-[var(--text-primary)]' },
  // Lime-tinted icon (vs ink on Free/Team) puts brand accent color
  // exactly where the eye first lands — signals "this one matters."
  pro: { ghost: false, primaryCta: true, topIcon: Champagne, topIconClass: 'text-[var(--color-logo)]' },
  team: { ghost: false, primaryCta: false, topIcon: Cheers, topIconClass: 'text-[var(--text-primary)]' },
}

export const PLANS = PRICING.tiers.map((tier) => ({
  id: tier.id,
  name: tier.name,
  tagline: tier.tagline,
  price: tier.price,
  period: tier.period,
  caption: tier.caption,
  badge: tier.badge,
  comingSoon: tier.comingSoon,
  cta: tier.cta.label,
  ctaTo: tier.cta.to,
  inheritsFrom: tier.inheritsFrom,
  bullets: tier.bullets,
  ...PRESENTATION[tier.id],
}))

export function getPlan(id) {
  return PLANS.find((p) => p.id === id) || null
}
```

- [ ] **Step 5: Point `UpgradeProPage` at `PRICING.limits`**

In `src/pages/UpgradeProPage.jsx`, add the import next to the other imports:

```js
import { PRICING } from '../content/pricing'
```

Replace the `PRICES` constant (lines 12–16) with:

```js
const { proMonthlyUsd, proYearlyUsd } = PRICING.limits
const PRICES = {
  monthly: { amount: proMonthlyUsd, period: 'month', label: `$${proMonthlyUsd}.00/month + tax`, billed: 'Billed monthly' },
  yearly:  { amount: proYearlyUsd,  period: 'year',  label: `$${proYearlyUsd}.00/year + tax`,  billed: 'Billed yearly' },
}
```

- [ ] **Step 6: Run tests**

Run: `npx vitest run src/__tests__/pricingContent.test.js && npx vitest run`
Expected: new suite PASS; full suite still green (no existing test reads `PLANS[2].price`; if one does, update its expectation to `'Coming soon'`).

- [ ] **Step 7: Commit**

```bash
git add src/content/pricing.js src/data/plans.js src/pages/UpgradeProPage.jsx src/__tests__/pricingContent.test.js
git commit -m "feat(marketing): PRICING content source; PLANS and upgrade page derive from it"
```

---

### Task 3: PlanCard additions (caption, badge, null period, ctaTo, comingSoon)

**Files:**
- Modify: `src/components/PlanCard.jsx`
- Test: `src/__tests__/PlanCard.test.jsx`

**Interfaces:**
- Consumes: `PLANS` entries from Task 2.
- Produces: `PlanCard` renders `plan.caption` under the price, `plan.badge` top-right, omits `/ period` when `plan.period` is null, links landing CTA to `plan.ctaTo` (plain `<a>` for `mailto:`), and in picker mode renders a disabled "Coming soon" button when `plan.comingSoon`.

- [ ] **Step 1: Write the failing test**

```jsx
// src/__tests__/PlanCard.test.jsx
import { describe, test, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import PlanCard from '../components/PlanCard'
import { getPlan } from '../data/plans'

const wrap = (ui) => render(<MemoryRouter>{ui}</MemoryRouter>)

describe('PlanCard', () => {
  test('pro shows badge, caption, and period', () => {
    wrap(<PlanCard plan={getPlan('pro')} />)
    expect(screen.getByText('Recommended')).toBeInTheDocument()
    expect(screen.getByText(/Billed monthly/)).toBeInTheDocument()
    expect(screen.getByText('/ month')).toBeInTheDocument()
  })

  test('team omits the period and links its CTA to mailto', () => {
    wrap(<PlanCard plan={getPlan('team')} />)
    expect(screen.queryByText(/^\/ /)).toBeNull()
    const cta = screen.getByRole('link', { name: /get notified/i })
    expect(cta.getAttribute('href')).toMatch(/^mailto:/)
  })

  test('free CTA links to onboarding', () => {
    wrap(<PlanCard plan={getPlan('free')} />)
    expect(screen.getByRole('link', { name: /start for free/i })).toHaveAttribute('href', '/onboarding')
  })

  test('picker mode disables the team card and never calls onSelect', async () => {
    const onSelect = vi.fn()
    wrap(<PlanCard plan={getPlan('team')} mode="picker" onSelect={onSelect} />)
    const btn = screen.getByRole('button', { name: /coming soon/i })
    expect(btn).toBeDisabled()
    btn.click()
    expect(onSelect).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/__tests__/PlanCard.test.jsx`
Expected: FAIL — no "Recommended" text; team CTA href is `/onboarding`; picker button label is "Get notified".

- [ ] **Step 3: Implement in `src/components/PlanCard.jsx`**

Replace the price block:

```jsx
      <div className="flex items-baseline gap-1.5 mb-2">
        <span className="text-4xl font-normal text-[var(--text-primary)] font-logo">
          {plan.price}
        </span>
        {plan.period && <span className={`${detail} text-[var(--text-muted)]`}>/ {plan.period}</span>}
      </div>
      {plan.caption ? (
        <p className="text-sm text-[var(--text-muted)] mb-6">{plan.caption}</p>
      ) : (
        <div className="mb-4" />
      )}
```

Add the badge directly after the opening `<div className={wrapperClasses}>`:

```jsx
      {plan.badge && (
        <span className="absolute top-4 right-4 font-mono text-[11px] uppercase tracking-[0.06em] px-2 py-1 rounded-md bg-[var(--accent-lime-wash)] text-[var(--accent-lime-text)]">
          {plan.badge}
        </span>
      )}
```

Replace the CTA branch (`{isPicker ? ( … ) : ( … )}`) with:

```jsx
      {isPicker ? (
        <button
          type="button"
          onClick={() => onSelect?.(plan.id)}
          disabled={disabled || loading || plan.comingSoon}
          aria-label={plan.comingSoon ? 'Coming soon' : plan.cta}
          aria-busy={loading || undefined}
          className={ctaBaseClasses}
          style={loading ? { opacity: 1 } : undefined}
        >
          {loading ? (
            <>
              <span className="sr-only">Setting up</span>
              <LetterWave text="Setting up" />
            </>
          ) : plan.comingSoon ? (
            'Coming soon'
          ) : (
            <>
              {plan.cta}
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      ) : plan.ctaTo?.startsWith('mailto:') ? (
        <a href={plan.ctaTo} className={ctaBaseClasses}>
          {plan.cta}
          <ArrowRight className="w-4 h-4" />
        </a>
      ) : (
        <Link to={plan.ctaTo || '/onboarding'} className={ctaBaseClasses}>
          {plan.cta}
          <ArrowRight className="w-4 h-4" />
        </Link>
      )}
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run src/__tests__/PlanCard.test.jsx && npx vitest run`
Expected: PASS.

- [ ] **Step 5: Check in the browser**

Run `npm run dev`, open `http://127.0.0.1:5173/` and scroll to "Compare plans". Confirm: Pro has a small lime-wash "Recommended" badge top-right, captions sit under each price, Team shows "Coming soon" with no "/ per month", CTA buttons still share a baseline.

- [ ] **Step 6: Commit**

```bash
git add src/components/PlanCard.jsx src/__tests__/PlanCard.test.jsx
git commit -m "feat(marketing): PlanCard caption, badge, coming-soon and ctaTo"
```

---

### Task 4: Extract `FaqItem` and `PlanGrid` from the landing page

**Files:**
- Create: `src/components/marketing/FaqItem.jsx`
- Create: `src/components/marketing/PlanGrid.jsx`
- Modify: `src/pages/LandingPage.jsx` (remove local `FaqItem` at ~1236–1274; replace the plans grid at ~1731–1738; adjust imports)
- Test: `src/__tests__/FaqItem.test.jsx`

**Interfaces:**
- Produces: `FaqItem({ question, answer, index })` (default export), `PlanGrid({ className })` (default export; renders `PLANS` in `mode="landing"`).

- [ ] **Step 1: Write the failing test**

```jsx
// src/__tests__/FaqItem.test.jsx
import { describe, test, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import FaqItem from '../components/marketing/FaqItem'
import PlanGrid from '../components/marketing/PlanGrid'

describe('FaqItem', () => {
  test('toggles aria-expanded and exposes the panel', async () => {
    render(<FaqItem question="Q?" answer="A." index={3} />)
    const btn = screen.getByRole('button', { name: 'Q?' })
    expect(btn).toHaveAttribute('aria-expanded', 'false')
    expect(btn).toHaveAttribute('aria-controls', 'faq-panel-3')
    await userEvent.click(btn)
    expect(btn).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByRole('region', { name: 'Q?' })).toHaveTextContent('A.')
  })
})

describe('PlanGrid', () => {
  test('renders the three plans', () => {
    render(<MemoryRouter><PlanGrid /></MemoryRouter>)
    for (const name of ['Free', 'Pro', 'Team']) {
      expect(screen.getByRole('heading', { name })).toBeInTheDocument()
    }
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/__tests__/FaqItem.test.jsx`
Expected: FAIL — modules not found.

- [ ] **Step 3: Create `src/components/marketing/FaqItem.jsx`**

Move the `FaqItem` function out of `LandingPage.jsx` verbatim and add its imports:

```jsx
import { useState } from 'react'
import { Plus } from '@phosphor-icons/react'

// Accordion row for marketing FAQs (landing, /pricing, …). Grid-rows
// 0fr→1fr expansion, `+` rotates 45° when open.
export default function FaqItem({ question, answer, index }) {
  const [open, setOpen] = useState(false)
  const panelId = `faq-panel-${index}`
  const headerId = `faq-header-${index}`
  return (
    <div>
      <button
        type="button"
        id={headerId}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-4 py-2.5 text-left group cursor-pointer"
      >
        <h3 className="text-base font-normal text-[var(--text-primary)] tracking-tight leading-snug">
          {question}
        </h3>
        <span
          aria-hidden="true"
          className={`shrink-0 w-5 h-5 flex items-center justify-center text-[var(--text-secondary)] transition-transform duration-200 ${open ? 'rotate-45' : ''}`}
        >
          <Plus size={18} weight="light" />
        </span>
      </button>
      <div
        id={panelId}
        role="region"
        aria-labelledby={headerId}
        className={`grid transition-[grid-template-rows] duration-300 ease-out ${open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}
      >
        <div className="overflow-hidden">
          <p className="pb-3 pr-10 text-sm font-light text-[var(--text-secondary)] leading-relaxed">
            {answer}
          </p>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Create `src/components/marketing/PlanGrid.jsx`**

```jsx
import PlanCard from '../PlanCard'
import { PLANS } from '../../data/plans'

// Three plan cards on the landing grid. Wider than the page column on
// purpose: three 384px cards need 1184px to breathe at 16px detail text.
export default function PlanGrid({ className = '' }) {
  return (
    <div className={`grid grid-cols-1 lg:grid-cols-3 gap-4 justify-items-center max-w-[74rem] mx-auto ${className}`}>
      {PLANS.map((plan) => (
        <PlanCard key={plan.id} plan={plan} mode="landing" className="w-full max-w-sm" />
      ))}
    </div>
  )
}
```

- [ ] **Step 5: Update `src/pages/LandingPage.jsx`**

1. Delete the local `function FaqItem …` block (the one starting `function FaqItem({ question, answer, index })`).
2. Replace the plans grid inside the Pricing section:

```jsx
        <PlanGrid />
```

   (removing the `<div className="grid grid-cols-1 lg:grid-cols-3 …">…</div>` that mapped `PLANS`).
3. Imports: add

```js
import FaqItem from '../components/marketing/FaqItem'
import PlanGrid from '../components/marketing/PlanGrid'
```

   and remove `import PlanCard from '../components/PlanCard'` and `import { PLANS } from '../data/plans'`. Remove `Plus` from the Phosphor import list if nothing else in the file uses it (run `npm run lint` to confirm).

- [ ] **Step 6: Run tests, lint, and look**

Run: `npx vitest run src/__tests__/FaqItem.test.jsx && npm run lint && npx vitest run`
Expected: PASS, lint clean.
Open `http://127.0.0.1:5173/`, confirm the FAQ still expands and the plans grid is unchanged.

- [ ] **Step 7: Commit**

```bash
git add src/components/marketing/FaqItem.jsx src/components/marketing/PlanGrid.jsx src/pages/LandingPage.jsx src/__tests__/FaqItem.test.jsx
git commit -m "refactor(marketing): extract FaqItem and PlanGrid from LandingPage"
```

---

### Task 5: Route registry and nav content

**Files:**
- Create: `src/content/marketing-routes.js`
- Create: `src/content/marketing-nav.js`
- Create: `src/pages/marketing/PricingPage.jsx` (placeholder heading only; Task 10 fills it)
- Test: `src/__tests__/marketingRoutes.test.js`

**Interfaces:**
- Produces:
  - `SITE_URL = 'https://kolumn.app'`
  - `MARKETING_ROUTES: Array<{ path, title, description, ogTitle?, ogDescription?, jsonLd?: () => object[], Component }>`
  - `findMarketingRoute(pathname) → route | null`
  - `KNOWN_ROUTES: string[]` (legacy public routes the nav may target)
  - `NAV_LINKS: [{ label, to }]`, `NAV_MENUS: [{ label, columns: [[{ label, to }]] }]`, `FOOTER_GROUPS: [{ heading, links: [{ label, to }] }]`, `FOOTER_TAGLINE`, `PRIMARY_CTA = { label, to }`, `SIGN_IN = { label, to }`, `CONTACT_EMAIL`.

- [ ] **Step 1: Write the failing test**

```js
// src/__tests__/marketingRoutes.test.js
import { describe, test, expect } from 'vitest'
import { MARKETING_ROUTES, KNOWN_ROUTES, SITE_URL, findMarketingRoute } from '../content/marketing-routes'
import { NAV_LINKS, NAV_MENUS, FOOTER_GROUPS, PRIMARY_CTA, SIGN_IN } from '../content/marketing-nav'

const allNavTargets = () => [
  ...NAV_LINKS.map((l) => l.to),
  ...NAV_MENUS.flatMap((m) => m.columns.flat().map((l) => l.to)),
  ...FOOTER_GROUPS.flatMap((g) => g.links.map((l) => l.to)),
  PRIMARY_CTA.to,
  SIGN_IN.to,
]

describe('marketing routes', () => {
  test('site url has no trailing slash', () => {
    expect(SITE_URL).toMatch(/^https:\/\/[^/]+$/)
  })

  test('every route has a path, title, description and component', () => {
    for (const r of MARKETING_ROUTES) {
      expect(r.path).toMatch(/^\/[a-z0-9-/]*$/)
      expect(r.title.length).toBeLessThanOrEqual(60)
      expect(r.description.length).toBeLessThanOrEqual(155)
      expect(r.Component).toBeTruthy()
    }
  })

  test('findMarketingRoute resolves registered paths only', () => {
    expect(findMarketingRoute('/pricing')?.path).toBe('/pricing')
    expect(findMarketingRoute('/pricing/')?.path).toBe('/pricing')
    expect(findMarketingRoute('/nope')).toBeNull()
  })

  test('nav and footer never link to an unbuilt page', () => {
    const valid = new Set([...MARKETING_ROUTES.map((r) => r.path), ...KNOWN_ROUTES])
    for (const to of allNavTargets()) {
      if (to.startsWith('mailto:')) continue
      expect(valid.has(to), `dead link: ${to}`).toBe(true)
    }
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/__tests__/marketingRoutes.test.js`
Expected: FAIL — modules not found.

- [ ] **Step 3: Create the placeholder page `src/pages/marketing/PricingPage.jsx`**

```jsx
export default function PricingPage() {
  return <h1 className="font-heading font-[425] text-5xl text-[var(--text-primary)]">Pricing</h1>
}
```

- [ ] **Step 4: Create `src/content/marketing-routes.js`**

```js
import { lazy } from 'react'
import { PRICING, pricingJsonLd } from './pricing'

// Canonical origin for canonical/OG URLs and the sitemap. No trailing slash.
export const SITE_URL = 'https://kolumn.app'

// Public routes that exist outside this registry and may be linked from the
// marketing chrome. Anything else must be a MARKETING_ROUTES path.
export const KNOWN_ROUTES = ['/', '/onboarding', '/terms', '/privacy', '/#sign-in']

// One entry per prerendered marketing page. This list drives App.jsx routes,
// head meta (title/description/canonical/OG/JSON-LD), the nav dead-link test,
// scripts/prerender.mjs, sitemap.xml and robots.txt.
export const MARKETING_ROUTES = [
  {
    path: '/pricing',
    title: PRICING.meta.title,
    description: PRICING.meta.description,
    ogTitle: PRICING.meta.ogTitle,
    ogDescription: PRICING.meta.ogDescription,
    jsonLd: pricingJsonLd,
    Component: lazy(() => import('../pages/marketing/PricingPage')),
  },
]

export function findMarketingRoute(pathname) {
  const clean = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname
  return MARKETING_ROUTES.find((r) => r.path === clean) || null
}
```

- [ ] **Step 5: Create `src/content/marketing-nav.js`**

```js
// Nav + footer link data. Grows as marketing pages ship: a link may only be
// added here once its route is in MARKETING_ROUTES (or KNOWN_ROUTES) —
// src/__tests__/marketingRoutes.test.js fails on dead links.
export { CONTACT_EMAIL } from './pricing'

export const PRIMARY_CTA = { label: 'Get started', to: '/onboarding' }
export const SIGN_IN = { label: 'Sign in', to: '/#sign-in' }

// Flat top-level links, in order. (Features → '/features' joins when built.)
export const NAV_LINKS = [{ label: 'Pricing', to: '/pricing' }]

// Dropdown menus: { label, columns: [[{ label, to }, …], …] }.
// Solutions and Resources menus are added by their page plans.
export const NAV_MENUS = []

export const FOOTER_TAGLINE = 'A kanban that stays a kanban.'

// Column order follows the chrome spec: Product · Solutions · Resources +
// Company · Legal. Groups appear as their pages ship.
export const FOOTER_GROUPS = [
  {
    heading: 'Product',
    links: [
      { label: 'Pricing', to: '/pricing' },
      { label: 'Log in', to: '/#sign-in' },
    ],
  },
  {
    heading: 'Legal',
    links: [
      { label: 'Terms', to: '/terms' },
      { label: 'Privacy', to: '/privacy' },
    ],
  },
]
```

- [ ] **Step 6: Run tests**

Run: `npx vitest run src/__tests__/marketingRoutes.test.js`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/content/marketing-routes.js src/content/marketing-nav.js src/pages/marketing/PricingPage.jsx src/__tests__/marketingRoutes.test.js
git commit -m "feat(marketing): route registry and nav content with dead-link test"
```

---

### Task 6: Head-meta helpers (`src/lib/headMeta.js`)

**Files:**
- Create: `src/lib/headMeta.js`
- Test: `src/__tests__/headMeta.test.js`

**Interfaces:**
- Produces:
  - `routeMeta(route) → { title, description, canonical, ogTitle, ogDescription, robots, jsonLd: object[] }` (uses `SITE_URL`)
  - `buildHeadTags(meta) → Array<{ tag: 'title'|'meta'|'link'|'script', attrs: object, text?: string }>`
  - `headTagsToHtml(tags) → string`
  - `applyHeadMeta(document, meta) → void` — upserts the same tags in a live DOM (client-side navigation), replacing any existing `<title>`, `meta[name=description]`, `link[rel=canonical]`, `meta[property^="og:"]`, `meta[name^="twitter:"]`, `meta[name=robots]`, and `script[data-kolumn-jsonld]`.
  - `MANAGED_HEAD_SELECTOR` — the CSS selector for the tags this module owns (also used by the prerender template stripper).

- [ ] **Step 1: Write the failing test**

```js
// src/__tests__/headMeta.test.js
import { describe, test, expect } from 'vitest'
import { routeMeta, buildHeadTags, headTagsToHtml, applyHeadMeta, MANAGED_HEAD_SELECTOR } from '../lib/headMeta'

const route = {
  path: '/pricing',
  title: 'Pricing — Kolumn',
  description: 'Desc & more',
  ogTitle: 'Kolumn pricing',
  ogDescription: 'OG desc',
  jsonLd: () => [{ '@type': 'Product', name: 'Kolumn' }],
}

describe('routeMeta', () => {
  test('builds canonical from SITE_URL and falls back og to title/description', () => {
    const m = routeMeta(route)
    expect(m.canonical).toBe('https://kolumn.app/pricing')
    expect(m.ogTitle).toBe('Kolumn pricing')
    expect(routeMeta({ ...route, ogTitle: undefined }).ogTitle).toBe('Pricing — Kolumn')
    expect(m.jsonLd).toHaveLength(1)
  })
})

describe('headTagsToHtml', () => {
  test('escapes attribute values and serializes json-ld', () => {
    const html = headTagsToHtml(buildHeadTags(routeMeta(route)))
    expect(html).toContain('<title>Pricing — Kolumn</title>')
    expect(html).toContain('<meta name="description" content="Desc &amp; more">')
    expect(html).toContain('<link rel="canonical" href="https://kolumn.app/pricing">')
    expect(html).toContain('<meta property="og:url" content="https://kolumn.app/pricing">')
    expect(html).toContain('<meta name="robots" content="index, follow, max-image-preview:large">')
    expect(html).toContain('<script type="application/ld+json" data-kolumn-jsonld>{"@type":"Product","name":"Kolumn"}</script>')
  })
})

describe('applyHeadMeta', () => {
  test('replaces existing managed tags instead of duplicating them', () => {
    document.head.innerHTML =
      '<meta charset="UTF-8"><title>Old</title><meta name="description" content="old"><meta property="og:title" content="old">'
    applyHeadMeta(document, routeMeta(route))
    expect(document.title).toBe('Pricing — Kolumn')
    expect(document.querySelectorAll('title')).toHaveLength(1)
    expect(document.querySelectorAll('meta[name="description"]')).toHaveLength(1)
    expect(document.querySelector('meta[name="description"]').content).toBe('Desc & more')
    expect(document.querySelector('link[rel="canonical"]').href).toBe('https://kolumn.app/pricing')
    expect(document.querySelectorAll('script[data-kolumn-jsonld]')).toHaveLength(1)
    expect(document.querySelector('meta[charset]')).not.toBeNull()

    applyHeadMeta(document, routeMeta({ ...route, title: 'Second — Kolumn' }))
    expect(document.querySelectorAll('title')).toHaveLength(1)
    expect(document.title).toBe('Second — Kolumn')
  })

  test('managed selector matches only owned tags', () => {
    document.head.innerHTML = '<meta charset="UTF-8"><link rel="icon" href="/x.ico"><title>T</title>'
    expect(document.head.querySelectorAll(MANAGED_HEAD_SELECTOR)).toHaveLength(1)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/__tests__/headMeta.test.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Create `src/lib/headMeta.js`**

```js
// Head tags for marketing routes. Two consumers share one description of
// the tags: scripts/prerender.mjs serializes them into dist/<path>/index.html
// (headTagsToHtml), and MarketingLayout upserts them on client-side
// navigation (applyHeadMeta). Keep this file free of React and browser-only
// globals at module scope — it runs in Node during the build.
import { SITE_URL } from '../content/marketing-routes'

export const ROBOTS = 'index, follow, max-image-preview:large'

export const MANAGED_HEAD_SELECTOR = [
  'title',
  'meta[name="description"]',
  'meta[name="robots"]',
  'link[rel="canonical"]',
  'meta[property^="og:"]',
  'meta[name^="twitter:"]',
  'script[data-kolumn-jsonld]',
].join(',')

export function routeMeta(route) {
  return {
    title: route.title,
    description: route.description,
    canonical: `${SITE_URL}${route.path === '/' ? '' : route.path}`,
    ogTitle: route.ogTitle || route.title,
    ogDescription: route.ogDescription || route.description,
    robots: ROBOTS,
    jsonLd: typeof route.jsonLd === 'function' ? route.jsonLd() : route.jsonLd || [],
  }
}

export function buildHeadTags(meta) {
  const tags = [
    { tag: 'title', attrs: {}, text: meta.title },
    { tag: 'meta', attrs: { name: 'description', content: meta.description } },
    { tag: 'meta', attrs: { name: 'robots', content: meta.robots } },
    { tag: 'link', attrs: { rel: 'canonical', href: meta.canonical } },
    { tag: 'meta', attrs: { property: 'og:type', content: 'website' } },
    { tag: 'meta', attrs: { property: 'og:site_name', content: 'Kolumn' } },
    { tag: 'meta', attrs: { property: 'og:title', content: meta.ogTitle } },
    { tag: 'meta', attrs: { property: 'og:description', content: meta.ogDescription } },
    { tag: 'meta', attrs: { property: 'og:url', content: meta.canonical } },
    { tag: 'meta', attrs: { name: 'twitter:card', content: 'summary' } },
    { tag: 'meta', attrs: { name: 'twitter:title', content: meta.ogTitle } },
    { tag: 'meta', attrs: { name: 'twitter:description', content: meta.ogDescription } },
  ]
  for (const obj of meta.jsonLd) {
    tags.push({ tag: 'script', attrs: { type: 'application/ld+json', 'data-kolumn-jsonld': '' }, text: JSON.stringify(obj) })
  }
  return tags
}

function escapeAttr(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
}

function escapeText(value) {
  return String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
}

export function headTagsToHtml(tags) {
  return tags
    .map(({ tag, attrs, text }) => {
      const attrString = Object.entries(attrs)
        .map(([k, v]) => (v === '' ? ` ${k}` : ` ${k}="${escapeAttr(v)}"`))
        .join('')
      if (tag === 'script') return `<script${attrString}>${String(text).replaceAll('</', '<\\/')}</script>`
      if (tag === 'title') return `<title>${escapeText(text)}</title>`
      return `<${tag}${attrString}>`
    })
    .join('\n    ')
}

export function applyHeadMeta(doc, meta) {
  const head = doc.head
  for (const el of head.querySelectorAll(MANAGED_HEAD_SELECTOR)) el.remove()
  for (const { tag, attrs, text } of buildHeadTags(meta)) {
    const el = doc.createElement(tag)
    for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
    if (text != null) el.textContent = text
    head.appendChild(el)
  }
}
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run src/__tests__/headMeta.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/headMeta.js src/__tests__/headMeta.test.js
git commit -m "feat(marketing): head meta builders shared by prerender and client"
```

---

### Task 7: `MarketingNav`, `MarketingFooter`, `useMarketingUser`

**Files:**
- Create: `src/components/marketing/useMarketingUser.js`
- Create: `src/components/marketing/MarketingNav.jsx`
- Create: `src/components/marketing/MarketingFooter.jsx`
- Test: `src/__tests__/MarketingChrome.test.jsx`

**Interfaces:**
- Consumes: Task 1 tokens + `lockBodyScroll`/`unlockBodyScroll`; Task 5 nav content; `Popover` (`open`, `onOpenChange`, `placement`, `panel`, `panelClassName`, `children`), `Button`, `KolumnLockup({ text, weight, wordClassName })`.
- Produces: `MarketingNav()` and `MarketingFooter()` default exports, no props. `useMarketingUser() → user | null` (null during SSR and until the auth store loads).

- [ ] **Step 1: Write the failing test**

```jsx
// src/__tests__/MarketingChrome.test.jsx
import { describe, test, expect, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'

vi.mock('../store/authStore', () => ({
  useAuthStore: Object.assign(() => null, {
    getState: () => ({ user: null }),
    subscribe: () => () => {},
  }),
}))

import MarketingNav from '../components/marketing/MarketingNav'
import MarketingFooter from '../components/marketing/MarketingFooter'
import { FOOTER_GROUPS } from '../content/marketing-nav'

const wrap = (ui) => render(<MemoryRouter initialEntries={['/pricing']}>{ui}</MemoryRouter>)

describe('MarketingNav', () => {
  test('desktop bar has links, sign in and get started', () => {
    wrap(<MarketingNav />)
    const nav = screen.getByRole('navigation', { name: /main/i })
    expect(within(nav).getByRole('link', { name: 'Pricing' })).toHaveAttribute('href', '/pricing')
    expect(within(nav).getByRole('link', { name: 'Sign in' })).toHaveAttribute('href', '/#sign-in')
    expect(within(nav).getByRole('link', { name: 'Get started' })).toHaveAttribute('href', '/onboarding')
  })

  test('mobile toggle opens an overlay with the same links and locks scroll', async () => {
    wrap(<MarketingNav />)
    const toggle = screen.getByRole('button', { name: /open menu/i })
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    await userEvent.click(toggle)
    expect(screen.getByRole('button', { name: /close menu/i })).toHaveAttribute('aria-expanded', 'true')
    expect(document.body.style.overflow).toBe('hidden')
    const overlay = screen.getByRole('dialog', { name: /menu/i })
    expect(within(overlay).getByRole('link', { name: 'Pricing' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /close menu/i }))
    expect(document.body.style.overflow).not.toBe('hidden')
  })
})

describe('MarketingFooter', () => {
  test('renders every footer group heading and link', () => {
    wrap(<MarketingFooter />)
    const footer = screen.getByRole('contentinfo')
    for (const group of FOOTER_GROUPS) {
      expect(within(footer).getByRole('heading', { name: group.heading })).toBeInTheDocument()
      for (const link of group.links) {
        expect(within(footer).getByRole('link', { name: link.label })).toHaveAttribute('href', link.to)
      }
    }
    expect(within(footer).getByText(new RegExp(`© ${new Date().getFullYear()} Kolumn`))).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/__tests__/MarketingChrome.test.jsx`
Expected: FAIL — modules not found.

- [ ] **Step 3: Create `src/components/marketing/useMarketingUser.js`**

```js
import { useEffect, useState } from 'react'

// Auth state for the marketing chrome, read client-side only. The auth store
// pulls in the Supabase client and src/lib/env.js (which throws without env
// vars), so it must never be imported by the prerender bundle. Dynamic import
// inside an effect keeps it out of the SSR graph; SSR and first paint render
// the signed-out chrome, then a signed-in visitor sees "Open Kolumn".
export default function useMarketingUser() {
  const [user, setUser] = useState(null)
  useEffect(() => {
    let unsubscribe = () => {}
    let cancelled = false
    import('../../store/authStore').then(({ useAuthStore }) => {
      if (cancelled) return
      setUser(useAuthStore.getState().user || null)
      unsubscribe = useAuthStore.subscribe((s) => setUser(s.user || null))
    })
    return () => {
      cancelled = true
      unsubscribe()
    }
  }, [])
  return user
}
```

- [ ] **Step 4: Create `src/components/marketing/MarketingNav.jsx`**

```jsx
import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { CaretDown, List, Minus, Plus, X } from '@phosphor-icons/react'
import KolumnLockup from '../layout/KolumnLockup'
import Popover from '../ui/Popover'
import { lockBodyScroll, unlockBodyScroll } from '../ui/Modal'
import { NAV_LINKS, NAV_MENUS, PRIMARY_CTA, SIGN_IN } from '../../content/marketing-nav'
import useMarketingUser from './useMarketingUser'

// Chrome spec §3.1: 84px sticky bar (72px mobile), 1312px container at 1440,
// flat links + hover menus, Sign in (secondary) + Get started (ink), and a
// full-viewport overlay menu under 640px.

const CONTAINER = 'max-w-[90rem] mx-auto'
const CONTAINER_STYLE = { width: 'calc(100% - (2 * clamp(2rem, 1.43rem + 2.86vw, 4rem)))' }
const LINK = 'inline-flex items-center h-10 text-[15px] font-normal text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors'
const SECONDARY = 'inline-flex items-center justify-center h-9 px-5 min-w-[5rem] whitespace-nowrap text-[15px] font-normal text-[var(--text-secondary)] hover:text-[var(--text-primary)] border-[0.5px] border-[var(--color-sand)] rounded-lg transition-colors'
const PRIMARY = 'inline-flex items-center justify-center h-9 px-5 min-w-[5rem] whitespace-nowrap text-[15px] font-normal bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] hover:bg-[var(--btn-primary-hover)] rounded-lg transition-colors'

function NavMenu({ menu }) {
  const [open, setOpen] = useState(false)
  const width = menu.columns.length > 1 ? 'w-[26rem]' : 'w-[14rem]'
  return (
    <div onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      <Popover
        open={open}
        onOpenChange={setOpen}
        placement="bottom-start"
        panelClassName={`${width} p-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-card)]`}
        panel={
          <div className={`grid gap-2 ${menu.columns.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
            {menu.columns.map((column, i) => (
              <ul key={i} className="flex flex-col">
                {column.map((link) => (
                  <li key={link.to}>
                    <Link
                      to={link.to}
                      onClick={() => setOpen(false)}
                      className="flex items-center h-9 px-3 rounded-lg text-[15px] text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            ))}
          </div>
        }
      >
        <button
          type="button"
          aria-expanded={open}
          aria-haspopup="menu"
          onClick={() => setOpen((v) => !v)}
          onFocus={() => setOpen(true)}
          className={`${LINK} gap-1.5 cursor-pointer`}
        >
          {menu.label}
          <CaretDown size={12} weight="bold" className={`transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
      </Popover>
    </div>
  )
}

function MobileAccordion({ menu }) {
  const [open, setOpen] = useState(false)
  return (
    <li className="border-b border-[var(--border-subtle)]">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between h-14 text-[17px] text-[var(--text-primary)] cursor-pointer"
      >
        {menu.label}
        {open ? <Minus size={20} weight="light" /> : <Plus size={20} weight="light" />}
      </button>
      {open && (
        <ul className="pb-2">
          {menu.columns.flat().map((link) => (
            <li key={link.to}>
              <Link to={link.to} className="flex items-center h-11 text-[15px] text-[var(--text-secondary)]">
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </li>
  )
}

export default function MarketingNav() {
  const [menuOpen, setMenuOpen] = useState(false)
  const { pathname } = useLocation()
  const user = useMarketingUser()

  // Close the overlay on navigation and release the scroll lock on unmount.
  useEffect(() => setMenuOpen(false), [pathname])
  useEffect(() => {
    if (!menuOpen) return undefined
    lockBodyScroll()
    return () => unlockBodyScroll()
  }, [menuOpen])

  const authControls = user ? (
    <Link to="/dashboard" className={PRIMARY}>Open Kolumn</Link>
  ) : (
    <>
      <a href={SIGN_IN.to} className={SECONDARY}>{SIGN_IN.label}</a>
      <Link to={PRIMARY_CTA.to} className={PRIMARY}>{PRIMARY_CTA.label}</Link>
    </>
  )

  return (
    <nav aria-label="Main" className="sticky top-0 z-50 bg-[var(--surface-page)]">
      {/* Desktop bar — 84px: py-6 + h-9 controls */}
      <div className={`hidden sm:flex items-center justify-between py-6 ${CONTAINER}`} style={CONTAINER_STYLE}>
        <Link to="/" aria-label="Kolumn — home" className="flex items-center hover:opacity-90 transition-opacity">
          <KolumnLockup text={28} />
        </Link>
        <div className="flex items-center gap-6">
          {NAV_LINKS.map((link) => (
            <Link key={link.to} to={link.to} className={LINK}>{link.label}</Link>
          ))}
          {NAV_MENUS.map((menu) => (
            <NavMenu key={menu.label} menu={menu} />
          ))}
          <div className="flex items-center gap-3 ml-0.5">{authControls}</div>
        </div>
      </div>

      {/* Mobile bar — 72px */}
      <div className="flex sm:hidden items-center justify-between px-5 py-[18px]">
        <Link to="/" aria-label="Kolumn — home" className="flex items-center">
          <KolumnLockup text={28} />
        </Link>
        <button
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          aria-expanded={menuOpen}
          aria-controls="marketing-mobile-menu"
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          className="w-9 h-9 flex items-center justify-center rounded-lg text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] transition-colors cursor-pointer"
        >
          {menuOpen ? <X size={20} /> : <List size={20} />}
        </button>
      </div>

      {menuOpen && (
        <div
          id="marketing-mobile-menu"
          role="dialog"
          aria-label="Menu"
          className="sm:hidden fixed inset-x-0 top-[72px] bottom-0 z-50 bg-[var(--surface-page)] px-5 flex flex-col animate-dropdown"
        >
          <ul className="flex-1 overflow-y-auto">
            {NAV_LINKS.map((link) => (
              <li key={link.to} className="border-b border-[var(--border-subtle)]">
                <Link to={link.to} className="flex items-center h-14 text-[17px] text-[var(--text-primary)]">
                  {link.label}
                </Link>
              </li>
            ))}
            {NAV_MENUS.map((menu) => (
              <MobileAccordion key={menu.label} menu={menu} />
            ))}
            {!user && (
              <li className="border-b border-[var(--border-subtle)]">
                <a href={SIGN_IN.to} className="flex items-center h-14 text-[17px] text-[var(--text-primary)]">
                  {SIGN_IN.label}
                </a>
              </li>
            )}
          </ul>
          <div className="flex gap-3 py-4">
            {user ? (
              <Link to="/dashboard" className={`${PRIMARY} flex-1 h-11`}>Open Kolumn</Link>
            ) : (
              <>
                <a href={SIGN_IN.to} className={`${SECONDARY} flex-1 h-11`}>{SIGN_IN.label}</a>
                <Link to={PRIMARY_CTA.to} className={`${PRIMARY} flex-1 h-11`}>{PRIMARY_CTA.label}</Link>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  )
}
```

- [ ] **Step 5: Create `src/components/marketing/MarketingFooter.jsx`**

```jsx
import { Link } from 'react-router-dom'
import KolumnLockup from '../layout/KolumnLockup'
import { CONTACT_EMAIL, FOOTER_GROUPS, FOOTER_TAGLINE } from '../../content/marketing-nav'

// Chrome spec §3.2: ink footer, 80/48 padding, brand column (4/12) + link
// groups (2/12 each), mono 11px group headings, 13px links at 27px pitch,
// hairline bottom row. Light-on-ink colors use the theme-stable
// --text-on-ink / --border-on-ink tokens. No social row yet (handles are an
// open question); no theme control (marketing routes are light-only).

const CONTAINER = 'max-w-[90rem] mx-auto'
const CONTAINER_STYLE = { width: 'calc(100% - (2 * clamp(2rem, 1.43rem + 2.86vw, 4rem)))' }

function FooterLink({ link }) {
  const className = 'inline-block py-1 text-[13px] leading-[19px] text-[var(--text-on-ink)] hover:underline underline-offset-[3px] decoration-[var(--text-on-ink-muted)]'
  if (link.to.startsWith('/#') || link.to.startsWith('mailto:')) {
    return <a href={link.to} className={className}>{link.label}</a>
  }
  return <Link to={link.to} className={className}>{link.label}</Link>
}

export default function MarketingFooter() {
  return (
    <footer className="bg-[var(--color-ink)] pt-14 pb-10 sm:pt-20 sm:pb-12">
      <div className={CONTAINER} style={CONTAINER_STYLE}>
        <div className="grid grid-cols-2 gap-x-8 gap-y-12 sm:grid-cols-3 lg:grid-cols-12">
          <div className="col-span-2 sm:col-span-3 lg:col-span-4 flex flex-col">
            <KolumnLockup text={32} wordClassName="text-[var(--text-on-ink)]" />
            <p className="mt-3 text-sm text-[var(--text-on-ink-muted)]">{FOOTER_TAGLINE}</p>
          </div>
          {FOOTER_GROUPS.map((group) => (
            <div key={group.heading} className="lg:col-span-2">
              <h2 className="font-mono text-[11px] uppercase tracking-[0.06em] text-[var(--text-on-ink-muted)] mb-3">
                {group.heading}
              </h2>
              <ul className="flex flex-col">
                {group.links.map((link) => (
                  <li key={link.to}><FooterLink link={link} /></li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-12 pt-4 border-t border-[var(--border-on-ink)] flex items-center justify-between gap-4 min-h-14">
          <p className="font-mono text-[11px] leading-[17px] text-[var(--text-on-ink-muted)]">
            © {new Date().getFullYear()} Kolumn
          </p>
          <a href={`mailto:${CONTACT_EMAIL}`} className="font-mono text-[11px] text-[var(--text-on-ink-muted)] hover:text-[var(--text-on-ink)] transition-colors">
            {CONTACT_EMAIL}
          </a>
        </div>
      </div>
    </footer>
  )
}
```

- [ ] **Step 6: Run tests**

Run: `npx vitest run src/__tests__/MarketingChrome.test.jsx`
Expected: PASS. If the mobile test cannot find the toggle because both bars render in jsdom (no CSS), that is expected: jsdom ignores `hidden sm:flex`, both bars are in the DOM, and the queries above are scoped by role/name so they still resolve.

- [ ] **Step 7: Commit**

```bash
git add src/components/marketing/useMarketingUser.js src/components/marketing/MarketingNav.jsx src/components/marketing/MarketingFooter.jsx src/__tests__/MarketingChrome.test.jsx
git commit -m "feat(marketing): MarketingNav and MarketingFooter"
```

---

### Task 8: `MarketingLayout`, shared route elements, App wiring

**Files:**
- Create: `src/components/marketing/MarketingLayout.jsx`
- Create: `src/components/marketing/MarketingRoutes.jsx`
- Modify: `src/App.jsx` (imports + routes block)
- Test: `src/__tests__/MarketingLayout.test.jsx`

**Interfaces:**
- Consumes: Task 5 registry, Task 6 `applyHeadMeta`/`routeMeta`, Task 7 chrome, `applyTheme` from `src/utils/theme.js`.
- Produces: `MarketingLayout()` (layout route rendering `<Outlet />`), `marketingRouteElements()` → array of `<Route>` elements (keyed by path) to place inside `<Route element={<MarketingLayout />}>`.

- [ ] **Step 1: Write the failing test**

```jsx
// src/__tests__/MarketingLayout.test.jsx
import { describe, test, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'

vi.mock('../store/authStore', () => ({
  useAuthStore: Object.assign(() => null, { getState: () => ({ user: null }), subscribe: () => () => {} }),
}))

import MarketingLayout from '../components/marketing/MarketingLayout'
import { marketingRouteElements } from '../components/marketing/MarketingRoutes'

function renderAt(path) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route element={<MarketingLayout />}>{marketingRouteElements()}</Route>
      </Routes>
    </MemoryRouter>,
  )
}

describe('MarketingLayout', () => {
  test('renders skip link, nav, main, footer and the pricing page', async () => {
    renderAt('/pricing')
    expect(screen.getByRole('link', { name: /skip to content/i })).toHaveAttribute('href', '#main')
    expect(screen.getByRole('navigation', { name: /main/i })).toBeInTheDocument()
    expect(screen.getByRole('main')).toHaveAttribute('id', 'main')
    expect(screen.getByRole('contentinfo')).toBeInTheDocument()
    expect(await screen.findByRole('heading', { level: 1, name: 'Pricing' })).toBeInTheDocument()
  })

  test('applies the route head meta and pins light theme', async () => {
    document.head.innerHTML = '<title>Kolumn — Project Management</title><meta name="description" content="old">'
    document.documentElement.setAttribute('data-theme', 'dark')
    renderAt('/pricing')
    await screen.findByRole('heading', { level: 1, name: 'Pricing' })
    expect(document.title).toBe('Pricing — Kolumn')
    expect(document.querySelectorAll('title')).toHaveLength(1)
    expect(document.querySelector('link[rel="canonical"]').getAttribute('href')).toBe('https://kolumn.app/pricing')
    expect(document.documentElement.getAttribute('data-theme')).toBe('light')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/__tests__/MarketingLayout.test.jsx`
Expected: FAIL — modules not found.

- [ ] **Step 3: Create `src/components/marketing/MarketingRoutes.jsx`**

```jsx
import { Route } from 'react-router-dom'
import ErrorBoundary from '../ErrorBoundary'
import { MARKETING_ROUTES } from '../../content/marketing-routes'

// The <Route> children for the marketing layout route. Used by App.jsx
// (BrowserRouter) and src/prerender-entry.jsx (StaticRouter) so both render
// the identical tree — a requirement for hydration to match.
export function marketingRouteElements() {
  return MARKETING_ROUTES.map(({ path, Component }) => (
    <Route
      key={path}
      path={path}
      element={
        <ErrorBoundary>
          <Component />
        </ErrorBoundary>
      }
    />
  ))
}
```

- [ ] **Step 4: Create `src/components/marketing/MarketingLayout.jsx`**

```jsx
import { useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import MarketingNav from './MarketingNav'
import MarketingFooter from './MarketingFooter'
import { findMarketingRoute } from '../../content/marketing-routes'
import { applyHeadMeta, routeMeta } from '../../lib/headMeta'
import { applyTheme } from '../../utils/theme'

// Layout route for every prerendered marketing page. Owns the chrome, the
// skip link, head meta on client-side navigation (the prerender script
// writes the same tags at build time), and the light-only theme pin.
export default function MarketingLayout() {
  const { pathname } = useLocation()

  useEffect(() => {
    applyTheme('light')
  }, [])

  useEffect(() => {
    const route = findMarketingRoute(pathname)
    if (route) applyHeadMeta(document, routeMeta(route))
  }, [pathname])

  return (
    <div className="landing-font min-h-screen bg-[var(--surface-page)] flex flex-col">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[60] focus:px-3 focus:py-2 focus:rounded-lg focus:border focus:border-[var(--border-default)] focus:bg-[var(--surface-card)] focus:text-[var(--text-primary)]"
      >
        Skip to content
      </a>
      <MarketingNav />
      <main id="main" className="flex-1">
        <Outlet />
      </main>
      <MarketingFooter />
    </div>
  )
}
```

- [ ] **Step 5: Wire into `src/App.jsx`**

Add imports after the `Spinner` import:

```js
import MarketingLayout from './components/marketing/MarketingLayout'
import { marketingRouteElements } from './components/marketing/MarketingRoutes'
```

Inside `<Routes>`, directly after the `/` landing route line, add:

```jsx
          <Route element={<MarketingLayout />}>{marketingRouteElements()}</Route>
```

- [ ] **Step 6: Run tests and look**

Run: `npx vitest run src/__tests__/MarketingLayout.test.jsx && npm run lint`
Expected: PASS, lint clean.
Open `http://127.0.0.1:5173/pricing`: nav on top (84px, lockup left, Pricing / Sign in / Get started right), placeholder "Pricing" h1, ink footer with Product + Legal groups. Narrow the window under 640px: the List icon opens the overlay; body does not scroll behind it; X closes it. Tab from the address bar: the first focus is "Skip to content".

- [ ] **Step 7: Commit**

```bash
git add src/components/marketing/MarketingLayout.jsx src/components/marketing/MarketingRoutes.jsx src/App.jsx src/__tests__/MarketingLayout.test.jsx
git commit -m "feat(marketing): MarketingLayout route with head meta and shared route elements"
```

---

### Task 9: `CompareTable`

**Files:**
- Create: `src/components/marketing/CompareTable.jsx`
- Test: `src/__tests__/CompareTable.test.jsx`

**Interfaces:**
- Consumes: `PRICING.comparison` shape `{ columns: string[], note: string, rows: [{ label, cells: (boolean|string)[] }] }`.
- Produces: `CompareTable({ comparison })` default export.

- [ ] **Step 1: Write the failing test**

```jsx
// src/__tests__/CompareTable.test.jsx
import { describe, test, expect } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import CompareTable from '../components/marketing/CompareTable'

const comparison = {
  columns: ['Free', 'Pro'],
  note: 'A note.',
  rows: [
    { label: 'Boards', cells: ['Unlimited', 'Unlimited'] },
    { label: 'Moves cards', cells: [false, true] },
  ],
}

describe('CompareTable', () => {
  test('renders a table with column headers, value cells and yes/no glyphs', () => {
    render(<CompareTable comparison={comparison} />)
    const table = screen.getByRole('table', { name: /compare plans/i })
    expect(within(table).getByRole('columnheader', { name: 'Pro' })).toBeInTheDocument()
    expect(within(table).getAllByText('Unlimited')).toHaveLength(2)
    const row = within(table).getByRole('row', { name: /moves cards/i })
    expect(within(row).getByLabelText('Not included')).toBeInTheDocument()
    expect(within(row).getByLabelText('Included')).toBeInTheDocument()
    expect(screen.getByText('A note.')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/__tests__/CompareTable.test.jsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Create `src/components/marketing/CompareTable.jsx`**

```jsx
import { CheckCircle, Minus } from '@phosphor-icons/react'

// Pricing spec §3.5: sticky header, ~52px rows with hairlines, ink filled
// check for yes, faint minus for no, mono strings for values. A real <table>
// so screen readers get row/column semantics; the header sticks under the
// 84px nav (72px on mobile).

function Cell({ value }) {
  if (value === true) {
    return <CheckCircle size={18} weight="fill" aria-label="Included" className="inline-block text-[var(--text-primary)]" />
  }
  if (value === false) {
    return <Minus size={16} weight="light" aria-label="Not included" className="inline-block text-[var(--text-faint)]" />
  }
  return <span className="font-mono text-xs text-[var(--text-secondary)]">{value}</span>
}

export default function CompareTable({ comparison }) {
  const { columns, rows, note } = comparison
  return (
    <div className="max-w-6xl mx-auto">
      <table aria-label="Compare plans" className="w-full border-collapse">
        <thead className="sticky top-[72px] sm:top-[84px] z-10 bg-[var(--surface-page)]">
          <tr className="border-b border-[var(--border-default)]">
            <th scope="col" className="sr-only">Feature</th>
            {columns.map((name) => (
              <th
                key={name}
                scope="col"
                className="font-heading font-[425] text-base sm:text-lg text-[var(--text-primary)] text-center py-3 px-2 w-[18%] sm:w-[16%]"
              >
                {name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.label} className="border-b border-[var(--border-subtle)]">
              <th scope="row" className="text-left font-normal text-sm text-[var(--text-primary)] py-3 pr-4 min-h-[52px]">
                {row.label}
              </th>
              {row.cells.map((cell, i) => (
                <td key={columns[i]} className="text-center py-3 px-2 align-middle">
                  <Cell value={cell} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {note && <p className="mt-3 text-xs text-[var(--text-muted)]">{note}</p>}
    </div>
  )
}
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run src/__tests__/CompareTable.test.jsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/marketing/CompareTable.jsx src/__tests__/CompareTable.test.jsx
git commit -m "feat(marketing): CompareTable"
```

---

### Task 10: `PricingPage`

**Files:**
- Modify: `src/pages/marketing/PricingPage.jsx` (replace placeholder)
- Test: `src/__tests__/PricingPage.test.jsx`

**Interfaces:**
- Consumes: `PRICING`, `PlanGrid`, `CompareTable`, `FaqItem`, `Button`.
- Produces: the full `/pricing` page per pricing spec §3.

- [ ] **Step 1: Write the failing test**

```jsx
// src/__tests__/PricingPage.test.jsx
import { describe, test, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import PricingPage from '../pages/marketing/PricingPage'
import { PRICING } from '../content/pricing'

describe('PricingPage', () => {
  test('renders hero, plans, comparison, reassurance and every FAQ', () => {
    render(<MemoryRouter><PricingPage /></MemoryRouter>)
    expect(screen.getByRole('heading', { level: 1, name: 'Pricing' })).toBeInTheDocument()
    expect(screen.getByText(PRICING.hero.subhead)).toBeInTheDocument()
    for (const tier of PRICING.tiers) {
      expect(screen.getByRole('heading', { level: 3, name: tier.name })).toBeInTheDocument()
    }
    expect(screen.getByText(PRICING.footnote)).toBeInTheDocument()
    expect(screen.getByRole('table', { name: /compare plans/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: PRICING.reassurance.heading })).toBeInTheDocument()
    for (const item of PRICING.faq) {
      expect(screen.getByRole('button', { name: item.q })).toBeInTheDocument()
    }
  })

  test('no button or link is lime-filled', () => {
    render(<MemoryRouter><PricingPage /></MemoryRouter>)
    // Global constraint: lime is a state color, never a button fill.
    for (const el of document.querySelectorAll('a, button')) {
      expect(el.className, el.textContent).not.toMatch(/bg-\[var\(--(accent-lime|color-lime)/)
    }
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/__tests__/PricingPage.test.jsx`
Expected: FAIL — placeholder has no subhead, plans, table.

- [ ] **Step 3: Write `src/pages/marketing/PricingPage.jsx`**

```jsx
import { Link } from 'react-router-dom'
import Button from '../../components/ui/Button'
import PlanGrid from '../../components/marketing/PlanGrid'
import CompareTable from '../../components/marketing/CompareTable'
import FaqItem from '../../components/marketing/FaqItem'
import { PRICING } from '../../content/pricing'

// /pricing — pricing spec §3. Skeleton follows the source (name → cards →
// footnote → comparison → FAQ) with a reassurance strip added between the
// table and the FAQ. Static: no auth, no Supabase. Head meta comes from the
// route registry via MarketingLayout.

const SECTION = 'px-6 sm:px-10 max-w-6xl mx-auto'
const H2 = 'font-heading font-[425] text-3xl text-[var(--text-primary)] tracking-tight'

export default function PricingPage() {
  const { hero, footnote, comparison, reassurance, faq } = PRICING
  return (
    <>
      <section className={`${SECTION} pt-16 pb-10 text-center`}>
        <h1 className="font-heading font-[425] text-5xl sm:text-6xl text-[var(--text-primary)] tracking-tight leading-[1.08] mb-4">
          {hero.heading}
        </h1>
        <p className="text-lg text-[var(--text-secondary)] max-w-xl mx-auto leading-relaxed">{hero.subhead}</p>
      </section>

      <section className="px-6 sm:px-10 pb-20 max-w-[90rem] mx-auto">
        <PlanGrid />
        <p className="mt-8 text-center text-sm text-[var(--text-muted)] max-w-2xl mx-auto">{footnote}</p>
      </section>

      <section className={`${SECTION} py-20`}>
        <div className="text-center mb-12 max-w-2xl mx-auto">
          <h2 className={`${H2} mb-3`}>Compare plans</h2>
          <p className="text-base text-[var(--text-secondary)] leading-relaxed">
            Same boards on every plan. The plans differ in what the AI is allowed to do.
          </p>
        </div>
        <CompareTable comparison={comparison} />
      </section>

      <section className={`${SECTION} pb-20`}>
        <div className="max-w-3xl mx-auto rounded-xl border border-[var(--border-default)] bg-[var(--surface-raised)] p-6 flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex-1">
            <h2 className="text-lg font-medium text-[var(--text-primary)] mb-1">{reassurance.heading}</h2>
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{reassurance.body}</p>
          </div>
          <Button asChild size="md" className="shrink-0">
            <Link to={reassurance.cta.to}>{reassurance.cta.label}</Link>
          </Button>
        </div>
      </section>

      <section className={`${SECTION} pb-20`}>
        <div className="text-center mb-12">
          <h2 className={H2}>Frequently asked questions</h2>
        </div>
        <div className="flex flex-col gap-2 max-w-2xl mx-auto">
          {faq.map((item, i) => (
            <FaqItem key={item.q} question={item.q} answer={item.a} index={i} />
          ))}
        </div>
      </section>
    </>
  )
}
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run src/__tests__/PricingPage.test.jsx && npx vitest run && npm run lint`
Expected: PASS, lint clean. If the ink-CTA count test finds more than 2, check `PlanCard`'s Pro CTA (`bg-[var(--text-primary)]`) and the reassurance `Button` (`btn-primary-bg`) are the only two; the nav is not rendered in this test.

- [ ] **Step 5: Look at it at both widths**

With `npm run dev` running, capture both breakpoints using the crawl harness pattern (Chrome channel via playwright-core, installed in the scratchpad):

```bash
cd /private/tmp/claude-501/-Users-dulaxi-Projects-gambit-kanban/390717d5-9971-4e16-a339-d68c72d35203/scratchpad/crawl
node measure.mjs http://127.0.0.1:5173/pricing kolumn-pricing
```

Read `out/kolumn-pricing.png` and `out/kolumn-pricing-mobile.png`. Check against pricing spec §3: three cards on one row at 1440 with Pro highlighted and the badge top-right; sticky table header while scrolling the table; reassurance tile; FAQ rows open; footer ink with readable light text. At 390: cards stack, table rows keep three glyph columns, overlay menu works.

- [ ] **Step 6: Commit**

```bash
git add src/pages/marketing/PricingPage.jsx src/__tests__/PricingPage.test.jsx
git commit -m "feat(marketing): /pricing page"
```

---

### Task 11: Prerender helpers (`src/lib/prerender.js`)

**Files:**
- Create: `src/lib/prerender.js`
- Test: `src/__tests__/prerender.test.js`

**Interfaces:**
- Produces:
  - `stripManagedHeadTags(templateHtml) → string` — removes the static `<title>`, description, og:*, twitter:* tags from `index.html` so per-route tags are not duplicated.
  - `injectIntoTemplate(templateHtml, { head, body }) → string` — inserts `head` before `</head>` and replaces `<div id="root"></div>` with `body`; sets `data-prerendered` on `<html>`.
  - `buildSitemap(siteUrl, paths, lastmod) → string`
  - `buildRobots(siteUrl) → string`

- [ ] **Step 1: Write the failing test**

```js
// src/__tests__/prerender.test.js
import { describe, test, expect } from 'vitest'
import { stripManagedHeadTags, injectIntoTemplate, buildSitemap, buildRobots } from '../lib/prerender'

const template = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>Kolumn — Project Management</title>
    <meta name="description" content="A modern Kanban." />
    <meta property="og:type" content="website" />
    <meta property="og:title" content="Kolumn — Project Management" />
    <meta name="twitter:card" content="summary" />
    <link rel="icon" href="/favicon.ico" />
  </head>
  <body style="margin:0">
    <div id="root"></div>
    <script type="module" src="/assets/index.js"></script>
  </body>
</html>`

describe('stripManagedHeadTags', () => {
  test('removes title, description, og and twitter tags but keeps the rest', () => {
    const out = stripManagedHeadTags(template)
    expect(out).not.toMatch(/<title>/)
    expect(out).not.toMatch(/name="description"/)
    expect(out).not.toMatch(/property="og:/)
    expect(out).not.toMatch(/name="twitter:/)
    expect(out).toMatch(/charset="UTF-8"/)
    expect(out).toMatch(/rel="icon"/)
  })
})

describe('injectIntoTemplate', () => {
  test('inserts head tags, replaces the root div, marks html as prerendered', () => {
    const out = injectIntoTemplate(template, { head: '<title>Pricing — Kolumn</title>', body: '<div id="root"><h1>Pricing</h1></div>' })
    expect(out).toContain('<title>Pricing — Kolumn</title>\n  </head>')
    expect(out).toContain('<div id="root"><h1>Pricing</h1></div>')
    expect(out).not.toContain('<div id="root"></div>')
    expect(out).toContain('<html lang="en" data-prerendered>')
    expect(out).toContain('src="/assets/index.js"')
    expect(out.match(/<title>/g)).toHaveLength(1)
  })

  test('throws when the root div is missing', () => {
    expect(() => injectIntoTemplate('<html><head></head><body></body></html>', { head: '', body: 'x' })).toThrow(/root/)
  })
})

describe('sitemap and robots', () => {
  test('sitemap lists every path with the site url', () => {
    const xml = buildSitemap('https://kolumn.app', ['/', '/pricing'], '2026-09-02')
    expect(xml).toContain('<loc>https://kolumn.app/</loc>')
    expect(xml).toContain('<loc>https://kolumn.app/pricing</loc>')
    expect(xml).toContain('<lastmod>2026-09-02</lastmod>')
    expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true)
  })

  test('robots allows crawling public routes, disallows app routes, points at the sitemap', () => {
    const txt = buildRobots('https://kolumn.app')
    expect(txt).toContain('User-agent: *')
    expect(txt).toContain('Disallow: /dashboard')
    expect(txt).toContain('Disallow: /boards')
    expect(txt).toContain('Sitemap: https://kolumn.app/sitemap.xml')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/__tests__/prerender.test.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Create `src/lib/prerender.js`**

```js
// Pure string helpers for scripts/prerender.mjs. No DOM, no React — these
// run in Node after `vite build` and are unit-tested under Vitest.

const MANAGED_TAG_PATTERNS = [
  /^\s*<title>.*<\/title>\s*\n?/gm,
  /^\s*<meta name="description"[^>]*>\s*\n?/gm,
  /^\s*<meta property="og:[^"]*"[^>]*>\s*\n?/gm,
  /^\s*<meta name="twitter:[^"]*"[^>]*>\s*\n?/gm,
]

export function stripManagedHeadTags(templateHtml) {
  return MANAGED_TAG_PATTERNS.reduce((html, pattern) => html.replace(pattern, ''), templateHtml)
}

export function injectIntoTemplate(templateHtml, { head, body }) {
  const rootTag = '<div id="root"></div>'
  if (!templateHtml.includes(rootTag)) {
    throw new Error('prerender: template has no empty <div id="root"></div> to replace')
  }
  return stripManagedHeadTags(templateHtml)
    .replace('<html lang="en">', '<html lang="en" data-prerendered>')
    .replace('</head>', `    ${head}\n  </head>`)
    .replace(rootTag, body)
}

export function buildSitemap(siteUrl, paths, lastmod) {
  const urls = paths
    .map((p) => {
      const loc = p === '/' ? `${siteUrl}/` : `${siteUrl}${p}`
      return `  <url>\n    <loc>${loc}</loc>\n    <lastmod>${lastmod}</lastmod>\n  </url>`
    })
    .join('\n')
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`
}

// App shell routes are auth-gated and render nothing useful to a crawler.
const APP_PATHS = ['/dashboard', '/boards', '/chat', '/build', '/workspace', '/settings', '/plans', '/upgrade', '/sandbox']

export function buildRobots(siteUrl) {
  const disallow = APP_PATHS.map((p) => `Disallow: ${p}`).join('\n')
  return `User-agent: *\nAllow: /\n${disallow}\n\nSitemap: ${siteUrl}/sitemap.xml\n`
}
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run src/__tests__/prerender.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/prerender.js src/__tests__/prerender.test.js
git commit -m "build(prerender): template injection, sitemap and robots helpers"
```

---

### Task 12: SSR entry, prerender script, build wiring, hydration

**Files:**
- Create: `src/prerender-entry.jsx`
- Create: `scripts/prerender.mjs`
- Modify: `vite.config.js` (SSR-aware config)
- Modify: `package.json` scripts
- Modify: `src/main.jsx` (hydrate when prerendered)
- Test: `src/__tests__/prerenderEntry.test.jsx` (node environment)

**Interfaces:**
- Consumes: Task 8 `MarketingLayout` + `marketingRouteElements`, Task 5 registry, Task 6 `routeMeta`/`buildHeadTags`/`headTagsToHtml`, Task 11 helpers.
- Produces: `renderRoute(path) → Promise<string>` (HTML of `<div id="root">…</div>`), re-exports `MARKETING_ROUTES`, `SITE_URL`, `routeMeta`, `buildHeadTags`, `headTagsToHtml`, `injectIntoTemplate`, `buildSitemap`, `buildRobots` for the script. `npm run build` produces `dist/pricing/index.html`, `dist/sitemap.xml`, `dist/robots.txt`.

- [ ] **Step 1: Write the failing test**

```jsx
// @vitest-environment node
// src/__tests__/prerenderEntry.test.jsx
import { describe, test, expect } from 'vitest'
import { renderRoute } from '../prerender-entry'

describe('renderRoute', () => {
  test('renders /pricing to fully resolved static HTML, not a Suspense fallback', async () => {
    const html = await renderRoute('/pricing')
    expect(html.startsWith('<div id="root">')).toBe(true)
    expect(html).toContain('aria-label="Main"')
    expect(html).toMatch(/<h1[^>]*>Pricing<\/h1>/)
    expect(html).toContain('Compare plans')
    expect(html).toContain('Frequently asked questions')
    expect(html).toContain('<footer')
  })

  test('never pulls the env-validating auth path into the SSR graph', async () => {
    const html = await renderRoute('/pricing')
    expect(html).toContain('Get started')
    expect(html).not.toContain('Open Kolumn')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/__tests__/prerenderEntry.test.jsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Create `src/prerender-entry.jsx`**

```jsx
import { Suspense } from 'react'
import { StaticRouter } from 'react-router-dom'
import { Routes, Route } from 'react-router-dom'
import { prerender } from 'react-dom/static'
import MarketingLayout from './components/marketing/MarketingLayout'
import { marketingRouteElements } from './components/marketing/MarketingRoutes'

// Build-time renderer for marketing routes. `prerender` (React 19) waits for
// every lazy() route chunk and Suspense boundary to resolve before emitting,
// so the output is the final page, not a fallback. The tree below must match
// App.jsx's shape inside #root (Suspense → Routes → MarketingLayout → page)
// so hydrateRoot in main.jsx finds identical markup.
//
// Nothing imported here may reach src/lib/env.js (it throws without Supabase
// env vars); auth state in the chrome is loaded client-side after hydration.

export { MARKETING_ROUTES, SITE_URL } from './content/marketing-routes'
export { routeMeta, buildHeadTags, headTagsToHtml } from './lib/headMeta'
export { injectIntoTemplate, buildSitemap, buildRobots } from './lib/prerender'

async function streamToString(stream) {
  const reader = stream.getReader()
  const decoder = new TextDecoder()
  let out = ''
  for (;;) {
    const { value, done } = await reader.read()
    if (done) break
    out += decoder.decode(value, { stream: true })
  }
  return out + decoder.decode()
}

export async function renderRoute(path) {
  const { prelude } = await prerender(
    <div id="root">
      <StaticRouter location={path}>
        <Suspense fallback={null}>
          <Routes>
            <Route element={<MarketingLayout />}>{marketingRouteElements()}</Route>
          </Routes>
        </Suspense>
      </StaticRouter>
    </div>,
  )
  return streamToString(prelude)
}
```

- [ ] **Step 4: Run the entry test**

Run: `npx vitest run src/__tests__/prerenderEntry.test.jsx`
Expected: PASS. If `StaticRouter` is undefined, import it from `react-router` instead (`import { StaticRouter } from 'react-router'`) — react-router-dom v7 re-exports it, but confirm with `node -e "import('react-router-dom').then(m => console.log(typeof m.StaticRouter))"`. If `prerender` complains about `TextEncoder`, the test is running in jsdom — check the `@vitest-environment node` comment is the first line of the file.

- [ ] **Step 5: Create `scripts/prerender.mjs`**

```js
// Post-build: render every MARKETING_ROUTES entry into dist/<path>/index.html
// with its head tags, then write sitemap.xml and robots.txt.
// Runs after `vite build` (client) and `vite build --ssr` (dist-ssr).
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const DIST = 'dist'
const entry = await import('../dist-ssr/prerender-entry.js')
const { MARKETING_ROUTES, SITE_URL, renderRoute, routeMeta, buildHeadTags, headTagsToHtml, injectIntoTemplate, buildSitemap, buildRobots } = entry

const template = readFileSync(join(DIST, 'index.html'), 'utf8')
const lastmod = new Date().toISOString().slice(0, 10)

for (const route of MARKETING_ROUTES) {
  const body = await renderRoute(route.path)
  const head = headTagsToHtml(buildHeadTags(routeMeta(route)))
  const html = injectIntoTemplate(template, { head, body })
  const dir = join(DIST, route.path)
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, 'index.html'), html)
  console.log(`[prerender] ${route.path} → ${dir}/index.html (${html.length} bytes)`)
}

writeFileSync(join(DIST, 'sitemap.xml'), buildSitemap(SITE_URL, ['/', ...MARKETING_ROUTES.map((r) => r.path)], lastmod))
writeFileSync(join(DIST, 'robots.txt'), buildRobots(SITE_URL))
console.log(`[prerender] sitemap.xml (${MARKETING_ROUTES.length + 1} urls), robots.txt`)
```

- [ ] **Step 6: Make `vite.config.js` SSR-aware**

Change `export default defineConfig({ … })` to a function so the SSR build skips vendor chunking and emits a single ESM file:

```js
export default defineConfig(({ isSsrBuild }) => ({
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    host: '127.0.0.1',
  },
  build: {
    sourcemap: 'hidden',
    rollupOptions: isSsrBuild
      ? { output: { format: 'es', entryFileNames: 'prerender-entry.js', inlineDynamicImports: true } }
      : {
          output: {
            manualChunks(id) {
              return vendorChunkOf(id)
            },
          },
        },
    chunkSizeWarningLimit: 600,
  },
  test: {
    globals: true,
    include: ['src/**/*.{test,spec}.{js,jsx}'],
    environment: 'jsdom',
    setupFiles: ['./src/__tests__/setup.js'],
    css: false,
  },
}))
```

Keep the existing comments and the `VENDOR_CHUNKS` / `vendorChunkOf` code above it unchanged.

- [ ] **Step 7: Update `package.json` scripts**

```json
    "build": "vite build && npm run build:prerender",
    "build:prerender": "vite build --ssr src/prerender-entry.jsx --outDir dist-ssr && node scripts/prerender.mjs",
```

(`dist-ssr` is already in `.gitignore`.)

- [ ] **Step 8: Hydrate in `src/main.jsx`**

Change the import and the mount. Replace `import { createRoot } from 'react-dom/client'` with:

```js
import { createRoot, hydrateRoot } from 'react-dom/client'
```

Replace the mount call at the end of the file (currently lines 75–79):

```jsx
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
```

with:

```jsx
const rootEl = document.getElementById('root')
const app = (
  <StrictMode>
    <App />
  </StrictMode>
)
// Prerendered marketing pages ship their markup in #root — hydrate it so the
// static HTML becomes interactive without a blank-then-paint. Everything else
// (app shell, landing) mounts fresh.
if (document.documentElement.hasAttribute('data-prerendered') && rootEl.hasChildNodes()) {
  hydrateRoot(rootEl, app, {
    onRecoverableError(error) {
      console.warn('[hydrate] recovered', error)
    },
  })
} else {
  createRoot(rootEl).render(app)
}
```

Everything above the mount call (font imports, theme boot, Sentry, analytics) stays as it is.

- [ ] **Step 9: Build and inspect the output**

Run: `npm run build`
Expected: three phases succeed; the script logs `[prerender] /pricing → dist/pricing/index.html` and the sitemap line.

Then:

```bash
grep -c "<title>Pricing — Kolumn</title>" dist/pricing/index.html   # 1
grep -c "<title>" dist/pricing/index.html                              # 1
grep -o 'rel="canonical" href="[^"]*"' dist/pricing/index.html          # https://kolumn.app/pricing
grep -c 'data-kolumn-jsonld' dist/pricing/index.html                    # 2
grep -o '<h1[^>]*>Pricing</h1>' dist/pricing/index.html                 # present
cat dist/sitemap.xml; cat dist/robots.txt
```

If `vite build --ssr` fails resolving a package (e.g. a CommonJS-only dependency), add it to `ssr: { noExternal: ['<pkg>'] }` in the SSR branch of `vite.config.js` and rebuild.

- [ ] **Step 10: Serve the build the way Railway does and check hydration**

```bash
npx serve dist -s -l 4173 &
sleep 1
curl -s http://127.0.0.1:4173/pricing | grep -c '<h1[^>]*>Pricing</h1>'   # 1 — the prerendered file is served, not index.html
curl -s http://127.0.0.1:4173/sitemap.xml | head -3
curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1:4173/robots.txt   # 200
```

Open `http://127.0.0.1:4173/pricing` in a browser with DevTools console open: no hydration mismatch errors (a `[hydrate] recovered` warning means the SSR tree and `App.jsx` tree differ inside `#root`; compare `src/prerender-entry.jsx` with the `<Routes>` in `App.jsx`). Click a FAQ row: it expands (proves hydration attached handlers). Then stop the server: `kill %1`.

If `curl /pricing` returns the SPA `index.html` instead of the prerendered file, `serve`'s single-page rewrite is winning over the directory index. Fix it in `scripts/prerender.mjs` by writing `dist/pricing.html` (i.e. `join(DIST, `${route.path}.html`)`) instead of `dist/pricing/index.html`; `serve`'s default `cleanUrls` maps `/pricing` to `pricing.html` before the SPA fallback runs. Re-run the two `curl` checks.

- [ ] **Step 11: Run everything**

Run: `npx vitest run && npm run lint`
Expected: all green.

- [ ] **Step 12: Commit**

```bash
git add src/prerender-entry.jsx scripts/prerender.mjs vite.config.js package.json src/main.jsx src/__tests__/prerenderEntry.test.jsx
git commit -m "build(prerender): static HTML for marketing routes, sitemap and robots; hydrate on load"
```

---

### Task 13: Documentation and handoff

**Files:**
- Modify: `CLAUDE.md` (Architecture tree + Commands)
- Modify: `docs/superpowers/specs/2026-09-02-marketing-site-design.md` (status line)

- [ ] **Step 1: Document the marketing layer in `CLAUDE.md`**

In the Architecture tree, under `components/`, add:

```
│   ├── marketing/                 # Public marketing shell: MarketingLayout (nav/footer/head meta), FaqItem, PlanGrid, CompareTable
```

Under `pages/`, add:

```
│   ├── marketing/PricingPage.jsx  # /pricing — prerendered; content from src/content/pricing.js
```

Add a top-level entry after `utils/`:

```
├── content/                        # Plain-data content: marketing-routes.js (registry → routes, head meta, sitemap), marketing-nav.js, pricing.js
├── prerender-entry.jsx             # SSR entry used by scripts/prerender.mjs (react-dom/static)
```

In Commands, after `npm run build`, add:

```bash
npm run build:prerender   # SSR bundle + dist/<route>/index.html + sitemap.xml + robots.txt (also runs inside `npm run build`)
```

Add one paragraph under Conventions:

> **Marketing pages.** Every public marketing route is an entry in `src/content/marketing-routes.js` (path, title, description, JSON-LD, lazy component). The registry drives routing, head tags, the nav dead-link test, the sitemap and prerendering. Nav/footer links live in `src/content/marketing-nav.js` and may only point at registered routes. Pricing numbers live only in `src/content/pricing.js`; `tier.ts`'s free limit is pinned to it by test.

- [ ] **Step 2: Update the design doc status**

Change the status line in `docs/superpowers/specs/2026-09-02-marketing-site-design.md` to `**Status:** Phase 1 specs done · Phase 2 foundation + pricing shipped (plan: docs/superpowers/plans/2026-09-02-marketing-foundation-pricing.md)`.

- [ ] **Step 3: Commit**

```bash
git add CLAUDE.md docs/superpowers/specs/2026-09-02-marketing-site-design.md
git commit -m "docs: marketing layer, content registry and prerender build"
```

---

## Follow-on plans (not part of this one)

Each adds routes to `MARKETING_ROUTES`, links to `marketing-nav.js`, and its own content files; the shell, head meta, sitemap and prerender need no changes.

1. **Product pages** — `/features`, `/features/pill`, `/features/chat`, `/solutions` + 8 verticals (adds the Solutions nav menu), `/templates`, `/connectors`. Specs: `features.md`, `feature-page.md`, `solutions.md`, `solution-page.md`, `templates.md`, `connectors.md`. Needs `DemoSlider` lifted out of `LandingPage.jsx`.
2. **Content pages** — markdown loader (`src/lib/content.js` with `import.meta.glob`), `Prose` component, `/tutorials`, `/blog`, `/changelog`, `/customers`, `/support`, `/status` (adds the Resources nav menu). Specs: `tutorials.md`, `blog.md`, `changelog.md`, `customers.md`, `support.md`, `status.md`.
3. **Company + legal** — `/about`, `/careers`, `/security`, `/legal/*` template with redirects from `/terms` and `/privacy`, usage policy, responsible disclosure, privacy choices (blocked on a PostHog opt-out). Specs: `about.md`, `careers.md`, `security.md`, `legal-template.md` and the five legal outlines.

## Assumptions carried from open questions

- Canonical domain `https://kolumn.app`.
- Team plan ships as "Coming soon" with a `mailto:hello@kolumn.app` "Get notified" CTA; the in-app picker disables Team.
- Pro CTA goes to plain `/onboarding` (no `?plan=pro` handling exists).
- Pro yearly price stays in the caption; no billing toggle.
- No social links, no OG image, no footer theme control until decided.
- Legal docs stay at `/terms` and `/privacy` for now (the legal plan moves them).
