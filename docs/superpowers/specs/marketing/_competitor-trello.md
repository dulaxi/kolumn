# Trello content strategy audit (for Kolumn marketing planning)

Researched 2026-09-03/04 by crawling `trello.com` directly (sitemap, robots.txt,
nav/footer link extraction, and rendered screenshots of representative pages via
the `measure.mjs` harness). Kolumn's own page inventory is in
`docs/superpowers/specs/marketing/_KOLUMN-BRIEF.md` — read that first.

**Method note on counts.** Trello's declared sitemap
(`https://a594014.sitemaphosting7.com/4704043/sitemap_4704043.xml`, found via
`robots.txt`) is thin — only 112 URLs, almost entirely `power-ups/*` and
`templates/*`. It is not a complete site index. `trello.com/sitemap.xml` itself
just serves the SPA shell with a `noindex` meta tag. The real breadth of the
site was reconstructed from nav/footer link extraction across ~15 pages plus
the two client-rendered catalog pages (`/templates`, `/power-ups`), which are
React-rendered and don't expose a total count in the static HTML. Where a count
is a hard number I crawled or counted, it's stated plainly. Where it's a figure
Trello states in their own copy ("150+ Power-Ups") or an order-of-magnitude
estimate, it's flagged as such. I did not attempt to enumerate the full
template catalog (community-submitted, likely in the thousands) or the full
Atlassian blog archive (paginated, off-domain) — sampling was intelligent, not
exhaustive, per the task brief.

## 1. Taxonomy with counts

