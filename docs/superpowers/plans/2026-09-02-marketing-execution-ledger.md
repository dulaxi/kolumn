# SDD ledger — plan: docs/superpowers/plans/2026-09-02-marketing-foundation-pricing.md

Spec: docs/superpowers/specs/marketing/_chrome.md + pricing.md (+ _KOLUMN-BRIEF.md). Both read.
Branch: development (feature branch, not master). Base at start: b7b3fe9.

## Pre-flight conflict scan

### Pairs sharing a file or interface

| A → B | Produces → consumes | Finding |
|---|---|---|
| 1 → 7 | `lockBodyScroll`/`unlockBodyScroll` from Modal.jsx → MarketingNav overlay | clean; names match |
| 1 → 7 | `--text-on-ink*`/`--border-on-ink` → MarketingFooter | clean; footer uses all three |
| 2 → 3 | `PLANS[].caption/badge/comingSoon/ctaTo` → PlanCard render | clean; every field PlanCard reads is emitted by the mapper |
| 2 → 4 | `PLANS` → PlanGrid | clean |
| 2 → 5 | `PRICING.meta`, `pricingJsonLd` → route registry | clean |
| 2 → 9,10 | `PRICING.comparison/faq/hero/footnote/reassurance` → CompareTable, PricingPage | clean; shapes match the test fixtures |
| 3 → 10 | PlanCard h3 = plan.name → PricingPage queries `heading level 3` | clean; FaqItem also renders h3 but names never collide |
| 4 → 10 | `FaqItem`, `PlanGrid` default exports → PricingPage | clean |
| 5 → 6 | `SITE_URL` → headMeta canonical | clean; no import cycle (routes→pricing, headMeta→routes) |
| 5 → 8,12 | `MARKETING_ROUTES`, `findMarketingRoute` → route elements, layout, SSR entry | clean |
| 5 → 7 | `NAV_LINKS/NAV_MENUS/FOOTER_GROUPS/PRIMARY_CTA/SIGN_IN/CONTACT_EMAIL` → chrome | clean; `CONTACT_EMAIL` is re-exported from pricing.js through marketing-nav, and the footer imports it from marketing-nav |
| 5 → 10 | placeholder PricingPage replaced by the real one | clean; Task 10 modifies the same path Task 5 created |
| 6 → 8,12 | `routeMeta`/`applyHeadMeta`/`buildHeadTags`/`headTagsToHtml` → layout + prerender | clean |
| 7 → 8 | `MarketingNav`/`MarketingFooter` default exports → layout | clean |
| 8 → 12 | `MarketingLayout` + `marketingRouteElements` → SSR entry must match App.jsx tree | clean by construction: both mount `<Suspense><Routes><Route element={<MarketingLayout/>}>{marketingRouteElements()}` |
| 9 → 10 | `CompareTable({ comparison })` → PricingPage | clean |
| 11 → 12 | `injectIntoTemplate`/`buildSitemap`/`buildRobots` → prerender script | clean |

### Per-task internal agreement

Tasks 1-9, 11, 13: tests specified match the code specified; files created match files later touched. No disagreement found.

Task 10 — DISAGREEMENT. Its second test counts ink-CTA elements by CSS class substring and asserts exactly 2. That asserts an implementation detail (Tailwind class text), is brittle against PlanCard's internals, and does not actually test the Global Constraint it is aiming at ("no lime button").
**Ruling: replace Task 10's second test with a direct assertion of the constraint — no link or button carries a lime background class.** Why: the binding constraint in both the spec and Global Constraints is "no lime-filled button", not "exactly two ink buttons"; a count is a proxy that breaks whenever a card gains a CTA. Cost if wrong: a lime button could ship with only the chrome spec's prose to catch it, and the ink-CTA hierarchy (Pro as sole primary) is then verified by eye during the browser check rather than by test.

