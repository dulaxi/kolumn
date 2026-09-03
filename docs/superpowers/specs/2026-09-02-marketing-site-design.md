# Marketing site (SEO pages) — design

**Date:** 2026-09-02 · **Branch:** development · **Status:** Phase 1 specs done · Phase 2 foundation + pricing shipped (plan: docs/superpowers/plans/2026-09-02-marketing-foundation-pricing.md)

## Goal
Give Kolumn a full public marketing surface modelled on the structure and proportions of
claude.com / anthropic.com, so that every page a visitor or search engine expects (pricing, features,
use cases, templates, stories, help, legal) exists, is indexable, and looks like one product.

## Scope (agreed cut)
**Tier 1 — build:** Pricing · Features hub + feature pages · Solutions (Startups, Small business,
Nonprofits, Students/Higher-ed, Legal, Healthcare, Customer support, Engineering) · Templates ·
Connectors ("capture from anywhere") · Customer stories · Tutorials · Blog · Changelog · About ·
Careers · Security · Status · Support · Terms · Privacy · Usage policy · Responsible disclosure ·
Privacy choices.

**Tier 2 — held until the feature ships:** Board Builder page, Workspaces/Team page, Download app,
Community, Partner network, Events.

**Tier 3 — no analogue, skipped:** Models, Platform/API, Government, Regional compliance, Research,
RSP, Transparency, K-12 terms/DPA, Powered by Claude, Service partners.

## Phase 1 — crawl + spec (this session)
- One measurement harness (Playwright, 1440w + 390w full-page screenshots, computed-style metrics,
  text outline) so every page is measured the same way.
- 11 parallel agents grouped **by template family**, not by link, each writing specs to
  `docs/superpowers/specs/marketing/<slug>.md` from `_TEMPLATE.md`, grounded by `_KOLUMN-BRIEF.md`.
- Output of Phase 1 is a reviewable set of specs. No app code changes.

| Agent | Source pages | Specs |
|---|---|---|
| chrome | claude.com home | `_chrome.md` (nav, footer, type scale, grid, palette roles, footer link map) |
| pricing | /pricing | `pricing.md` |
| features | features hub + 2 feature pages | `features.md`, `feature-page.md` |
| solutions | 3 solutions pages | `solution-page.md`, `solutions.md` (copy for 8 verticals) |
| templates | /marketplace, /plugins | `templates.md` |
| connectors | /connectors | `connectors.md` |
| stories | /customers | `customers.md` |
| learn | tutorials, blog, news | `tutorials.md`, `blog.md`, `changelog.md` |
| company | company, careers, security | `about.md`, `careers.md`, `security.md` |
| help | status, support, availability | `status.md`, `support.md` |
| legal | 5 legal pages | `legal-template.md` + one outline per doc |

## Phase 2 — build (separate plan, after spec review)
- Marketing routes live in `src/pages/marketing/`, share app tokens + `src/components/ui` primitives,
  and a new shared `MarketingLayout` (nav + footer from `_chrome.md`).
- **Prerender at build**: a Vite prerender step renders each marketing route to static HTML in `dist/`
  with per-route `<title>`/meta/canonical/OG, plus `sitemap.xml` and `robots.txt`. Railway + `serve`
  stays as is. (Rejected: separate Astro site — second build/deploy and demo porting; meta-only —
  client-rendered pages index unreliably.)
- Content in plain data (`src/content/`), not Supabase, except Status.

## Rules for every page
- Structure and proportions may follow the source; **copy is original**. No verbatim Anthropic text.
- No feature or number outside `_KOLUMN-BRIEF.md`. Unknowns become "Open questions."
- Design-system coherency rules from CLAUDE.md apply unchanged.
