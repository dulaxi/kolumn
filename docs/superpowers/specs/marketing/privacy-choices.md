# Privacy choices — marketing page spec

> Source crawled: https://www.anthropic.com/legal/privacy-choices on 2026-09-02 — **404, not in the sitemap.** On anthropic.com "Privacy choices" is a footer `<button>` that opens the cookie-consent banner (440×281: "Cookie Settings … Customize cookie settings / Reject all cookies / Accept all cookies"), captured in `out/legal-choices-modal.png`. The nearest real page, https://www.anthropic.com/legal/cookies, was crawled as the layout reference (`out/legal-cookies.{json,txt,png}`).
> Kolumn route: `/legal/privacy-choices` (new) · Priority: P2 · Template family: legal — layout in `legal-template.md`; this file adds SEO and the section outline.

**No legal prose here. A lawyer drafts the text.** This page must describe only controls Kolumn actually offers — today that is very little, so most of this spec is a list of controls to build before the page can honestly exist.

## 1. Purpose and SEO target
- **Job**: one page where a visitor or user can see what Kolumn stores in their browser and switch off what is optional (analytics), plus pointers to the account-level controls (export, delete, sessions). Also the destination for a footer "Privacy choices" link and any future consent banner's "Customize" button.
- **Query intent**: navigational — "kolumn cookies", "kolumn opt out analytics". `noindex` is acceptable; the source's cookie page is `noindex, nofollow`.
- **`<title>`**: `Privacy choices · Kolumn` · **meta description**: "What Kolumn stores in your browser, how to turn off analytics, and where to export or delete your data." · OG same.
- **Structured data**: `WebPage` + `BreadcrumbList`.
- **Links in**: footer ("Privacy choices"), `/legal/privacy` §5 and §6, Settings → Privacy (new row), any consent banner. **Links out**: `/legal/privacy`, Settings → Privacy (export) and → Account (delete, sessions) — `/settings` redirects into the app, PostHog's and Sentry's own privacy pages.

## 2. Source page anatomy (what Anthropic does)
- **Privacy choices**: footer button → consent banner (OneTrust-style, custom-styled): title "Cookie Settings", one paragraph, link to the Cookie Policy, three actions (Customize / Reject all / Accept all). The "Customize" view was not crawled.
- **Cookie Policy** (`/legal/cookies`, 3,692px): standard `LegalPageDetail` — meta row, rule, two intro paragraphs, h2s "How Anthropic Uses Cookies" (purpose `ul`: strictly necessary, functional, analytics, advertising, with a link to a separate cookies table), "Managing Your Cookie Settings" (browser controls, the consent tool, GPC/DNT), "Changes", "Contact Us". Body 17/26 serif, h2 25/30. No table on the page itself.

## 3. Kolumn version — section outline
Same shell. Meta row shows "Last updated". One interactive element: an analytics toggle rendered with the existing `SegmentedControl` (options On / Off) or a native switch styled per the settings panes — **the only interactive control on any legal page**, so keep it inside a bordered `--surface-card` row (10px radius, 1px `--border-default`) with a mono 12px status line ("Analytics: on for this browser").

Intro (unnumbered): what this page is; that choices are per browser (stored locally) except account actions.

