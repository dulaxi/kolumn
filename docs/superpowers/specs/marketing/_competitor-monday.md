# monday.com content strategy audit (for Kolumn marketing planning)

Researched 2026-09-03 from `monday.com`'s sitemap index
(`monday.com/sitemap_index.xml`, six nested sitemaps: main, SEO, marketplace,
blog, presents, and the support-center subdomain) plus rendered samples of
representative pages via the `measure.mjs` harness. Kolumn's own page
inventory is in `docs/superpowers/specs/marketing/_KOLUMN-BRIEF.md` — read
that first. See also `_competitor-trello.md` for the sibling audit; monday.com
is a much larger, much more aggressive operation than Trello and the two are
useful in contrast — Trello runs almost no programmatic SEO, monday.com runs
an enormous amount of it.

**Method note on counts.** Sitemap URL counts are exact (`grep -c '<loc>'` on
each downloaded sitemap file). `/lang/*` (192 URLs) are locale-duplicated
copies of other pages, not distinct content, and are excluded from the
headline taxonomy. `support.monday.com` (2,727 URLs) is the help center,
itself multiplied ~6x by locale (`/hc/de`, `/hc/en-us`, `/hc/es`...); I did
not crawl it in depth since Kolumn's brief treats support as its own page
type, not a content-marketing surface. `/presents/*` is a video/documentary
microsite (monday.com's branded-content video series) — noted but not
sampled; it requires a production budget no small product has and isn't
instructive for Kolumn.

## 1. Taxonomy with counts

| Content type | Count | Example URL |
|---|---|---|
| Blog posts | ~4,066 (5 WordPress post-sitemaps) + 18 category hubs + 10 tag hubs + 60 author pages + 8 static blog pages | `monday.com/blog/reviews/trello-vs-monday-com-which-tool-should-you-choose/` |
| Marketplace app/integration listings | ~1,005 individual listing pages (+ category index pages) | `monday.com/marketplace/listing/58/asana` |
| Support/help-center articles | 2,727 URLs (locale-multiplied ~6x; real article count is a fraction of that) | `support.monday.com/hc/en-us` |
| AI agent template gallery (`/w/ai-templates`) | 95 — cut two ways: by department (`agents/marketing`, `agents/hr`, `agents/it`...) and by agent type (`ai-agents/mention-tracking`, `ai-agents/account-health-agent`...) | `monday.com/w/ai-templates/agents/marketing` |
| Board template pages (`/templates/*`, `/go-templates/*` combined) | ~200+: ~178 individual templates + 18 category pages (main gallery) + 24 alternate-format template landing pages (`/go-templates`) | `monday.com/templates/eisenhower-matrix` |
| Customer stories (`/w/customer-stories`) | 53 | `monday.com/w/customer-stories/canva` |
| Press / partner / company (`/p/*`) | 68 — mostly `/p/partner-solution/*` (33, e.g. "asset-management-solution," "brick-and-mortar"), plus about, ESG, news, press kit | `monday.com/p/partner-solution/asset-management-solution/` |
| CRM product pages (`/crm/*`) | 56 — features, industries, use-cases, AI agents, pricing, all scoped to the separate CRM product line | `monday.com/crm/industries/real-estate-agents` |
| Long-tail "[category] for [niche]" pages (`/s/*`) | 50 | `monday.com/s/crm-for-plumbers` |
| Use-case / solution pages (`/w/use-cases` 18 + root `/use-cases` 12 + `/efficiencyimpact/use-case` 18) | ~48 across three separate URL patterns for what looks like the same intent | `monday.com/w/use-cases/agile-project-management` |
| Direct integration landing pages (`/integrations/*`) | 15 (one per named tool: Slack, Jira, Gmail, Asana, Trello, GitHub, Mailchimp, Twilio...) | `monday.com/integrations/slack` |
| Elevate (conference microsite) | 14 | `monday.com/elevate/agenda/` |
| Trust center (`/trustcenter/*`) | 11 | `monday.com/trustcenter/security` |
| Academy (certification / LMS-style lessons) | 7 | `monday.com/academy/view/lesson/onboarding-essentials` |
| Nonprofit vertical mini-site (`/nonprofits/*`) | 7 | `monday.com/nonprofits/success-stories` |
| Partner directory (`/partners/*`) | 6 | `monday.com/partners/aws` |
| Alternative/comparison hub pages (`/alternative/*`) | 5 — hub + 4 named competitors with a dedicated landing page (Trello, Smartsheet, Wrike, Quickbase) | `monday.com/alternative/trello` |
| Legacy generic category pages (`/cc/*`) | 2 (old design system, feels abandoned) | `monday.com/cc/task-management-software` |
| Standalone feature pages (`/features/*`) | 5 (Kanban, Gantt, Automations, Forms, Files) | `monday.com/features/kanban` |

Ordering by count: Blog (4,066) ≫ Marketplace (1,005) ≫ Support (2,727 raw /
~450 real) > AI agent gallery (95) > Templates (~200) > Customer stories (53) >
Press/partner (68) > CRM pages (56) > long-tail niche pages (50) > use-case
pages (~48, fragmented across 3 URL patterns) > integrations (15) > Elevate
(14) > trust center (11) > Academy (7) ≈ Nonprofits (7) > Partners (6) >
Alternative hubs (5) > legacy category pages (2).

The single most informative fact in this distribution: **the two largest
buckets by an order of magnitude (blog, marketplace) are both open-ended and
compounding** — every new integration partner or every new post adds a
permanent URL. Nothing else in Kolumn's 50-page brief works this way; that's
the structural gap between "a content site" and "a marketing site," and it's
not one Kolumn should try to close by volume.

## 2. Page anatomies worth understanding structurally

### A. Comparison content — two-tier structure (see §3 for the deep dive)

`/alternative/<vendor>` (short, feature-comparison-box hub, only 4 exist) →
links out to `/blog/reviews/<vendor>-vs-monday-com-*` (long, exhaustive
comparison article, this is where the real content investment is). Full
detail in §3.

### B. Long-tail "[keyword] for [niche]" pages (`/s/*`)

Sampled `monday.com/s/crm-for-plumbers` (4,385px, "An on-the-go CRM for
plumbers"). Structure:

1. H1 + one generic sentence pitch, CTA
2. H2 "How do plumbers get leads?" — a single paragraph of generic
   small-business sales advice, barely plumbing-specific
3. H2 "Create a custom plumbing CRM with monday.com" → six feature
   sub-sections (CRM functions, Automation, Mobile app, Forms, Integrations &
   apps, Clear reporting) — **identical H2 skeleton reused across every
   `/s/*` page**, with the niche noun swapped in
4. FAQ block
5. Closing CTA

This is the textbook programmatic-SEO template: one component, one keyword
variable (`{niche}` × `{category}` = plumbers/gyms/lawyers/churches ×
CRM/task-manager/scheduling), 50 pages produced from it. The "niche
specificity" is almost entirely cosmetic — swap "plumbers" for "gym" and nothing
structural changes.

### C. Use-case / solution pages (`/w/use-cases/<x>`)

Sampled `/w/use-cases/agile-project-management` (10,565px, 14 sections — the
most heavily built of the samples). Structure:

1. H1 + 3 sub-value-prop H3s (ship sprints with less overhead / AI plans
   sprints / one platform for every team)
2. H2 feature-spotlight blocks (sprint planning, Kanban, dashboards,
   integrations) — each a real product capability, screenshotted
3. A social-proof number ("850+") with no further citation visible in the
   text outline
4. A repeated 4-role grid (Legal / HR / PMO & Ops / Product & Eng) shown
   **three times** — cross-linking this one use-case page into every
   department vertical
5. "How to" numbered steps (Step 1/2/3) — a mini onboarding walkthrough
6. Feature list with named sub-features (No-code workflow builder, GitHub
   integration, AI sprint planning)

This is the richest, most bespoke page type sampled — clearly hand-built, not
templated like `/s/*`. It's also the page type closest in spirit to what
Kolumn's brief already scopes as "solutions hub + eight verticals."

### D. Template gallery (hub → category → detail, same three-tier pattern Trello uses)

**Hub (`/templates`):** left rail of ~18 categories (Marketing, Content
Production, Project Management, AI, Sales & CRM, Elevate, Freelancers,
Design, Software Development, Product Management, HR, Manufacturing,
Operations, Startup, Education, Real Estate, Venture Capital, Construction,
Nonprofits, "From our experts") → H1 + subhead → "Featured categories" tile
grid.

**Category (`/templates/category/<x>`):** grid of template cards.

**Detail (`/templates/<name>` or `/templates/template/<id>/<name>`):** two
different URL shapes coexist — cleaner slugs for evergreen/flagship templates
(`/templates/eisenhower-matrix`), numeric-ID URLs for the long tail
(`/templates/template/65396/content-calendar`) — suggesting the gallery grew
by both deliberate curation and bulk import over many years.

### E. Customer story (`/w/customer-stories/<x>`)

Sampled Canva (9,325px, long-form). Structure: pull-quote H1 subhead → "The
challenge" → "The solution" with 4-6 H3 sub-sections, each a specific
before/after workflow change with named numbers ("reduced intake process
steps from 9 to 5," "saved 8,372 seconds of logging per season") → template
download CTAs embedded mid-story → closing reflection quote. This is
long-form case-study journalism, not a testimonial blurb — closer to a
magazine feature than marketing copy, and it requires a named, cooperating
customer with real, specific, audited-sounding numbers.

## 3. The comparison and alternatives play, in depth

This is the content type most transferable to Kolumn and the one most likely
to be done badly, so the structure deserves care.

**monday.com runs two tiers of comparison content, not one:**

1. **`/alternative/<vendor>` hub pages — only 4 exist** (Trello, Smartsheet,
   Wrike, Quickbase), plus the `/alternative` index. Short pages: H1 ("Trello
   alternatives") → a numbered list of 5 "Compare X vs. Y" links (mostly
   pointing to *other companies'* head-to-head blog posts, not just
   monday-vs-X) → 5-6 H2 feature-spotlight sections making the implicit case
   for monday → a "Trusted by 186,000 customers" line → FAQ → cross-links to
   the other 3 alternative hubs.
2. **`/blog/reviews/<vendor>-vs-monday-com-*` articles — broader and much
   deeper.** Sampled the Trello one (20,510px). This is the real content
   asset: "Key takeaways" bullet summary up top, then 10+ H2/H3 sections
   (feature comparison, automations & AI, integrations, pricing/TCO, ease of
   use, security/governance, support, "when to choose X"), each with
   multi-bullet capability lists and a closing recommendation section. **Every
   competitor named on monday's own alternatives hub gets one of these
   articles** (Asana, Trello, Wrike, Smartsheet, Airtable, Basecamp, Jira,
   Workfront) — 8 total — **but only 4 of those 8 also get a dedicated
   `/alternative/` landing page.** Notably, Asana — arguably monday's closest
   competitor — has no `/alternative/asana` hub page, only the blog article.
   That's a deliberate prioritization signal: the shorter hub-page format is
   reserved for competitors monday judges worth a dedicated URL for the
   "monday.com alternatives" search query itself; the rest are covered
   through the blog's own SEO surface.

**What a good comparison page contains, on the evidence here:**
- A specific, falsifiable claim set (feature-by-feature, not vibes) — "Trello
  limits reporting to card/board level, no native cross-board dashboards" is
  a checkable claim, not an opinion.
- Pricing discussed as *total cost of ownership*, not just sticker price
  (add-on costs, seat minimums, hidden tier gates) — genuinely useful to a
  buyer even when it's framed to favor the author.
- A "when to choose the other product" section — monday's Trello article
  literally has an H2 "When to choose Trello vs. monday.com's AI Work
  Platform" that names real scenarios (small team, simple linear workflow,
  <15 people) where Trello is the right call. This is the single most
  credible move in the whole page — it's the thing that makes the rest of
  the page readable as comparison rather than pure sales copy.
- Freshness signals ("in 2026") and a stated publish/update cadence,
  because feature claims about a competitor go stale.

**Where it crosses into misrepresentation — and this is the part to avoid:**
- The page is not neutral despite the "which is right for you" framing.
  Every section's structural bias favors monday (more bullets under monday's
  column, negatively-framed verbs for the competitor — "Trello *limits*...",
  "monday.com *unlocks*..."). That's normal for vendor content, but a small
  product with zero brand recognition doing the same performative-neutrality
  trick reads as try-hard rather than credible, since the reader has no
  existing trust reserve to spend.
  Genuine content strategy for a small honest product should NOT copy the
  false-balance framing; if a page claims to help you choose, it should
  actually sometimes say "pick the other product."
- Several negative claims about the competitor are stated as timeless facts
  ("Trello lacks native resource or workload management") with no citation
  or version-check. Competitor products ship features continuously; an
  absolute negative claim is a landmine — it goes stale and becomes a false
  statement the moment the competitor ships the feature, and there's no
  visible process here for re-auditing these claims over time.
- Uses the competitor's product name as a load-bearing SEO keyword in the
  H1/title/URL, which is legally fine (nominative fair use is well
  established for this kind of comparison) but ethically sits on a spectrum:
  it is one thing to compare accurately, another to build 8+ pages whose
  entire purpose is to intercept a competitor's own brand-name search
  traffic. That's a legitimate SEO tactic at scale, but it's also exactly
  the kind of thing that reads as bad-faith if the comparison itself isn't
  scrupulously accurate — the two have to go together or the tactic
  backfires as a credibility hit.
- No visible "last verified" or "last updated" date in the rendered
  text outline for the Trello comparison article, despite claiming
  2026-specific figures ("in 2026").

**Recommendation for Kolumn specifically:** Kolumn's brief names exactly
three competitors (Asana, Trello, Notion). Don't build monday's sprawling
8-competitor blog + 4-hub two-tier system. Build three single, honest
comparison pages — one per named competitor — each with: (1) a real
feature-by-feature table limited to claims about Kolumn's *actual* shipped
features (no inventing what Asana lacks without verifying it that week), (2)
an explicit "choose the other product if..." section, since Kolumn's honest
pitch ("a kanban that stayed a kanban") is inherently a *narrower* claim than
Asana/Notion's breadth — say so, (3) a visible last-verified date, (4) no
customer-count or "trusted by" social proof Kolumn doesn't have. Three
well-verified pages beat eight formulaic ones.

## 4. Gap list — what monday.com has that Kolumn doesn't

| monday.com content type | Fits Kolumn | Why |
|---|---|---|
| **Comparison pages (Trello/Asana/Notion)** | **Now, scoped to 3.** | Kolumn's brief already names these three competitors. See §3 for the honest version — feature table + "choose them instead if" + dated claims, no fabricated social proof. |
| **Use-case / solution pages with real feature spotlights** | **Now — matches the brief's planned 8 verticals.** | monday's `/w/use-cases/agile-project-management` anatomy (hero, 3 feature spotlights, "how to" steps) is buildable honestly with Kolumn's real features (pill, chat, board views). Drop the "850+" unsourced stat and the 3x-repeated department cross-link grid (Kolumn doesn't have monday's page volume to cross-link into). |
| **Template gallery, category-tiered** | **Later.** | Kolumn already plans a 12-template gallery. monday's category-page layer (18 categories) only makes sense once the template count is large enough to need filtering — premature at 12. Revisit if the gallery grows past ~30. |
| **AI agent template gallery (`/w/ai-templates`, 95 pages)** | **Never, as built here.** | This showcases monday's shipped autonomous multi-department AI agents (Digital Workforce). Kolumn's AI is scoped to the pill (board-scoped write tools) and chat (read-only Q&A) — see CLAUDE.md's "Two AI surfaces" rule. A gallery implying autonomous cross-department agents would misrepresent what Kolumn's AI does. |
| **Integration/marketplace directory (1,005 listings)** | **Never now; the brief already scopes the honest version.** | Kolumn has zero live OAuth integrations. The brief's connectors page ("paste a thread / drop in notes," not "Slack integration") is the correct, much smaller shape. Do not build a gallery implying an ecosystem. |
| **Customer stories (53)** | **Later.** | Same reasoning as the Trello audit: no real customers yet, brief forbids fabrication. Kolumn's customer-stories page type stays empty/aspirational until there's at least one named, cooperating user. |
| **Long-tail "[category] for [niche]" pages (`/s/*`, 50)** | **Never.** | Thin, templated, cosmetically varied by keyword only. See §5. |
| **CRM-style vertical/industry pages at monday's density (`/crm/industries/*`)** | **Never at this density; maybe 1-2 industry pages later.** | Kolumn isn't a CRM and has no industry-specific features (real-estate, professional-services) to honestly spotlight. The brief's "eight verticals" under Solutions is the right-sized version of this idea; don't chase monday's per-industry sprawl. |
| **Trust center (11 pages)** | **Now, but much smaller — 1 page, not 11.** | The brief already has a `security` page type. monday's dedicated ISO/DORA/data-residency sub-pages assume certifications Kolumn doesn't have (SOC 2 is an open question per the brief). A single honest security page (RLS on every table, members-only access, export/delete in settings, "we don't train on your content") is right; an 11-page trust center implying enterprise compliance work Kolumn hasn't done would not be. |
| **Academy / certification (LMS-style lessons)** | **Never for now.** | Requires curriculum-building effort and implies an established userbase investing in certification. Kolumn's `tutorials` page type (already planned) is the right-sized substitute — task-focused how-tos, not a certification program. |
| **Elevate (conference microsite, 14 pages)** | **Never.** | Requires an actual company-scale annual event. Not a content strategy question. |
| **Nonprofit vertical mini-site (7 pages, presumably discounted pricing)** | **Never now; later if a real nonprofit program exists.** | Depends on an actual pricing/eligibility program, not just copy. |
| **Blog at monday's volume/cadence (4,066 posts)** | **Ongoing, not a gap to "close."** | Kolumn already has a blog page type. The lesson from monday's volume is about editorial cadence and topic-cluster structure (18 categories matching product areas), not a target count — a young product publishing 4,000 posts would read as content-farmed, not credible. |
| **Legacy generic `/cc/*` category pages** | **Never — this is what monday itself is phasing out.** | See §5; even monday's own newer pages have moved past this format. |

## 5. What not to copy

- **The `/s/*` long-tail niche pages (50 of them).** Structurally, these are
  one template with a keyword slotted in ("CRM for plumbers," "CRM for
  gyms," "CRM for lawyers"). The content genuinely does not differ beyond
  the noun — "How do plumbers get leads?" is generic small-business sales
  advice with no plumbing-specific insight. For an established player with
  186,000 customers, this is a low-cost way to absorb long-tail search
  volume with a de minimis credibility cost, because the brand itself
  carries the trust. For a young product with zero brand recognition, 50
  interchangeable thin pages would be actively damaging — they read as
  content-farmed the moment a visitor compares two of them, and search
  engines increasingly discount exactly this pattern (programmatic pages
  with near-identical structure and swapped keywords) as low-value.
- **The legacy `/cc/*` pages.** These use an older design system, generic
  copy ("How do plumbers get leads?"-style genericism again — "Want to know
  how that task is coming along? It's all in monday.com!"), and testimonials
  with no visible attribution in the rendered text. They look like the
  earliest iteration of monday's programmatic SEO, superseded by `/s/*` and
  the use-case pages. Worth noting only as a cautionary artifact — even
  monday.com's own trajectory moved away from this format.
- **Unsourced aggregate stats ("850+" on the agile use-case page, "Trusted
  by 186,000 customers" on the alternative hub).** These numbers are real
  for monday (a public, 15-year-old company) but any equivalent on a young
  product's site would be fabricated. Ship without these modules.
- **The AI agent gallery's implied scope.** 95 pages showcasing department-
  specific autonomous agents (Competitive Intel Research, Outbound
  Prospector, Content Gap Agent) describe a shipped "Digital Workforce"
  product. Even reusing the *page shape* (one card per capability) for
  Kolumn's actual AI surface (the pill's 16 tools) would overstate the
  AI as agentic/autonomous when it's closer to "structured board editing via
  chat" — a meaningfully smaller claim that CLAUDE.md is explicit about
  ("Not shipped... extended thinking... Board Builder is being scoped").
- **Splitting one search intent across three URL patterns** (`/w/use-cases`,
  root `/use-cases`, `/efficiencyimpact/use-case` — all ~48 pages covering
  overlapping "use case" intent under three different paths, likely a sign
  of accumulated redesigns rather than deliberate strategy). Kolumn should
  pick one taxonomy for its 8 solution verticals and not fragment it.
- **`/p/partner-solution/*` (33 pages)** and the marketplace's long tail of
  low-quality third-party listings — both assume a partner/developer
  ecosystem that took a decade to build. Not reproducible by content
  strategy alone; skip entirely until (if ever) Kolumn has real
  integration partners.

## Top-line recommendation

Kolumn's highest-value, honestly-achievable borrows from monday.com, ranked:

1. **Three comparison pages** (vs. Trello, vs. Asana, vs. Notion) built the
   careful way described in §3 — feature table limited to verified current
   claims, an explicit "choose them instead if" section, a visible
   last-verified date, no borrowed social proof.
2. **Solution vertical pages** using monday's `/w/use-cases` anatomy (hero +
   2-3 real feature spotlights + a short "how it works" walkthrough) for the
   brief's already-planned 8 verticals — drop the unsourced stat and the
   repeated cross-link grid, since Kolumn doesn't have monday's page count to
   cross-link into.
3. **One honest security page**, not a trust center — RLS, members-only
   access, data export/delete, "we don't train on your content." Mark SOC 2
   as unresolved rather than silent.
4. **Keep templates, customer stories, and the connectors page exactly as
   small as the brief already scopes them** — monday's versions of all
   three assume either years of usage data, real named customers, or a live
   integration ecosystem Kolumn doesn't have. Growing them is a "later," not
   a "now."
5. **Never build**: the `/s/*` long-tail niche pages, the AI agent gallery,
   the marketplace/integration directory, Elevate-style events, or an
   Academy/certification program. Each depends on scale, history, or a live
   ecosystem a young product cannot honestly claim.
