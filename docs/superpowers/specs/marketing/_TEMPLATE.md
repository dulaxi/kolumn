# <Page name> — marketing page spec

> Source crawled: <url(s)> on 2026-09-02. Screenshots + metrics in the crawl harness `out/` dir.
> Kolumn route: `/<slug>` · Priority: <P1|P2> · Template family: <chrome|hub|feature|solution|gallery|article|legal|utility>

## 1. Purpose and SEO target
- **Job of this page** (one sentence).
- **Primary keyword / query intent** and 2–4 secondary phrases.
- **`<title>`** (≤60 chars) · **meta description** (≤155 chars) · **OG title/description**.
- **Structured data** to emit (e.g. `Product`, `FAQPage`, `Organization`, `BreadcrumbList`) — only what the source page actually used or what clearly applies.
- **Internal links in / out** (which Kolumn pages link here, where this page links).

## 2. Source page anatomy (what Anthropic does)
Ordered list of sections, top to bottom. For each:
`## N. <section name>` — height ≈ Npx at 1440w · container max-width · vertical padding · background · grid (cols/gap) · heading level + size/weight/line-height · body size · CTA count + style. One line on *why* the section exists.

Then the shared numbers:
- **Type scale** observed (h1/h2/h3/body/caption: size / lh / weight / font).
- **Container + rhythm**: max-width, horizontal padding, typical section padding, card radius, border style, shadow.
- **Palette roles** (bg, surface, text, muted, accent) — as roles, not hex.
- **Mobile (390w)**: what collapses, what reorders, what is hidden.
- **Nav / footer**: only if this page deviates from the shared chrome spec.

## 3. Kolumn version
Same ordered section list, mapped. For each section: **keep / adapt / drop**, and if kept:
- Kolumn heading + subhead **copy, written out** (final-draft quality, Kolumn voice — see `_KOLUMN-BRIEF.md`).
- Body copy or bullet list, written out.
- CTA label + destination.
- Which Kolumn primitive / existing component renders it (`Button`, `InlineNotice`, `KolumnLockup`, landing `FaqItem`, etc.) and any new component this page needs.
- Design tokens to use (`--surface-*`, `--text-*`, `--font-heading`, etc.). Never hex.

Proportions to keep from the source (explicit px/rem for container, section padding, type sizes, card radius) and proportions to change to fit Kolumn's tokens (8/10-12px radii, 1px borders, Inter + Clash Grotesk).

## 4. Data and content sources
Where the page's content comes from: hardcoded constants, a JSON/MD file in `src/content/`, Supabase, or external (status provider). Note anything that must stay in sync with app code (tier limits, prices, feature list).

## 5. Open questions
Things the crawl could not settle. Keep to ≤5 bullets.