1. **What Kolumn stores in your browser** — table (template §3 wrapper), columns: Name/kind · Purpose · Category · Duration. Rows grounded in code: Supabase auth session (localStorage; strictly necessary) · `settingsStore` preferences — theme, sidebar, font, motion (localStorage; strictly necessary/functional) · chat boot cache (localStorage, bounded 30 threads/100 messages; functional) · legacy local-data migration flag (`migrateLocalData.js`; functional) · PostHog analytics (`persistence: 'localStorage+cookie'` → a `ph_*` cookie plus localStorage; analytics; **only if the key is configured**) · Sentry (no cookie; sends error reports; analytics/diagnostics) · service worker cache (`public/sw.js`; functional). No advertising cookies, no third-party ad pixels — say so.
2. **Product analytics (PostHog)** — what is collected (pageviews, page-leave, product events via `capture()`, user id after sign-in via `identifyUser`), the host it is sent to, retention (**open question**). **The toggle**: today there is **no opt-out** — `initAnalytics()` runs unconditionally in `src/main.jsx` and `posthog-js` is loaded with `capture_pageview: true`; `respect_dnt` is not set. To ship this page: (a) add `optOutAnalytics()` / `optInAnalytics()` to `src/lib/analytics.js` wrapping `posthog.opt_out_capturing()` / `opt_in_capturing()` and `has_opted_out_capturing()`; (b) persist the choice in localStorage before PostHog loads so `init` can pass `opt_out_capturing_by_default`; (c) set `respect_dnt: true` and honour the Global Privacy Control signal (`navigator.globalPrivacyControl`) as an opt-out; (d) mirror the same toggle as a row in Settings → Privacy so signed-in users find it in-app. The page's toggle must work for anonymous visitors (landing page pageviews are captured).
3. **Error reporting (Sentry)** — what is sent (`sampleRate: 1.0`, environment, stack traces, browser; `sendDefaultPii` is not enabled so no IP/user fields are attached by default — verify), why Kolumn keeps it on (service reliability; treat as strictly necessary) or offer an opt-out (**open question**). If opt-out is offered, gate `Sentry.init` on the same stored preference.
4. **Emails** — the landing sign-in form says users agree to "occasional product emails". Either build an email-preference (profile flag + unsubscribe link) and describe it here, or remove the sentence from the landing page. Transactional emails (auth, invitations, billing) cannot be opted out of.
5. **AI features** — clarify that the AI is invoked only when the user uses the pill or chat; there is no background processing of board content by the model; no opt-out needed beyond not using it. Link to privacy §3.
6. **Your account data** — pointers, not duplicates: export JSON (Settings → Privacy), delete account (Settings → Account), revoke sessions (Settings → Account), edit profile. Regional rights requests → privacy §6 and the contact address.
7. **Do Not Track and Global Privacy Control** — state whether Kolumn honours them (recommendation: yes, treat GPC as analytics opt-out; DNT likewise — both are two lines in `analytics.js`).
8. **Changes and contact** — last-updated line; support address.

## 4. Data and content sources
`src/content/legal/privacy-choices.md` with `lastUpdated`, `version`. The storage table should be generated from a constant, not hand-typed: add `src/content/legal/storage-inventory.js` exporting the rows, and render it via a `{{storage-table}}` placeholder replaced by the `LegalDocument` renderer (the only dynamic component in the family; keep the escape hatch generic — `components: { 'storage-table': StorageTable, 'analytics-toggle': AnalyticsToggle }`). Code dependencies for the file header: `src/lib/analytics.js`, `src/main.jsx` (Sentry), `src/lib/supabase.js` (auth storage), `src/store/settingsStore.js` (persisted keys), `src/store/chatStore.js` (boot cache bounds), `src/lib/migrateLocalData.js`, `public/sw.js`. Anything added to localStorage later must be added to the inventory — note this in `CLAUDE.md` when the page ships.

## 5. Open questions
- Is a consent banner legally required for Kolumn (EU visitors + a non-essential PostHog cookie set on first load)? If yes, this page becomes the banner's "Customize" target and PostHog must default to off until consent; if no, the toggle on this page plus GPC/DNT is the whole mechanism. Lawyer decides; engineering cost differs a lot.
- Sentry: keep as strictly necessary or expose an opt-out.
- Product-email preference: build it or delete the landing sentence.
- PostHog data-retention setting and whether session recording/heatmaps will ever be enabled (if so, the page and the toggle must cover them).
- Where the toggle lives for signed-in users — Settings → Privacy row (recommended) vs. this page only.
