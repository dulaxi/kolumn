# Security — marketing page spec

> Source crawled: https://trust.anthropic.com (SafeBase/Vanta trust center) on 2026-09-02 — `out/security.{json,txt,png,-mobile.png}`. `https://www.anthropic.com/security` returned 404 (`out/security-www.*`); the sitemap's `/product/security` is a product page for "Claude Security" (crawled to `out/product-security.*`, not used). Note the trust center is an app shell with an internal scroll container: the PNG shows only the first 900px, but the JSON captured the full ≈5,100px of content.
> Kolumn route: `/security` · Priority: P1 · Template family: article

## 1. Purpose and SEO target
- **Job of this page**: let someone evaluating Kolumn for a team verify, control by control, how their boards are protected — with every claim traceable to shipped code — and give them one obvious place to report a vulnerability.
- **Primary keyword / query intent**: "Kolumn security" (navigational / evaluation). Secondary: "is Kolumn secure", "Kolumn data privacy", "kanban app row level security", "Kolumn export data".
- **`<title>`**: `Security at Kolumn` (18 chars)
- **meta description**: `How Kolumn protects your boards: row-level security on every table, members-only access, session control, export and deletion from Settings, and no training on your content.` (155 chars)
- **OG title**: `Security at Kolumn` · **OG description**: same as meta.
- **Structured data**: `FAQPage` for §6 (the trust center has an FAQ tab; the schema clearly applies). `BreadcrumbList` (Home › Security). No `Organization` here — that belongs to `/about`.
- **Internal links in**: footer "Company" column ("Security"), landing FAQ answer "Is my data safe?" (`LandingPage.jsx` FAQ item → link `/security`), Settings → Privacy pane (add a "Security" link beside the existing Privacy Policy link), `/about` value 03. **Out**: `/responsible-disclosure`, `/privacy`, `/terms`, `/onboarding`, `/about`.

## 2. Source page anatomy (what Anthropic does)

Trust-center app, Inter throughout, white ground, 1248px container with 24px side padding. Layout below the hero is a **two-column dashboard**: left column x=120–≈450 (≈330w) for compliance + resources, right column x=497–1368 (≈870w) for subprocessors, FAQ, updates.

1. **App header** — h 73px · white · logo + "Trust Center" wordmark left · right: text button "Subscribe to updates" (bell), outline button "Ask a question" 36h, ink button "Request access" 36h / 4px radius. *Why*: the page is a document-request tool first.
2. **Hero band** — h 400px · full-bleed copper/terracotta fill · container 1248 padX 24 · h1 32/36/600 Inter (614w) · p 16/24 (≈700w) · one underlined text link "Privacy Policy" with link icon · right: line-art keyhole illustration ≈ 260px. *Why*: brand statement + link to the legal doc.
3. **Filter + tabs** — h ≈ 90px · "Filter by · Product ▾" dropdown · tab row: Overview / Resources / Subprocessors / FAQ / Updates, 14px, active tab underlined 2px. *Why*: one shell, five views.
4. **Overview card: compliance matrix** — bordered card (1px light grey, 8px radius, 24px padding) · intro p 16/24 · table: rows = product scopes (10 links), cols = 9 frameworks (SOC 2 Type 2, ISO 27001, ISO 42001, CSA Star, HIPAA, NIST 800-171, FedRAMP High, DoD IL4, IL5) · cells = green check emoji or "N/A" · header cells bold 14px. *Why*: the single artefact enterprise buyers screenshot.
5. **Compliance (left col)** — h2 18/22/500 at y≈1618 · grid of framework badge tiles (logos, 2-up in the 330w column). *Why*: badge strip.
6. **Resources (left col)** — h2 18/22 at y≈2140 · categories as h3 16/20/500 (SOC 2, ISO, HIPAA, NIST, FedRAMP, International Compliance, Questionnaires, Diagrams, Frontier AI Compliance, Code of Conduct, Whitepapers, Security Advisories, Model Documentation Forms, Training Data Summaries, Other) each followed by 1–4 document rows (PDF icon + name, gated behind "request access"), category spacing ≈ 200px. *Why*: the document locker.
7. **Subprocessors (right col)** — h2 18/22 at y≈1618 · 4 rows shown ("Products: All Products" meta) + "View all". *Why*: GDPR expectation.
8. **FAQ (right col)** — h2 at y≈2043 · 2 disclosure rows shown ("Is Anthropic willing to sign a BAA?", "I found a security bug. How can I let you know?") + "View all". *Why*: the two questions everyone asks — one of them is the vulnerability-report route.
9. **Updates (right col)** — h2 at y≈2313 · feed of 4 posts: category chip (12px), h3 16/20/500, "Published <date>" 14px muted, 2–3 line excerpt, "Read more" text button. *Why*: change log for compliance state.
10. **Ask a question CTA** — h2 18 "Ask Anthropic a question" · p · ink button "Request Access". *Why*: funnels to the gated AI Q&A.