Task 12 — DISAGREEMENT. Its first test asserts the SSR output contains `<!--$-->`, React's Suspense boundary marker. That pins React internals, not our behavior, and `prerender` may legitimately omit boundary comments once everything resolves.
**Ruling: drop the `<!--$-->` assertion; keep the nav/h1/footer content assertions.** Why: the test's real job is proving the prerender emitted the resolved page rather than a fallback, which the `<h1>Pricing</h1>` and footer assertions already prove. Cost if wrong: nothing — a false failure was the only thing that assertion could produce.

### Environment checks run during the scan
- `react-router-dom@7.18.1` exports `StaticRouter` (typeof function) — Task 12's import is valid.
- `react-dom/static` exports `prerender` — Task 12's import is valid.
- Vite 7.3.6 supports the `isSsrBuild` config-function argument — Task 12's config change is valid.
- `dist-ssr` and `.superpowers/` are already gitignored.
- No existing test file collides with the ten new test files.
- No module in the prerender import graph touches `window`/`document`/`env` at module scope.

## Rulings

Ruling: batch Tasks 1 and 2 into one dispatch — both are fully-specified mechanical edits over disjoint files with no interdependency. Why: same shape (constants/exports, no UI), and one review gate over ~5 small files is cheaper than two. Cost if wrong: a fix round covers both tasks at once instead of one.

## Progress
Tasks 1+2 batch: implementer reported DONE (commits 43d80bb, dba73d0), 871/871 tests pass.
Controller inspection of the report found a scope + design defect the implementer did not flag.

Ruling: the plan's Task 2 assertion `expect(typeof getPlan('team').topIcon).toBe('function')` is the
defect, not the code. Phosphor v2 icons are forwardRef objects (`typeof === 'object'`), so the
assertion could never pass against the real icon. The implementer satisfied it by storing thunks
(`topIcon: () => Popcorn`) in src/data/plans.js AND editing src/components/PlanCard.jsx:28 to
`plan.topIcon()` — a file Task 2 does not authorize it to touch, and one Task 3 is about to modify
from a brief that still shows the old line. Corrected the plan to assert icon identity
(`expect(getPlan('free').topIcon).toBe(Popcorn)`) and sent both production files back to be reverted.
Why: bending two production files around a wrong test is backwards, and the thunk indirection would
have set a trap for Task 3. Cost if wrong: none to behaviour — the thunk form renders correctly
today; the cost of NOT fixing it is a likely Task 3 regression and permanent unexplained indirection.
Tasks 1+2: fix round 1/5 (1 addressed, 0 open — icon thunks reverted, PlanCard.jsx byte-identical to
b7b3fe9 verified by controller; commits dba73d0..19b8500). validation.test.jsx edit confirmed as
legitimate fallout: PlanCard renders plan.cta, and the CTA labels changed by design in Task 2
(Free "Use Kolumn for free"→"Start for free", Pro "Try Pro plan"→"Try Pro free for 7 days",
Team "Get in touch"→"Get notified"), all three matching the pricing spec. Task review dispatched.
Tasks 1+2: task review clean — spec compliance fully met on both tasks, no Critical/Important
implementer-caused issues, 872/872 tests pass. Two residual items resolved by controller:

Ruling: the reviewer's ⚠️ (Team card renders a dangling "/" and a mis-wired CTA on the live landing,
onboarding and picker pages because PlanCard still reads `period`/`ctaTo` unconditionally) is
plan-mandated and NOT a gap. Task 3 is the very next dispatch and its brief assigns exactly those
three fixes. Why: the branch does not ship mid-plan, so the interim state is never user-visible.
Cost if wrong: if this branch were shipped between Task 2 and Task 3, the Team card would show
"Coming soon /" and its CTA would go to /onboarding instead of the mailto.

Task 1+2: minor (deferred): UpgradeProPage.jsx still hardcodes the trial length as
`addDays(new Date(), 7)` at lines 38 and 51 instead of reading PRICING.limits.trialDays, leaving a
second source of truth for the 7-day number. Outside the brief's literal scope (only lines 12-16 were
named) but contrary to Task 2's single-source intent. Final review to triage before merge.

