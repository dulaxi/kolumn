# Privacy Policy — marketing page spec

> Source crawled: https://www.anthropic.com/legal/privacy on 2026-09-02. Metrics in `out/legal-privacy.{json,txt,png,-mobile.png}`, `out/probe-privacy.txt`, `out/crop-privacy-table.png`.
> Kolumn route: `/legal/privacy` (redirect from `/privacy`) · Priority: P1 · Template family: legal — layout in `legal-template.md`; this file adds SEO, the section outline, and the diff against `src/pages/PrivacyPage.jsx`.

**No legal prose here. A lawyer drafts the text.** The outline fixes what each section must disclose, grounded in what the code actually does.

## 1. Purpose and SEO target
- **Job**: tell users and reviewers exactly what Kolumn collects, which processors touch it, what the AI sees, and how to export/delete. Linked from signup, the landing sign-in form and Settings → Privacy.
- **Query intent**: navigational — "kolumn privacy policy", "kolumn data", "does kolumn train on my data".
- **`<title>`**: `Privacy Policy · Kolumn` · **meta description**: "What Kolumn collects, where it is stored, what the AI sees, and how to export or delete your data. We do not train models on your content." · OG same.
- **Structured data**: `WebPage` + `BreadcrumbList`.
- **Links in**: onboarding (~410, ~791), landing sign-in disclaimer (~1471), `PrivacySection.jsx`, footer, `/legal` index, `DeleteAccountModal` (retention). **Links out**: `/legal/privacy-choices`, `/legal/terms`, `/legal/responsible-disclosure`, processor privacy pages (Supabase, Anthropic, Sentry, PostHog), support address.

## 2. Source page anatomy (what Anthropic does)
Single `LegalPageDetail` layout (template §2), but with the deeper heading scale: h2 32/38 600 (mt 64 / mb 32), h3 25/30 600 (mt 32 / mb 8). Page height 22,457px — the longest in the family.
- Meta row: "Effective July 8, 2026" · "Previous Version" · language select · rule.
- Four intro paragraphs (who they are, scope, pointer to a separate non-user policy, pointer to §4 rights).
- 11 numbered h2s: 1 Collection (three h3s: provided directly / received automatically / training data) · 2 Uses · 3 Recipients and third-party sources · 4 Rights and Choices (nine-item `ul` of rights with bold run-in labels, then "manage in Privacy Settings") · 5 Data transfers · 6 Retention, lifecycle, security (two h3s) · 7 Children · 8 Changes · 9 Contact (controller entities as `li`, DPO email, supervisory-authority links) · 10 Legal bases table (tinted 640px panel, 3 columns, bulleted cells) · 11 Regional supplemental disclosures (three h3s).
- Bold run-in labels inside `li` ("Identity and Contact Data:") carry the structure of the collection lists.
- `noindex, nofollow`. No TOC. Mobile: h2 23/28, table panel shrinks to 278px and loses cell padding.

## 3. Kolumn version — section outline
Same shell and one heading scale (template: h2 22/28, h3 16/24). Use bold run-in labels in lists as the source does. Use the bordered table wrapper (template §3) for the legal-bases table and the storage table.

Intro (unnumbered): controller identity (**open question**: entity), scope (kolumn.app, the app, marketing site, emails), summary of the three promises already on the Settings page — stored in Supabase Postgres encrypted in transit and at rest; never sold; never used to train AI models. Pointer to `/legal/privacy-choices`.