| Content type | Count (discovered) | Example URL |
|---|---|---|
| Power-Ups (integrations) directory | 150+ per Trello's own copy; 9 categories + Featured + "Made by Trello"; 67 individual power-up URLs found in the partial sitemap | `trello.com/power-ups/586be36326cc4c7e9f70beb3/jira` |
| Template gallery | 14 categories (Business, Design, Education, Engineering, Marketing, HR & Operations, Personal, Productivity, Product management, Project management, Remote work, Sales, Support, Team management) + Featured; catalog size not countable from static HTML but is large (community-submitted; 42 individual template URLs surfaced in the partial sitemap alone) | `trello.com/templates/project-management/eisenhower-matrix-task-board-DZVysUiF` |
| "Teams" solution verticals | Hub + 11 verticals (design, engineering, humanresources, marketing, personal-productivity, product, remote-team-management, sales, startups, support, team-management) | `trello.com/teams/marketing` |
| "Use-cases" verticals | Hub + 3 verticals (project-management, resource-hub, task-management) | `trello.com/use-cases/task-management` |
| Guide / tutorial ("chapters") | Hub + 10 chapters (trello-101, create-project, onboard-team, integrate-apps, powerful-collaboration-features, activate-views, automate-anything, permissions-controls, tips-tricks, remote-work) | `trello.com/guide/trello-101` |
| Customer stories | Hub + 9 discovered in nav (burgerfi, desk-plants, dosomethingorg, instinct-dog-training, mccorvey-sheet-metal, palace-law, scan2cad, swagup, unicef); localized into 10 languages | `trello.com/customers/unicef` |
| Blog | Off-domain: `atlassian.com/blog/app/trello` (an Atlassian company-blog category, not a Trello-owned property). Paginated ("Next Page"), dozens+ posts, exact count not extracted (client-rendered archive) | `atlassian.com/blog/app/trello` |
| Single-feature pages | ~7: `/platforms` (native apps), `/integrations`, `/butler-automation`, `/planner`, `/inbox`, `/mcp` (AI/MCP server), `/power-ups` itself as a feature pitch | `trello.com/mcp` |
| Pricing-tier pages | 4: `/pricing` (comparison table) + `/standard`, `/premium`, `/enterprise` (one landing page per tier) | `trello.com/premium` |
| Product overview | 1: `/tour` ("What is Trello") | `trello.com/tour` |
| Webinars | 1 hub, on-demand listing | `trello.com/webinars` |
| Company / trust | `/about`, `/security` (thin — real security/trust content lives on Atlassian's shared trust center, not trello.com), `/contact`; careers is fully off-domain (`atlassian.com/company/careers/trello`) | `trello.com/about` |
| Comparison pages ("X vs Y") | **None found.** Guessed URLs (`/vs-asana`, `/compare`, `/alternatives`) all resolve to the generic SPA shell, same as a nonexistent path — Trello does not appear to run dedicated competitor-comparison pages on trello.com | — |
| Support / help center | Off-domain (`support.atlassian.com/trello`), not part of trello.com's own content | — |
| Status page | Off-domain (Atlassian's shared statuspage), not a trello.com content asset | — |
| Legal | Shared with Atlassian (`atlassian.com/legal/*`), not Trello-specific pages | — |

Ordering by rough content investment (not URL count, since the gallery counts
aren't fully knowable): **Templates gallery > Power-Ups directory > Teams/Use-cases
verticals (14 combined) > Blog (off-domain, high volume, low per-post effort) >
Guide (10 chapters, one-time asset) > Customer stories (9, clearly legacy/frozen)
> single-feature pages > pricing-tier pages.**

## 2. Page anatomies worth copying

### A. Solution vertical (`/teams/<x>` and `/use-cases/<x>` — same template, two taxonomies)

Both `/teams/*` (11 pages, organized by *who you are*: marketing, engineering,
sales...) and `/use-cases/*` (3 pages, organized by *what you're doing*: task
management, project management, resource hub) render off the **same page
template**. That's the reusable trick: one component, two navigation entry
points, so the same underlying content earns two different search intents
("trello for marketing teams" vs. "task management software") without doubling
production cost.

Section order (`/teams/marketing`, ~6,400px / long scroll):
1. Breadcrumb ("< Go back to Team Solutions") + H1 ("Trello For Marketing Teams") + one-paragraph pitch + primary signup CTA + a social-proof line ("Join over 2,000,000 teams worldwide...")
2. H2 generic value section ("Your team's workspace for marketing success") + link to the matching template category
3. H2 single feature spotlight (Calendar View) with a "Learn more about Trello views" link
4. H2 second feature spotlight (Power-Ups) with "Explore 150+ Power-Ups" link
5. H2 third feature spotlight (Automation/Butler) with "Let the robots do the work" link
6. H2 "Resources to up your [X] game" — 2-3 cards linking to blog posts / an ebook, framed as "further reading" for this specific audience
7. Mid-page pricing nudge (free trial callout)
8. **5 short customer pull-quotes** in a row — one line of testimonial + name/role/company, each linking to a fuller case study
9. Full pricing comparison table (Free / Standard / Premium / Enterprise) repeated inline
10. Final CTA banner

Each vertical is maybe 900-1,100 words of unique copy; everything else (nav
mega-menu, resources rail, pricing table, footer) is shared chrome. The unique
part per vertical is really just: H1/subhead, 3 feature-spotlight blurbs, and
which 2-3 blog posts / customer quotes get pulled in. That's a cheap page to
produce once the template exists — which is exactly why Trello has 14 of them.

### B. Template gallery (three-tier: hub → category → detail)

**Hub (`/templates`):** left rail lists 14 categories + "Featured." Body:
H1 + one-paragraph pitch → "Featured categories" (7 illustrated tiles) →
"New and notable templates" (3-card carousel) → then one `H2 "[Category] —
More templates for [Category]"` block per category, each showing a row of
template cards, interleaved with a single mid-page "What's Trello?" signup
nudge.

**Category (`/templates/<category>`):** breadcrumb, H1, then a responsive
grid of template cards. Each **card** carries: cover image, creator avatar +
name/title (often a real named person or a recognizable org — "by UNICEF,"
"by UK Cabinet Office, Project Trowsdale"), one-line description, and two
trust signals: a **copy count** and a **view count** (e.g. "46.9K copies /
311.9K views"). Below the grid, one SEO paragraph describing the category.

**Detail (`/templates/<category>/<name>-<id>`):** breadcrumb → H1 (template
name) → creator byline + copy/view counters → "Share" + primary "Use
template" CTA (routes to signup) → **"About this template"**: 100-300 words
that often *teach the underlying methodology* (the Eisenhower Matrix example
explains the four quadrants of the matrix itself, not just "here's a board"
— genuinely definitional content that can rank for the matrix name alone,
independent of Trello) → an embedded **live, publicly viewable preview of the
actual board** (`/b/<id>`, no login required) → "Power-Ups" compatibility
section → "Related templates."

Why this earns traffic: every template detail page targets a long-tail
"[thing] + template" query (the methodology name, the workflow name, the
company name), is attributed to a real creator (UGC credibility + the
creator has incentive to share it), shows social proof via visible copy/view
counts, and lets the visitor *see the real product* before signing up. It is
simultaneously an SEO asset, a trust asset, and a zero-friction product demo.

### C. Guide / tutorial ("chapters")

`/guide` is a hub (H1 "Getting started with Trello," short intro) linking to
10 chapters, each its own URL (`/guide/trello-101`, `/guide/create-project`,
etc.), each with in-page jump-anchors (`#what-is-a-board`) and a persistent
"next chapter" link forming a linear course. Content is plainly definitional
("What is a board? / What is a list? / What is a card?") with numbered
lettered diagram references (A/B/C/D), a "PRO TIP" callout, and ends with a
"Try Premium free" upsell + "Next chapter" CTA. This is the page type built
to rank for "what is Trello," "how does Trello work," "Trello tutorial" —
top-of-funnel, definitional, and cheap to produce once (it hasn't
meaningfully changed in years; it's an evergreen asset, not a content
treadmill).

### D. Power-Ups / integrations directory (`/power-ups`)

Same shape as the template gallery: left-rail categories (9: Analytics &
reporting, Automation, Board utilities, Communication & collaboration,
Developer tools, File management, HR & operations, IT & project management,
Marketing & social media, Product & design, Sales & support) + "Featured" +
"Made by Trello." Each card: icon, name, one-line pitch, install count
("10,000+"), "Add" CTA. Individual power-up detail pages exist per the
sitemap (`/power-ups/<id>/<slug>`). This is the same "many small,
individually-rankable cards with social-proof counters" pattern as templates,
applied to integrations instead.

## 3. The template gallery in depth

This is the asset most worth studying closely since Kolumn already has a
12-entry template gallery and Trello's is an order of magnitude more
developed. Key structural differences from what a 12-template gallery can do:

- **Three-tier depth**, not two. Kolumn's brief implies hub + gallery; Trello
  runs hub → category → individual detail page. The individual detail page is
  where the SEO value concentrates (long-tail, specific query), not the
  category page.
- **Attribution as a content strategy.** Nearly every template is credited to
  a named creator — sometimes Trello's own team, often a real external person
  or company (a law firm, UNICEF, a UK government office). This does three
  things at once: signals the template is battle-tested, gives the creator a
  reason to link back to it, and diversifies the copy so it doesn't all read
  like marketing.
- **Visible usage counters** (copies, views) on every card and every detail
  page. This is a flywheel: popular templates surface first, which makes them
  more popular. Kolumn, with zero usage history, cannot honestly show this —
  see gap list.
- **Live board preview embedded in the detail page**, viewable without
  signup. This is the single most copyable idea here and doesn't require any
  fabricated social proof — it just requires the product to support a public,
  read-only board view.
- **"About this template" is often genuinely instructional**, not just
  descriptive. The best examples explain the *methodology* (what an
  Eisenhower Matrix is, how RACI works, etc.), which is content that can rank
  independent of Trello's brand at all.
- Categories are a mix of **who** (Marketing, Sales, Support, Engineering)
  and **what** (Project management, Productivity, Remote work) — deliberately
  overlapping taxonomies so the same template can be tagged into multiple
  entry points.

## 4. Gap list — what Trello has that Kolumn doesn't, and whether Kolumn should build it

| Trello content type | Fits Kolumn now? | Why |
|---|---|---|
| **Template detail pages with live board preview** | **Yes — highest-value gap.** | Kolumn already has 12 templates and real boards. A public, read-only preview of each template board plus a short "about this template" explainer is honest, cheap, and directly reuses shipped functionality. Don't invent copy/view counters (see below), but the live-preview idea is real and buildable. |
| **Solution verticals with a shared template (teams-by-role + use-cases-by-job)** | **Yes, but scoped down.** | Kolumn's brief already plans 8 solution verticals — Trello's pattern of reusing one template across two taxonomies (by-role and by-job) is a good structural model to borrow for *within* that single hub, not a reason to double the vertical count. Keep the section order (spotlight 2-3 real features, not fabricated ones) but drop anything requiring customer quotes or usage stats Kolumn doesn't have. |
| **Guide / tutorial chapters** | **Yes.** | Kolumn's tutorials page type is the direct equivalent. Trello's format (linear chapters, jump anchors, "what is a board/column/card" definitional framing) is exactly the right shape for a young product that needs to explain itself, and requires no invented credibility — it's just documentation with SEO framing. |
| **Power-Ups / integrations directory (150+, categorized)** | **No, not yet — but the page shape is right.** | Kolumn's brief explicitly says Slack/Gmail integrations are "not shipped" and the connectors page should describe capture-from-anywhere as a *story*, not claim live OAuth integrations. A directory of 150+ installable power-ups would be a fabrication for a product with zero live integrations. Build the connectors page Trello's brief already scopes, but as a much smaller, honest page — not a gallery implying an ecosystem that doesn't exist. |
| **Customer stories / case studies** | **No — premature.** | Trello's own case-study asset (the UNICEF piece) is closer to long-form journalism than marketing copy, and even Trello has clearly stopped investing here (only ~9 discoverable, unchanged for years). Kolumn's brief says "no customers" — there is nothing to write. Faking or compositing a case study would be dishonest. Revisit once there are 2-3 real users willing to be named. |
| **Usage-count social proof ("46.9K copies," "10,000+ installs," "2,000,000 teams")** | **No.** | Every one of these numbers on Trello's site is either a real aggregate (Trello has ~50M+ registered users historically) or a real per-template counter accumulated over a decade. Kolumn has none of this. Any equivalent number would be invented. Ship templates without counters; add them honestly once real usage exists. |
| **Comparison pages ("Trello vs. X")** | **N/A — Trello doesn't do this either.** | Notable: despite being the market's most entrenched player, Trello runs *no* dedicated comparison pages on trello.com. This suggests comparison content is either not worth it for an incumbent, or Atlassian runs it elsewhere and I didn't find it. Either way, it's not something to copy from Trello specifically — if Kolumn wants comparison pages, that's an independent decision, not one this audit supports. |
| **Webinars** | **No.** | Requires a marketing/content team producing recurring live events. Not a fit for a young product's content strategy. |
| **Blog hosted as a company-wide, off-domain property (Atlassian's shared blog)** | **N/A — different structural situation.** | Trello folded its once-standalone blog into Atlassian's corporate blog after the acquisition. Kolumn has no parent company to fold into; its blog should stay on-domain. The lesson to take is about *cadence and breadth* (many short, tightly-scoped posts, paginated archive), not the off-domain hosting choice. |
| **MCP / AI-tool connector page** | **No, not yet.** | Trello's `/mcp` page documents a real, shipped MCP server with FAQ content about token usage, destructive-action limits, and OAuth. Kolumn has no MCP server. This is a good page *shape* to reuse the day Kolumn ships one — premature now. |
| **Dedicated pricing-tier pages (`/standard`, `/premium`, `/enterprise`)** | **Partially.** | Kolumn only has two real tiers (Free, Pro) plus an undefined Team tier (brief says "don't invent" pricing for it). A single `/pricing` page is right-sized; don't split into per-tier pages until Team pricing is real, or the Team page becomes exactly the kind of premature claim the brief warns against. |

## 5. What not to copy, and why

- **Fabricated or borrowed social proof.** The single biggest trap here.
  Trello's entire content operation is saturated with numbers (copy counts,
  view counts, "2,000,000 teams," install counts) accumulated over 15+ years.
  Copying the *pattern* without the *numbers* — i.e., writing "Trusted by
  thousands of teams" with no real thousands — is worse than omitting the
  section, and directly conflicts with the brief's "no customers" ground
  truth. Ship without these modules; add them only when real.
- **The long-form customer case study.** Expensive to produce (the UNICEF
  piece is essentially a magazine feature), requires a cooperating named
  customer, and Trello itself has stopped making new ones. Not a good use of
  effort for a pre-launch product.
- **A 150+ entry integrations directory.** This is Trello's biggest single
  content asset by page count, but it exists because Trello has an actual
  Power-Up platform with a decade of third-party developers. Kolumn's
  connectors story today is "paste a thread / drop in notes" — building a
  gallery of fake or aspirational integrations would misrepresent the
  product, which the brief explicitly forbids ("do NOT claim as live").
- **Splitting one vertical taxonomy into two parallel ones (teams + use-cases).**
  Clever for an incumbent maximizing search surface area, but for a product
  with 8 planned verticals, doubling to 16 pages of thin, overlapping copy
  would dilute rather than strengthen the site. One well-built taxonomy beats
  two half-built ones.
- **Webinars and off-domain blog migration.** Both are organizational
  artifacts of Trello's scale/parent company, not content strategies to
  emulate structurally.
- **The `/mcp`-style deep feature page for anything not yet shipped.** The
  page shape (FAQ-driven, addresses trust/security objections directly) is
  genuinely good and worth reusing — but only once there's a real feature
  behind it. Building it now to describe the AI pill/chat would be fine in
  principle (those *are* shipped) but building one implying a Trello-style
  MCP/agent ecosystem would not be.

## Top-line recommendation

Kolumn's highest-value, honestly-achievable borrows from Trello, in order:
1. Give the existing 12 templates real detail pages with a live read-only
   board preview and a short "about this template" explainer (no fabricated
   counters).
2. Reuse Trello's solution-vertical page template (hero, 2-3 real feature
   spotlights, cross-links to templates and tutorials, single CTA) for the
   already-planned 8 verticals — skip customer quotes and pricing-tier
   duplication.
3. Build the tutorials page type as linear, chaptered, definitional guide
   content ("what is a board/column/card") — cheap, evergreen, honest.
4. Keep the connectors page small and story-driven, not a gallery — per the
   brief's explicit instruction not to claim live integrations.
5. Do not build customer stories, usage-count social proof, webinars, or an
   integrations directory until the underlying reality (customers, usage,
   integrations) exists to support them.