Task 1+2: complete (commits b7b3fe9..19b8500, review clean)
Task 3: implementer DONE (commit 8b556e7), 876/876 tests pass. Diff is 3 files / 60 insertions.
Controller pre-checked: PlanCard.jsx:28 still `const TopIcon = plan.topIcon` (the reverted regression
did not return); the one-line validation.test.jsx edit changes the onboarding picker assertion from
"Get notified" to "Coming soon", which is the intended new behaviour (Team is no longer a committable
tier in the picker — this settles pricing spec open question 1's picker half). Task review dispatched.
Task 3: task review clean — spec fully met, no Critical/Important. Two Minors, both plan-mandated
(they are weaknesses in test text I wrote, not implementer faults):
Task 3: minor (deferred): PlanCard.test.jsx "free CTA links to onboarding" does not discriminate old
from new code — the old component hardcoded Link to="/onboarding" and Free's ctaTo resolves to the
same path, so the assertion passes either way.
Task 3: minor (deferred): PlanCard.test.jsx "team omits the period" uses queryByText(/^\/ /), which
RTL whitespace-normalisation likely makes a no-op; the test's real discriminator is the mailto href
assertion in the same test, which does work.
Both are safe to leave (the behaviour is covered elsewhere in the same tests); final review to triage.

Task 3: complete (commits 19b8500..8b556e7, review clean)
Task 4: task review clean — spec fully met, no Critical/Important, no behaviour drift on the landing
page (FaqItem moved byte-identical incl. all ARIA wiring; PlanGrid keeps the exact wrapper classes;
Pricing section untouched; no dangling Plus/PlanCard/PLANS references). 878/878 tests, build passes.
Task 4: minor (deferred): PlanGrid's class template literal leaves a trailing space when className
defaults to '' — cosmetic, no visual effect.

Task 4: complete (commits 8b556e7..a0bb7b3, review clean)
Task 5: task review clean — zero findings at any severity. Reviewer empirically proved the dead-link
test can fail (injected /dead-link into NAV_MENUS, saw it fail, restored). Verified SITE_URL has no
trailing slash, findMarketingRoute normalises the trailing slash, every KNOWN_ROUTES entry really
exists as a Route in App.jsx, CONTACT_EMAIL is re-exported not duplicated, no import cycle, and
title/description come from PRICING.meta (16 and 130 chars, real margin under the 60/155 caps).

Task 5: complete (commits 8cb9d80..37bc904, review clean)
Task 6: task review clean — verbatim match to brief, no Critical/Important. Reviewer verified Node
safety (no browser globals at module scope), that the managed selector covers every tag buildHeadTags
emits (so nothing accumulates across navigations), that it cannot match index.html's charset/favicon/
manifest/preload tags, that the JSON-LD `</` escape is valid JSON and applyHeadMeta uses textContent,
and that canonical for path '/' resolves to SITE_URL with no doubled slash.
Task 6: minor (deferred): attribute escaping of " < > and the </script> defense are implemented but
only `&` is exercised by a test (plan-mandated — the brief's own test bank).
Task 6: minor (carry into Task 12): headMeta imports SITE_URL from marketing-routes, which imports
`lazy` from react at module scope, so the prerender script transitively loads React in Node. Expected
to be fine (the SSR entry uses React anyway) but sanity-check when Task 12 lands.

Task 6: complete (commits 37bc904..f57b216, review clean)
Task 7: task review clean — verbatim to brief, zero implementation defects. Reviewer traced every
static import chain in the three new files and confirmed none reaches authStore/supabase/env.js (only
useMarketingUser's dynamic import does), reasoned through the unmount-before-import-resolves race and
found no post-unmount setState or orphaned subscription, and confirmed the scroll lock releases on all
three exit paths (toggle close, route change, unmount).
Task 7: minor (deferred, carry to whichever plan populates NAV_MENUS): Popover's panel renders its own
role="dialog", so a desktop dropdown plus the mobile overlay could expose two dialogs once NAV_MENUS
has entries. Not reachable today (NAV_MENUS is empty, and desktop/mobile are CSS-exclusive).

Task 7: complete (commits f57b216..550bd15, review clean)
Task 8: implementer DONE_WITH_CONCERNS (commit a7f24da), 891/891 tests, build ok, browser verified
(nav + "Pricing" h1 + ink footer + tab title "Pricing — Kolumn" seen via Playwright screenshot).
Two concerns raised; both adjudicated by controller:

Ruling: ACCEPT the implementer's deviation adding <Suspense fallback={null}> around <Outlet/> inside
MarketingLayout. The brief omitted it, but the brief's own test renders the layout without App.jsx's
outer Suspense, and a lazy route component suspending with no ancestor boundary withholds the entire
render (implementer verified body was empty). Hydration is unaffected because both the browser tree
and the Node tree render the same MarketingLayout, so the boundary exists identically on both sides.
Why: the deviation is required for correctness and improves marketing-page loading (nav and footer
paint while the page chunk loads, instead of a whole-page spinner). Cost if wrong: a marketing page
whose chunk is slow shows chrome around an empty main for a moment rather than a spinner.

Ruling: the mobile-menu inert bug is REAL, Critical, and mine to fix now. lockBodyScroll() sets
`inert` and `aria-hidden="true"` on #root; Modal escapes that by portaling its panel to document.body,
but Task 7's overlay (which my plan told it to build) renders inline inside #root, so opening the
mobile menu makes the overlay itself inert — every link and the X button unclickable and hidden from
screen readers, with no way to close. Verified in Modal.jsx:52-56 and MarketingNav.jsx:154-156.
Fixing by portaling the overlay to document.body, matching Modal's proven pattern, which also keeps
the desirable "background is inert while menu is open" behaviour. Authorizing MarketingNav.jsx (a
Task 7 file) to be edited in Task 8's fix round. Why: shipping a mobile menu that traps the user is
not acceptable, and Task 12 will prerender this component. Cost if wrong: a portal renders the
overlay outside the nav's DOM position; it is `fixed`-positioned so layout is unaffected, and it is
only created when menuOpen is true, so the prerender never calls createPortal in Node.
Task 8: fix round 1/5 (1 addressed, 0 open — mobile overlay AND its toggle button portaled to
document.body; implementer found my fix instruction incomplete, since the X button lives in the bar
rather than the overlay and stayed inert; commits a7f24da..347acb8).
Task 8: task review clean — spec met, no Critical/Important. Reviewer confirmed createPortal is
unreachable in a Node render, the portaled toggle's `fixed top-[18px] right-5 z-[70]` exactly matches
its inline position and sits above the z-50 overlay, exactly one toggle exists in each state, the
scroll lock still releases on all paths, App.jsx gained only 3 lines with no route reordering, and the
new regression test discriminates structurally (appRoot.contains) rather than relying on jsdom
enforcing inert, which it does not.
Task 8: note carried to Task 12: the SSR entry must resolve the lazy page before serializing, or the
prerendered HTML will contain the empty Suspense fallback instead of the page. The plan already uses
React 19's `prerender` from react-dom/static (which awaits Suspense, unlike renderToString) and the
Task 12 test asserts the <h1> is present, which would fail on an empty fallback.

Task 8: complete (commits 550bd15..347acb8, review clean)

Ruling: batch Tasks 9 and 11 into one dispatch. Both create a single self-contained module plus its
test, touch disjoint files (src/components/marketing/CompareTable.jsx vs src/lib/prerender.js), and
have complete code in their briefs with no integration work. Why: one review gate instead of two on
two small mechanical files. Cost if wrong: a fix round would cover both files at once.
Tasks 9+11: task review clean — spec fully met, no Critical/Important, only the 4 authorized files
touched. Reviewer verified stripManagedHeadTags against the REAL index.html (not just the fixture) and
confirmed it leaves charset/viewport/theme-color/preload/favicons/apple-touch-icon/manifest untouched;
injectIntoTemplate yields exactly one <title>, throws on a missing root div, stamps data-prerendered
on <html>; buildSitemap emits no doubled slash for '/'; buildRobots' disallow list exactly matches the
ProtectedRoute-gated paths in App.jsx and does not disallow /pricing.

Ruling: the implementer's regex deviation (`\s*\n?` -> `[ \t]*\n?`) was NECESSARY, not optional, and
my plan's regex was wrong. Reviewer traced it: with `\s*`, after matching the first of two consecutive
same-family tags (og:type immediately followed by og:title, which occurs in the real index.html), the
greedy match eats the next tag's leading indentation, destroying the `^` anchor the following match
needs — so the second tag silently survives into the output. Accepting the deviation as a plan fix.
Why: the brief's own test would have failed against the brief's own regex. Cost if wrong: none; the
corrected pattern is strictly narrower and the reviewer verified it against the real file.

Tasks 9+11: minor (carry into Task 12): injectIntoTemplate replaces the literals '<html lang="en">'
and the root div by plain string match. Only the root div is guarded by a throw, so a future edit to
the <html> tag's attributes would silently skip stamping data-prerendered, disabling hydration with no
test catching it. Folding a guard into Task 12 rather than opening a fix round, since Task 12 is the
consumer that depends on that attribute.

Tasks 9+11: complete (commits 347acb8..d753dc5, review clean)
Task 10: implementer DONE (commit 2deddde), 900/900 tests, build ok, screenshots verified at 1440 and
390 by both implementer and controller. Task review: spec met, copy all sourced from PRICING, no lime
button fills, no duplicated chrome, no visual defects. Two plan-mandated findings adjudicated:

Ruling: the h1 -> h3 heading skip is a REAL accessibility defect and I am fixing it. PlanCard renders
plan names as <h3> and the plan grid sits before the first <h2>, so the page outline jumps a level
before any h2 exists. (The landing page does not have this problem because its "Compare plans" h2
precedes the grid.) Fixing with a visually-hidden <h2>Plans</h2> heading on the plan-grid section
rather than changing PlanCard's <h3>, because PlanCard is shared with the landing page and the in-app
picker and changing its heading level would ripple into both. Cost if wrong: one extra heading that
only screen readers announce.

Ruling: the reassurance tile's <h2> using `text-lg font-medium` instead of `font-heading font-[425]`
is my brief contradicting my own Global Constraints. Resolving in favour of the constraint but keeping
the size: add `font-heading font-[425]` while leaving it at `text-lg`. Why: the constraint exists so
every heading speaks in Clash Grotesk, and at 18px that reads as a tile lead-in rather than a section
header, which is the design intent from pricing spec section 3.6. Promoting it to the full 36px h2
scale would be visually wrong inside a small tile. Cost if wrong: the tile heading's typeface changes
weight/face slightly; purely cosmetic and easily reverted.
Task 10: fix round 1/5 (2 addressed, 0 open — sr-only "Plans" h2 restores the outline; reassurance h2
gains font-heading font-[425] at text-lg; new outline test verified to fail without the fix with
"jump before <H3>: expected 2 to be less than or equal to 1"; screenshot re-shot, no layout shift;
commits 2deddde..7a51297).
Task 10: scoped re-review — both findings ADDRESSED (sr-only h2 at PricingPage.jsx:52, PlanCard
untouched; font-heading font-[425] at PricingPage.jsx:71 with text-lg kept). No new breakage. Outline
test logic judged sound: it also catches a page that starts at h2 rather than h1.

Task 10: complete (commits d753dc5..7a51297, review clean)
Task 12: implementer DONE (commit 806b645), 904/904 tests. Prerendering works: dist/pricing.html has
title=1, canonical=https://kolumn.app/pricing, 2 JSON-LD blocks, a real <h1>Pricing</h1>; served
/pricing returns the prerendered file, hydration clean. It found and fixed two genuine blockers the
brief did not anticipate (serve -s can never serve a prerendered page; CSP blocked React's Suspense
reveal script; Toaster's body portal desynced hydration).

Ruling: ACCEPT the two deviations the implementer made beyond the brief — replacing Railway's start
command with scripts/serve-prod.mjs, and moving/gating the Toaster portal in App.jsx. Both are
necessary and well-documented. serve-handler's `-s` flag prepends an unconditional `**` rewrite that
skips cleanUrls entirely, so no config could make prerendered pages reachable; the wrapper still calls
serve-handler (so dist/serve.json's CSP and security headers still apply) and only adds the SPA
fallback for paths with no real file. The Toaster gate is one tick later on a portal that renders no
DOM at that position. Why: without these the task's entire goal fails. Cost if wrong: the production
start command is now our code rather than a stock CLI, so it is ours to maintain; a toast fired within
the first tick after mount would be dropped, which no code path does.

Ruling: two CRITICAL defects in that new production server, found by controller testing, must be fixed
before this task closes. Both are in code the brief never specified, so no review had seen it yet.
(1) `serve-handler` is declared in devDependencies but scripts/serve-prod.mjs imports it as the
production entry point — a production install that omits dev dependencies leaves the site unable to
boot. The old `npx serve` tolerated this because npx fetches on demand; a bare import does not.
(2) `decodeURIComponent(...)` on the request path throws URIError on a malformed path, and the throw
is synchronous inside the http request handler, so the process exits. Verified empirically: `curl
--path-as-is 'http://127.0.0.1:4199/%'` killed the server, and the next request got no response
(process CRASHED). That is a trivial denial of service on the whole site, reachable by any visitor or
a crawler following a malformed link. Why fix now: this task changed how production serves every page.
Cost if not fixed: the site fails to boot, or anyone can take it down with one request.
Task 12: fix round 1/5 (2 addressed, 0 open — serve-handler moved to dependencies; malformed paths now
400 instead of killing the process; controller re-verified independently: /%, /%%%zz and a traversal
attempt all return 400 with the process still serving and /pricing still 200; commits 806b645..63d6aee).

Task 12: full review (opus) — spec met and verified independently in dist/, CSP hashes recomputed and
found to match byte-for-byte with no unsafe-inline and no other directive touched, setup.js changes are
pure re-indentation under one guard, vite client build unaffected, Toaster gate loses no toasts
(react-hot-toast replays module-level memoryState at mount), hydrate branch correct in all three cases.
Three Important findings, all real:

Ruling: the "prerendered content" finding is the one that matters and I am fixing it, not parking it.
Confirmed by controller: <main id="main"> in dist/pricing.html contains only
`<!--$?--><template id="B:0"></template><!--/$-->` — the entire page body sits in a `<div hidden>` at
the end of #root and is revealed by React's inline $RC script. My brief's grep checks passed because
they matched the hidden copy, so my own verification was inadequate. Head meta/OG/JSON-LD are inline
and correct, so link unfurls and Googlebot (which executes JS) are fine, but a JS-less crawler gets an
empty main, which is not what this task promised. The reviewer's proposed fix also deletes complexity:
pre-resolving the lazy component so the boundary never suspends puts the content inline AND removes the
inline reveal script, which in turn removes the entire CSP-hash mechanism. Cost if wrong: hydration
currently works cleanly and this changes what the SSR pass emits, so the fix carries real regression
risk — the implementer is instructed to revert and report rather than ship a worse state if hydration
degrades.
Task 12: fix round 2/5 (3 addressed, 0 open — content now inline in <main>; server.on('error') added
so a boot failure exits instead of zombying; serveProd test asserts real body content; plus the four
hardening minors. Commits 63d6aee..e69b6a9). Implementer root-caused TWO independent triggers, not
one: lazy() suspension AND React's progressiveChunkSize default (12800 bytes), which segments any
boundary larger than that regardless of suspension — fixed with a module preload plus
progressiveChunkSize: Infinity, verified by isolation testing.
Controller re-verified end to end against the production server: a JS-less GET /pricing returns 51,442
bytes with <h1> inside <main>, title "Pricing — Kolumn", canonical https://kolumn.app/pricing, 2
JSON-LD blocks, no hidden div, no reveal script; dist/serve.json's CSP is now byte-identical to
public/serve.json (hash mechanism gone); /% still 400 with the process alive and /pricing still 200.
Task 12: scoped re-review — all three findings ADDRESSED, no new breakage. Content inline in <main>
with zero $RC/hidden/template markers; dist/serve.json byte-identical to public/serve.json and the
hash mechanism replaced by a build-time guard that throws if any inline <script> reappears; browser
still gets lazy() so code splitting is unchanged; server.on('error') exits 1 and uncaughtException now
checks server.listening so it cannot mask a boot failure; serveProd test asserts body content that the
SPA fallback could not produce. All four hardening items present. Reviewer judged
progressiveChunkSize: Infinity sound rather than a workaround: this is a one-shot build-time render,
so there is no progressive-delivery tradeoff, and the memory cost is build-time only.
Task 12: note carried to the follow-on plans: MARKETING_ROUTES has one entry today, so the
multi-route branch of resolveRouteElements in prerender-entry is untested. The first follow-on plan
that prerenders a second route should verify both routes' HTML, not just the new one.

Task 12: complete (commits 7a51297..e69b6a9, review clean)
Task 13: complete (commit 9fa2071, docs only — CLAUDE.md marketing layer + content registry +
build:prerender command + the three post-brief facts (serve-prod start command, prerender pipeline
constraints, env.js isolation), design doc status line). 906 tests pass, lint clean.
Controller also corrected persistent memory outside the repo: deploy-target-railway.md still claimed
`npx serve dist -s` and would have led a future session to revert the fix; added
marketing-prerender-pipeline.md recording the two settings that keep content inline and the
grep-for-<h1> verification trap that fooled me.

ALL 13 TASKS COMPLETE. Dispatching final whole-branch review.

FINAL WHOLE-BRANCH REVIEW (opus): merge readiness NO — four Important findings, all real, all cheap.
Cross-task coherence otherwise verified sound (PRICING -> PLANS -> PlanCard on all three surfaces;
PRICING.meta -> MARKETING_ROUTES -> routeMeta -> dist head; no $24 or old CTA label anywhere in src/;
FaqItem/PlanGrid single definitions, no stale imports). All nine deferred minors triaged SHIP.

Ruling: fix all four before merge in one fix wave, then one scoped re-review.
1. Compression lost. `serve` piped every response through `compression`; our replacement server does
   not, so ~2MB of JS and every prerendered page now ship uncompressed. Controller confirmed
   `compression` is resolvable. This is a regression our own change introduced.
2. Three favicons referenced by index.html are untracked — .gitignore's `*.png` swallowed them, so a
   fresh Railway clone 404s both favicons and the iOS icon. Controller confirmed: git ls-files shows
   no PNGs while all three exist on disk. Came in via my own WIP checkpoint commit c6e485b.
3. `/pricing/` (trailing slash) serves the SPA shell with the wrong title and no canonical tag — a
   200 duplicate of the app shell, which is exactly the SEO failure this branch exists to prevent.
4. UpgradeProPage hardcodes "$8.00"/"$80.00" in the period selector while the order summary beside it
   derives from PRICING.limits, so a price change shows two different numbers on one screen. Folding
   the previously-deferred hardcoded trialDays into the same fix.
Cost if wrong: each is a small, independently revertable change to code this branch already owns.
Final fix wave: scoped re-review — all four findings ADDRESSED, no new breakage, MERGE READY.
Reviewer verified compression is a real dependency and sits inside the existing try/catch (hit /% with
Accept-Encoding: gzip, got a compressed 400 and the process stayed alive), the .gitignore negation is
scoped so unrelated screenshots stay ignored, the trailing-slash redirect preserves the query string,
exempts /, and converges rather than looping on //, and the price template literals render
byte-identical at today's values. Controller independently confirmed gzip on assets above the 1KB
threshold, the 301, tracked favicons, and zero dollar literals.

BRANCH COMPLETE AND MERGE READY.
