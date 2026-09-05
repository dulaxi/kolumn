# Usage Policy — marketing page spec

> Source crawled: https://www.anthropic.com/legal/aup on 2026-09-02. Metrics in `out/legal-aup.{json,txt,png,-mobile.png}`.
> Kolumn route: `/legal/usage-policy` (new) · Priority: P2 · Template family: legal — layout in `legal-template.md`; this file adds SEO and the section outline.

**No legal prose here. A lawyer drafts the text.**

## 1. Purpose and SEO target
- **Job**: the authoritative list of what users may not do with Kolumn and its AI features, referenced by the terms (§6) and by the AI provider's rules Kolumn inherits.
- **Query intent**: navigational only — "kolumn acceptable use". Also read by the provider's compliance reviewers.
- **`<title>`**: `Usage Policy · Kolumn` · **meta description**: "What you can and cannot do with Kolumn and its AI features, and how we enforce it." · OG same.
- **Structured data**: `WebPage` + `BreadcrumbList`.
- **Links in**: `/legal/terms` §6, footer, `/legal` index, in-app rate-limit/refusal notices (future). **Links out**: `/legal/terms`, `/legal/privacy`, the AI provider's usage policy (Anthropic — Kolumn's AI runs on their API and their policy binds Kolumn's users transitively), `/legal/responsible-disclosure` (security testing is governed there, not here), support address.

## 2. Source page anatomy (what Anthropic does)
Single `LegalPageDetail` layout (template §2). Page height 5,115px.
- Meta row with "Previous Version" link, no visible effective-date span captured (date lives in the archive link), rule, then six intro paragraphs (scope, three-tier structure as a `ul`, enforcement, reporting address, "calibrated" statement).
- Three tiers: "Universal Usage Standards" (a bold paragraph, not an h2), then **ten accordions** — `<button aria-expanded="false">` rows, 16px serif, full 640 measure, 1px bottom border in a subtle border tone, each expanding to a "This includes using our products or services to:" line + `ul` of 3–9 prohibited items. Then h2 "High-Risk Use Case Requirements" (25/30) and h2 "Additional Use Case Guidelines", each with `ul`s.
- No table, no TOC, `noindex, nofollow`. Mobile: accordions stack at full width.

## 3. Kolumn version — section outline
Same shell. **Flat h2 + `ul`** instead of accordions — Kolumn's list is short and hidden text in a policy is a bad default; if the category list ever grows past ~8, reuse the landing `FaqItem` disclosure component (1px row rule, chevron) rather than building a new accordion. Bold run-in labels in list items carry the sub-structure.

Intro (unnumbered): who it applies to (every account, every workspace member, anyone submitting text to the pill or chat), that it is part of the terms, that Kolumn's AI features are built on a third-party model provider whose own usage policy also applies (link), and where to report misuse.

1. **Follow the law and respect others** — no illegal content or activity; no infringement of others' IP or privacy; no harassment of workspace members; no impersonation (display names, invitations).
2. **Do not harm the service** — no probing, scanning or load testing outside the responsible-disclosure rules; no circumventing plan limits, tier gating or the daily AI message limit; no automated account creation; no scraping; no reselling access; no sharing credentials.
3. **Do not misuse the AI** — no attempts to make the AI act on boards you do not have access to; no prompt-injection against other members' boards (e.g. planting instructions in shared card text); no use of the AI for the categories the provider prohibits (weapons, CSAM, malware, violent extremism, fraud/misinformation, etc. — **lawyer condenses the provider's list into a short pointer plus the handful that plausibly apply to a kanban**); no presenting AI output as human-written where that deceives a person.
4. **High-stakes decisions** — Kolumn's AI is a project-management assistant; it must not be used as the sole basis for medical, legal, financial, employment, housing or safety decisions about people. (Source has a full "High-Risk Use Case Requirements" section with human-in-the-loop requirements; Kolumn needs one paragraph.)
5. **Content you bring in** — pasting notes, transcripts, threads or emails (the landing's capture story) is fine only when you have the right to share that content with your workspace and with the AI processor; no third-party personal data you are not permitted to process.
6. **Workspaces and sharing** — owners are responsible for members; do not invite people to content they should not see; do not spam invitations.
7. **Enforcement** — rate limits, AI refusals, warning, suspension, account termination; Kolumn may remove content; no refund for terminated paid accounts (**align with terms §3**).
8. **Reporting misuse** — address (`support@kolumn.app` or a dedicated abuse address — **open question**), what to include.
9. **Changes** — notice and effective date.

## 4. Data and content sources
`src/content/legal/usage-policy.md` with `effective`, `lastUpdated`, `version`. Code dependencies for the file header: `supabase/functions/chat/tier.ts` (limits and gating referenced in §2), `supabase/functions/chat/tools.ts` (what the AI can do, referenced in §3), `src/store/workspacesStore.js` / `boardSharingStore.js` (invitation flows in §6). Must stay consistent with terms §6 (which only summarises and links here).

## 5. Open questions
- Which of the provider's prohibited-use categories to enumerate versus incorporate by link — lawyer plus a check of the provider's current policy (use the `claude-api` skill/docs, do not paraphrase from memory).
- Dedicated abuse/report address or reuse support.
- Whether AI refusals in-product should link to this page (needs a `Refused` state in the pill/chat UI that does not exist today).
- Enforcement mechanics are not implemented (no suspend flag on `profiles`) — the policy can state the right without the tooling, but product should know.