Shared numbers:
- **Type scale**: h1 32/36/600 · h2 18/22/500 · h3 16/20/500 · body 16/24 · table/meta 14 · chip 12. All Inter; letter-spacing +0.01em on headings.
- **Container + rhythm**: 1248 max, 24px padding; dashboard columns ≈330 / ≈870 with ≈47px gutter; cards 1px border, 8px radius, 24px padding; section gaps ≈ 100px; no shadows.
- **Palette roles**: bg white; hero = copper/terracotta band with ink text; text near-ink; muted mid-grey; success = green check; primary button = ink; borders light grey.
- **Mobile (390w)**: header collapses to logo + "Request access"; hero band keeps fill, illustration hidden, h1 ≈ 28px; tabs scroll horizontally; the compliance matrix scrolls horizontally inside its card; the two dashboard columns stack (left column first).
- **Nav / footer**: the trust center has its own app chrome (not anthropic.com's). Kolumn uses its normal marketing chrome.

## 3. Kolumn version

Page target ≈ 3,400px at 1440w. Container `max-w-6xl px-6 sm:px-10`. Sections `py-16` separated by `border-t border-[var(--border-subtle)]`; hero `pt-24 pb-16`. The source's dashboard split is replaced by full-width sections — Kolumn has one product scope, not ten, so the matrix/columns machinery would be empty chrome.

**Claim rule for this page**: every sentence in §3 is tagged `[code: …]` with the file that backs it. If a future edit can't add a tag, the sentence doesn't ship.

### 1. App header → shared marketing chrome — adapt
- Landing nav with `KolumnLockup`. No "Request access", no "Subscribe". The vulnerability CTA lives in the hero and in §7, not in the nav.

### 2. Hero — keep (adapt: no copper band)
- Plain `--surface-page`. The source's copper band is dropped: in Kolumn's palette copper means *failure* (error toasts/notices), and a security page shouldn't open on the failure hue.
- **h1** (`font-heading text-5xl md:text-6xl tracking-tight leading-[1.08]`, 425): `Security at Kolumn`
- **Subhead** (`text-lg text-[var(--text-secondary)] max-w-2xl`): `Your boards are yours. This page says what protects them, in the same words the code uses — and nothing the code doesn't do.`
- **CTAs** (row, gap 12): `Button variant="primary" size="lg"` → `Report a vulnerability` → `/responsible-disclosure` · `Button variant="secondary" size="lg"` → `Privacy policy` → `/privacy`.
- No illustration. (Klay may sit here as a small pixel illustration if the landing chrome family adopts him elsewhere; not required.)

### 3. Compliance matrix → **At a glance** — adapt (4 fact tiles)
- `grid sm:grid-cols-2 lg:grid-cols-4 gap-4`, each tile `rounded-xl border border-[var(--border-default)] bg-[var(--surface-card)] p-5`: Phosphor icon 20px `--text-secondary`, label `font-mono text-xs text-[var(--text-muted)] uppercase tracking-wide`, value `text-base font-semibold`.
  1. `ShieldCheck` · `Row-level security` · `On every table` — `[code: supabase/schema.sql — 21 tables, 21 "enable row level security"]`
  2. `UsersThree` · `Board access` · `Members only` — `[code: schema.sql policies "Members can view boards/columns/cards"]`
  3. `Brain` · `Training on your content` · `Never` — `[code: src/pages/PrivacyPage.jsx §2, src/components/settings/PrivacySection.jsx]`
  4. `Export` · `Export and delete` · `Self-serve, in Settings` — `[code: PrivacySection.jsx → exportData.js; AccountSection.jsx → DeleteAccountModal.jsx]`
- Not stat numbers (the landing dropped fake "10×" tiles for the same reason); these are four facts, each linking (`href="#…"`) to its control card below.

### 4. Compliance + Resources → **What protects your boards** — adapt (control cards)
- **h2** (`font-heading font-[425] text-3xl`): `What protects your boards`
- **p**: `Six controls, each one shipped. Where it lives in the app is noted so you can check it yourself.`
- `grid md:grid-cols-2 lg:grid-cols-3 gap-5`, each card `rounded-xl border border-[var(--border-default)] bg-[var(--surface-card)] p-6`: Phosphor icon 20px, h3 `text-base font-semibold`, body `text-sm leading-relaxed text-[var(--text-secondary)]`, then a footer line `font-mono text-xs text-[var(--text-muted)]` beginning `In the app:` (user-facing location, not file paths).
  1. **Access control** (`ShieldCheck`) — `Every table in Kolumn's database has row-level security switched on. Boards, columns and cards are readable and writable only by members of that board; workspace boards are visible to workspace members. Notes and chat threads are private to the account that made them. These rules run in the database, so they apply the same to the app, the AI and anyone with a database URL.` · In the app: `Board → Share to see who has access.` `[code: schema.sql — RLS on all 21 tables; policies at lines 269–291 (boards), 498–519 (columns), 555–576 (cards), 796–811 (notes), chat_threads/chat_messages per-user RLS from 2026-07-27-chat-persistence.sql]`
  2. **Sign-in and sessions** (`Key`) — `Sign-in runs on Supabase Auth. Settings → Account lists every active session with its device, approximate location and last activity. You can end any one of them, or sign out everywhere at once. Sign-in attempts are rate-limited.` · In the app: `Settings → Account → Active sessions.` `[code: SessionsList.jsx + accountClient.js listSessions/revokeSession; supabase/functions/account/index.ts GET /sessions, POST /revoke (refuses the current session); authStore.signOutEverywhere → signOut({ scope: 'global' }); schema.sql check_rate_limit + auth_rate_limits]`
  3. **Your data, your call** (`Export`) — `Export every board, column and card as JSON from Settings → Privacy, any time. Delete your account from Settings → Account; your content is removed from the live database. If you still own a board or workspace that other people belong to, deletion is blocked until you hand it over — so you can't take a team's board down by leaving.` · In the app: `Settings → Privacy → Export · Settings → Account → Delete account.` `[code: PrivacySection.jsx handleExport → utils/exportData.js buildExportPayload/downloadExport; DeleteAccountModal.jsx; account/index.ts POST /delete-account → 409 owned_shared_resources with blockers, then auth.admin.deleteUser]`
  4. **The AI and your content** (`Brain`) — `The AI sees the boards you've asked it to work on and nothing else — the same rows your account can read, sent to the model for that request. We don't use your content to train models. The pill can change one board at a time; chat can only read. Deletes and other destructive actions ask first and can be undone.` · In the app: `Settings → Privacy → "Your content is yours".` `[code: PrivacyPage.jsx §2 "we do not use your content to train AI models"; supabase/functions/chat/context.ts builds context from the caller's own RLS-scoped rows; chat/tier.ts (mode × tier) tool gating — chat mode has no write tools; toolExecutor.js isDestructive() confirmation + UndoListener in App.jsx]`
  5. **Between you and the server** (`LockKey`) — `Everything travels over HTTPS. The app is served with a Content-Security-Policy that only allows connections to Kolumn's own backend, plus error and analytics reporting; it can't be framed by another site, and browsers are told not to sniff content types or leak referrers.` · In the app: `View the response headers on any page.` `[code: public/serve.json — CSP default-src 'self', connect-src limited to *.supabase.co / *.sentry.io / *.posthog.com, frame-ancestors 'none'; X-Frame-Options DENY; X-Content-Type-Options nosniff; Referrer-Policy strict-origin-when-cross-origin; Permissions-Policy camera/microphone/geolocation off]`
  6. **The server checks, not the browser** (`Cloud`) — `Actions that need more than your own permissions — listing sessions, revoking one, deleting the account, calling the AI — run in server functions that verify your sign-in token first. The browser never holds an AI API key, and the server decides which AI tools your plan may use, not the client.` · In the app: `Nothing to click; this is how requests are handled.` `[code: account/index.ts "Caller identity comes ONLY from the verified JWT"; chat/index.ts auth.getUser() before any work; CLAUDE.md "no ANTHROPIC_API_KEY in the frontend"; tier.ts computes the effective tool list server-side]`
- Encryption: the in-app copy says "encrypted in transit and at rest" (`PrivacySection.jsx`, `PrivacyPage.jsx`). Card 5 states transit (we control it). At-rest is the database provider's property — see open questions before adding it to this page.

### 5. Compliance badges — **adapt (gated, ships hidden)**
- Content exposes `CERTIFICATIONS = []` (`{ name, scope, date, href }`). When non-empty, render an **h2** `Compliance` and a `grid sm:grid-cols-3 gap-4` of bordered tiles (name `font-semibold`, scope + date `font-mono text-xs text-[var(--text-muted)]`, optional link to a report request). When empty, **render nothing** — no "coming soon", no greyed badges, no "in progress" (that's a claim too).
- No compliance matrix table: Kolumn has one scope.

### 6. Subprocessors — keep (table)
- **h2**: `Who else touches your data`
- **p**: `Kolumn runs on a small number of services. This is the full list.`
- Table `font-mono text-sm`, 1px `--border-subtle` row dividers, header `text-xs uppercase text-[var(--text-muted)]`, columns *Service · What it does · Data it sees*; wrap in `overflow-x-auto`.
  | Supabase | Database, sign-in, realtime sync, file storage | Your account and everything on your boards |
  | Anthropic | Runs the AI for the pill and chat | The messages and board context of each AI request |
  | Sentry | Error reports | Stack traces and the state needed to reproduce a crash |
  | PostHog | Product analytics | How the app is used, in aggregate |
  `[code: PrivacyPage.jsx §3 lists exactly these four; serve.json connect-src allows exactly these hosts + Supabase]`
- Hosting provider is deliberately not listed — see open questions.

### 7. FAQ — keep (5 rows, `FAQPage` JSON-LD)
- **h2**: `Questions`
- Shared `FaqItem` (lifted from `LandingPage.jsx`, see careers spec §4):
  1. `Who can see my boards?` → `Members of that board, and members of the workspace if the board lives in one. That's enforced by row-level security in the database, not by the app hiding things.`
  2. `Do you train AI on my content?` → `No. Your content is sent to the model only to answer the request you just made, and we don't use it to train anything.`
  3. `Can I get my data out?` → `Yes — Settings → Privacy → Export downloads every board, column and card as JSON. Deleting your account is one screen over, in Settings → Account.`
  4. `Someone has my password. What do I do?` → `Change it from Settings → Account, then use "Log out everywhere" to end every session. You can also end a single session from the Active sessions list.`
  5. `Are you SOC 2 / ISO 27001 certified?` → open question — ship this row only with a true answer. Draft if none exist: `Not yet. Any certification we complete will be listed on this page with its date and scope; nothing is listed until it's real.`
- Row 6 in the source ("I found a security bug…") is promoted to its own section below rather than buried in the FAQ.

### 8. Updates feed — **drop**
- No compliance change log to publish. If §5 ever gets its first entry, revisit as a dated list under it.

### 9. Ask-a-question CTA → **Report a vulnerability** — adapt
- Band `bg-[var(--surface-sidebar)] border-y border-[var(--border-subtle)] py-24`, centered, `max-w-2xl`:
- **h2** (`font-heading font-[425] text-3xl md:text-4xl`): `Found something?`
- **p** (`text-[var(--text-secondary)]`): `If you've found a security issue in Kolumn, we'd like to hear about it before anyone else does. The disclosure page explains what to send and what to expect back.`
- **CTA**: `Button variant="primary" size="lg"` → `Report a vulnerability` → `/responsible-disclosure`. Secondary text link `Read the privacy policy →` → `/privacy`.
- Ink button, not red: reporting a bug is affirmative, not destructive.

Proportions kept from the source: 1px-bordered cards with 20–24px padding and ≈8–12px radius; h2 → intro p → grid rhythm; mono/meta text at 12–14px; FAQ as disclosure rows; the "found a bug" route as a first-class CTA.
Changed for Kolumn: no dashboard split (single scope); no copper hero band; no tabs, filter, document locker or gated resources; no compliance matrix; radius 12px on tiles (`rounded-xl`) rather than 8; Clash Grotesk 425 for h1/h2 instead of Inter 600/500.

## 4. Data and content sources
- `src/content/security.js` exports `HERO`, `AT_A_GLANCE` (4), `CONTROLS` (6, each `{ id, icon, title, body, inApp, code }` — `code` is a comment-only field rendered nowhere, kept so the claim rule is machine-checkable), `CERTIFICATIONS` (ships `[]`), `SUBPROCESSORS` (4), `FAQ` (rows with `a: null` filtered), `CTA`.
- Must stay in sync with: `supabase/schema.sql` (RLS coverage — add a Vitest that counts `create table` vs `enable row level security` and fails if they diverge, so the "every table" claim is tested, not asserted); `src/pages/PrivacyPage.jsx` §3 subprocessor list; `public/serve.json` CSP hosts; `src/components/settings/{AccountSection,PrivacySection}.jsx` labels quoted in "In the app" lines ("Active sessions", "Log out everywhere", "Export", "Delete account").
- `/about` value 03 paraphrases this page; if a control changes, update both.
- Page component: `src/pages/SecurityPage.jsx`, prerendered, landing chrome. Add a `Security` link to Settings → Privacy next to the Privacy Policy link.
- `/responsible-disclosure` is a separate spec (legal family); this page only links to it.

## 5. Open questions
- **SOC 2 / ISO 27001**: unknown. `CERTIFICATIONS` ships empty and FAQ row 5 ships hidden until someone confirms the true state.
- **GDPR / DPA**: no DPA exists in the repo. Do we offer one on request? Until answered, the page says nothing about GDPR.
- **Encryption at rest**: the app's own Privacy copy already claims it (Supabase-provided). Confirm we're comfortable repeating it on a marketing page and, if so, whether to name the provider's key management — otherwise card 5 stays transit-only.
- **Hosting provider**: the static host serving `dist/` (deploy notes say Railway) isn't referenced in code. List it as a subprocessor once confirmed; it sees IPs and request logs.
- **Backup retention**: `PrivacyPage.jsx` §6 mentions encrypted backups expiring "on the backup rotation schedule" without a number. Get the number or keep backups off this page.
