# Responsible Disclosure Policy — marketing page spec

> Source crawled: https://www.anthropic.com/responsible-disclosure-policy on 2026-09-02. Metrics in `out/legal-disclosure.{json,txt,png,-mobile.png}`, `out/probe-disclosure.txt`, `out/crop-disc-top.png`.
> Kolumn route: `/legal/responsible-disclosure` (new; source keeps it top-level — Kolumn folds it into the family) · Priority: P2 · Template family: legal — layout in `legal-template.md`; this file adds SEO and the section outline.

**No legal prose here. A lawyer drafts the safe-harbour and legal language; an engineer drafts scope and process.**

## 1. Purpose and SEO target
- **Job**: tell security researchers what is in scope, how to report, what Kolumn promises back, and that good-faith research will not be prosecuted. Also the page `security.txt` points to.
- **Query intent**: "kolumn security", "kolumn vulnerability disclosure", "kolumn bug bounty". Indexable (the source page is; it is a trust signal).
- **`<title>`**: `Responsible Disclosure · Kolumn` · **meta description**: "How to report a security vulnerability in Kolumn, what is in scope, and what we commit to in return." · OG same.
- **Structured data**: `WebPage` + `BreadcrumbList`.
- **Links in**: footer, `/legal` index, `/legal/privacy` §8 Security, `/.well-known/security.txt` (to add under `public/.well-known/`), the `/security` page (`security.md`). **Links out**: `/legal/privacy`, `/legal/usage-policy`, `/legal/terms`, the reporting address, third-party programs (Supabase, Anthropic) for issues in their infrastructure.

## 2. Source page anatomy (what Anthropic does)
This page uses the **hero variant**, not `LegalPageDetail`:
- `LandingPageSection` hero: padding-top 96, h1 52/52 700 centered in a 744px container, then "Last updated Feb 14, 2025" 15/21 sans 400 centered ≈48px below. No effective date, no "Previous Version", no language select, no rule.
- Second `LandingPageSection` (padding 48 top/bottom) holds the article at the 640 measure: one lead paragraph, then 7 h2s at 25/30 (mt 32 / mb 8): Purpose · Scope of Systems · Scope of Vulnerabilities (a 14-item exclusion `ul`) · How to Submit a Report (8-item "provide at minimum" `ul`, then an 11-item rules-of-engagement `ul`) · Your Expectations of Us (5-item `ul`: confidentiality, no legal action, attribution, acknowledge within 3 business days, keep updated) · Safe Harbor · Changes to this Policy.
- Report link goes to an external form; questions go to a `disclosure@` address; `usersafety@` for model-safety issues.
- Page height 6,392; footer 97px after the last paragraph. Mobile: h1 32/32, "Last updated" line centered above the lead.

## 3. Kolumn version — section outline
Use the **standard shell, not a hero variant** — one layout for the family. Meta row shows "Last updated <date>" (no `effective`) and "Version history". The lead paragraph is the one sentence that matters: Kolumn welcomes good-faith reports and will not pursue researchers who follow this policy.

1. **Purpose** — one paragraph; Kolumn is small, security matters because boards hold work content; researchers who find issues affecting shared providers should also report to those providers.
2. **Scope of systems** — in scope: the production web app at kolumn.app (SPA served statically), Kolumn's Supabase edge functions (`chat`, `account`, `check-email`), Kolumn's database policies (RLS on `boards`, `cards`, `columns`, `workspaces`, `chat_*`, etc. — access-control bypasses are the most valuable reports), the service worker (`public/sw.js`), auth flows (signup, password reset, session revoke). Out of scope: Supabase's, Anthropic's, PostHog's, Sentry's and the hosting provider's own infrastructure (report to them), any staging/sandbox routes (`/sandbox/*`), third-party sites linked from Kolumn.
3. **Scope of vulnerabilities** — in: authorisation bypass across boards/workspaces, RLS gaps, injection, XSS/CSRF, auth/session flaws, secret exposure, SSRF in edge functions, CSP bypass with impact. Out (mirror the source's exclusion list, trimmed): missing best-practice headers without a PoC, rate-limit findings on unauthenticated endpoints, social engineering, physical attacks, DoS, clickjacking on pages with no sensitive action, cookie flags, dependency-hijack theory without exploit, widely-published zero-days under 30 days old, **and AI-model behaviour** — jailbreaks, prompt-injection that only affects the researcher's own board, and "the AI said something wrong" are not security vulnerabilities (route to the usage-policy report address; prompt-injection that crosses a permission boundary *is* in scope).
4. **How to report** — address (**open question**: `security@kolumn.app`; no address exists in the repo), optional PGP key, what to include (type, severity, affected route/function, reproduction steps, PoC, impact, suggested fix), one issue per report, tell us your disclosure plans; do not include other users' data in the report.
5. **Rules of engagement** — test only with accounts and workspaces you created; do not access, modify or delete other users' content; stop and report on inadvertent access; no exfiltration; no automated scanning that degrades service; no attacks on Kolumn's people; no extortion; comply with law; sanctions-list clause (**lawyer**).
6. **What we commit to** — acknowledge within N business days (**open question**: source says 3), keep the reporter updated, not share the reporter's identity without consent, credit with permission, fix timeline target (**open question**), no legal action for good-faith research per §7.
7. **Safe harbour** — **lawyer**: good-faith research consistent with this policy is authorised; Kolumn will not pursue civil/criminal action or CFAA/DMCA-style claims; if a third party sues, Kolumn will state the research was authorised; this does not cover attacks on third parties.
8. **Rewards** — state plainly whether there is a bounty (**open question**; assume "no monetary bounty; public thanks" until decided).
9. **Changes** — new version + updated date on this page.

Also ship: `public/.well-known/security.txt` (`Contact:`, `Policy: https://kolumn.app/legal/responsible-disclosure`, `Expires:`, `Preferred-Languages: en`) — the CSP/headers in `public/serve.json` already serve static files; add the file and a `Canonical:` line.

## 4. Data and content sources
`src/content/legal/responsible-disclosure.md` with `lastUpdated`, `version` (no `effective`). Code dependencies for the file header: `supabase/functions/*` (in-scope functions), `supabase/schema.sql` (RLS scope), `public/serve.json` (headers/CSP), `src/App.jsx` (`/sandbox/*` routes are out of scope), `public/sw.js`. The reporting address must also appear in `security.txt` and in privacy §8 — one constant, three places.

## 5. Open questions
- Reporting address and whether to publish a PGP key.
- Acknowledgement SLA and remediation target — pick numbers Kolumn can honour with one maintainer.
- Bounty: none, thanks-only, or a hall-of-fame list on this page.
- Safe-harbour wording and jurisdiction (depends on the entity decision in `terms.md`).
- Whether Supabase's own bug-bounty terms constrain testing against a Supabase-hosted project (check their policy before publishing "in scope: edge functions").