1. **Data we collect** — h3 *You provide*: account (email, password via Supabase Auth, display name, nickname, role/plan choice from onboarding, tier, trial end date); content (boards, columns, cards incl. title/description/assignees/labels/checklists/due dates, notes, chat threads and messages, templates); workspace and board membership and invitations (invitee emails); support emails. h3 *Collected automatically*: product analytics events and pageviews (PostHog, identified by user id after sign-in, `localStorage+cookie` persistence), error reports (Sentry — stack traces, browser, URL; no session replay configured), server logs from edge functions (AI request usage: token counts, mode, tier — `[chat] usage`), daily AI message counts (`chat_usage`), session records (device/IP as held by Supabase Auth, shown in Settings → Account). h3 *From other users*: your name/email appears in other people's boards when you are invited, assigned or mentioned; assignees may be free-text names typed by others (`assignee_refs` with `id: null`).
2. **How we use it** — run and sync the service (realtime), provide AI features, enforce plan limits, send transactional email (auth, invitations, password reset), product emails (the landing sign-in text says users "agree to get occasional product emails" — **must match a real preference, see privacy-choices**), analytics to improve the product, security and abuse prevention, legal compliance.
3. **AI processing** — the section reviewers read first. What is sent to Anthropic's API on each pill/chat request: the message, conversation history (bounded), and a system prompt built from the user's boards (board and column names, first 10 card titles per column, overdue/due-today cards, 7-day activity counts, notes excerpts, workspace member names) — per `supabase/functions/chat/context.ts`. Chat threads are stored in Supabase (`chat_threads`/`chat_messages`). Kolumn does not train models; whether the provider retains API inputs and for how long is governed by the provider's API terms (**open question**: confirm current Anthropic API retention/zero-retention status and state it accurately). AI actions write to the user's own boards only.
4. **Processors and recipients** — table: Supabase (database, auth, realtime, edge functions, storage region — **open question**), Anthropic (AI model API), Sentry (errors), PostHog (analytics; host `VITE_POSTHOG_HOST`), static hosting (Railway per memory; confirm), email delivery (Supabase Auth SMTP — **open question**: which provider), payment processor (Stripe — only once billing is live). Other users: workspace/board members see shared content. Legal requests. No sale, no ad networks.
5. **Cookies and browser storage** — pointer to `/legal/privacy-choices`; summarise: Supabase auth session (strictly necessary), local preferences (`settingsStore`: theme, sidebar, font, motion), PostHog analytics cookie + localStorage, migration flag for legacy local data.
6. **Your rights and controls** — what exists in-product: export boards/columns/cards as JSON (Settings → Privacy, `exportData.js`); delete account (Settings → Account — purges live data, see retention); revoke sessions; edit profile fields. Regional rights (access, correction, deletion, portability, objection, restriction, withdrawal, complaint to an authority) — **lawyer drafts**; how to submit a request (email) and verification. Note chat threads and notes are not in the JSON export today (**open question / product gap**).
7. **Retention** — content kept while the account exists; deletion removes rows from the live database; encrypted backups expire on the provider's rotation schedule (**open question**: state the actual window); `chat_usage` daily counters; analytics retention per PostHog project settings; Sentry event retention; archived invitations.
8. **Security** — Postgres row-level security on every table, members-only board access, TLS, encryption at rest, sessions list/revoke, CSP headers (`public/serve.json`); link to `/legal/responsible-disclosure` for reporting; no SOC 2 claim (unknown).
9. **International transfers** — where data is stored (Supabase region) and the transfer mechanism for EU/UK users (**lawyer**).
10. **Children** — minimum age consistent with the terms; no knowing collection below it.
11. **Legal bases** (EU/UK) — table purpose × data × basis (contract, legitimate interest, consent, legal obligation) — **lawyer**.
12. **Changes** — notice for material changes; effective date and archive on this page.
13. **Contact** — support address, DPO/representative if required (**open question**).

### Diff against `src/pages/PrivacyPage.jsx` (7 sections today)
Existing → new: 1 What we collect → §1 (expand: membership/invitation data, sessions, server logs, data from other users, onboarding role/trial fields) · 2 How we use it → §2 · 3 Processors → §4 (table; add hosting, email, future Stripe) · 4 AI requests → §3 (state exactly what board context is sent; provider retention) · 5 Your controls → §6 (add regional rights, request process, export gaps) · 6 Retention → §7 (real backup window) · 7 Changes and contact → §12 + §13.
**Missing entirely**: controller identity, cookies/browser storage, sharing with other members, security section, international transfers, children, legal bases, product-email consent, version history. **Keep**: the three plain promises (Supabase/encrypted, never sold, never trained on) — they already match `PrivacySection.jsx` copy and must stay word-for-word consistent across app and policy.

## 4. Data and content sources
`src/content/legal/privacy.md`. Code dependencies to list in the file header: `src/lib/env.js` + `src/lib/analytics.js` (processors, PostHog config), `src/main.jsx` (Sentry init: `sampleRate: 1.0`, no PII flag), `supabase/functions/chat/context.ts` (what the AI sees), `supabase/schema.sql` (tables collected), `src/components/settings/{PrivacySection,AccountSection,SessionsList,DeleteAccountModal}.jsx` (controls), `src/utils/exportData.js` (export scope), `public/serve.json` (CSP/hosts). Archive current text as `archive/privacy-2026-07-22.md`.

## 5. Open questions
- Controller entity, address, DPO/EU representative, and the supervisory-authority language.
- Supabase project region and backup retention window; email delivery provider.
- Anthropic API data-retention terms that apply to Kolumn's key (zero-retention or default) — must be verified with the `claude-api` skill/docs before it is written down.
- Whether "occasional product emails" consent is real (no preference exists in Settings) — either build the preference or drop the sentence from the landing form.
- Export scope gap: chat threads and notes are not exported; decide whether to extend `exportData.js` before the policy claims full export.
