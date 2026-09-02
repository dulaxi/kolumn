# Terms of Service — marketing page spec

> Source crawled: https://www.anthropic.com/legal/consumer-terms on 2026-09-02. Metrics in `out/legal-terms.{json,txt,png,-mobile.png}`, `out/probe-terms.txt`, `out/crop-terms-top.png`, `out/crop-terms-mob.png`.
> Kolumn route: `/legal/terms` (redirect from `/terms`) · Priority: P1 · Template family: legal — layout is fully specified in `legal-template.md`; this file only adds SEO, the section outline, and the diff against `src/pages/TermsPage.jsx`.

**No legal prose here. A lawyer drafts the text.** The outline says what each section must cover so the draft reflects how Kolumn actually works.

## 1. Purpose and SEO target
- **Job**: the contract a user accepts at signup (Onboarding step 1 links here) — must be findable, current, and specific about AI features, plans and content ownership.
- **Query intent**: navigational — "kolumn terms of service", "kolumn terms". Secondary: "kolumn subscription cancel", "kolumn refund".
- **`<title>`**: `Terms of Service · Kolumn` · **meta description**: "The terms that govern your use of Kolumn — accounts, plans and billing, your content, AI features, and acceptable use." · OG title/description same.
- **Structured data**: `WebPage` + `BreadcrumbList` (Home › Legal › Terms of Service).
- **Links in**: Onboarding terms step (`OnboardingPage.jsx` ~401), marketing footer, `/legal` index, `/pricing` (plan terms), Settings → Billing (cancellation). **Links out**: `/legal/privacy`, `/legal/usage-policy`, `/pricing`, `/legal/responsible-disclosure` (security reports), support address.

## 2. Source page anatomy (what Anthropic does)
Single `LegalPageDetail` layout (see template §2). Specific to this page:
- Page height 14,553px at 1440w; 13 numbered h2 sections, 25/30, with a trailing period in the heading text ("1. Who we are.").
- Title band → meta row ("Effective October 8, 2025" · "Previous Version" → `/legal/archive/<uuid>` · language select) → 1px rule → four intro paragraphs (first one bold: "Welcome … please read these Terms"; defined terms bolded inline; a bold "Please note" paragraph routing API users to the Commercial Terms).
- Sections with sub-clauses render as `ol` (decimal) with nested `ol` for lettered items — §6 "Subscriptions, fees and payment" is five numbered clauses each opening with a bold run-in title ("Subscription cancellation.") and nested numbered items.
- Prohibited-use list in §3 is a `ul` of nine items; §4 lists five AI-output caveats.
- No TOC, no accordion, no table, `noindex, nofollow`.
- Mobile: title 36/36, meta row stacks, body unchanged.

## 3. Kolumn version — section outline
Render with `LegalDocument`. Numbered h2s keep the number in the text. Bold run-in titles inside `ol` items (source §6 pattern) are allowed for the billing section. Optional `InlineNotice` summary at the top (template §3).

Intro (unnumbered): who the agreement is between (Kolumn's legal entity — **open question**), what "Services" means (kolumn.app web app, boards, AI features, workspaces), that the Privacy Policy and Usage Policy are incorporated, how to contact.

1. **Who we are** — entity, address, contact address (`support@kolumn.app`).
2. **Eligibility and accounts** — minimum age (existing page says 18; brief has no source — **lawyer/owner decision**), one person per account, credential responsibility, organisation accounts (a user signing up on behalf of a company binds it), sessions (users can see/revoke sessions in Settings → Account).
3. **Plans, trials and billing** — must mirror `UpgradeProPage.jsx` and `tier.ts`: Free (20 AI messages/day, create-only pill actions, text-only chat); Pro $8/month or $80/year + tax, billed in advance, auto-renewing; 7-day trial where offered; what happens at trial end. Cancellation and refund policy (**open question** — nothing in code). Price changes need advance notice. **Billing is not live**: `UpgradeProPage`/`BillingSection` are Stripe stubs and the app promises "we'll email you before any charge when billing launches" — the terms must cover this early-access state (Pro activated without payment) and the switch to paid. Payment processor named once Stripe ships. Team tier: exists as a value only; do not state a price.
4. **Your content** — boards, columns, cards, checklists, notes, chat messages are the user's; Kolumn gets a limited licence to host, sync (realtime), display and process it to run the service; **no training of AI models on content**; content shared into a workspace or shared board is visible to its members; exporting content (Settings → Privacy) and what deletion does (link to privacy retention).
5. **AI features** — the pill and chat are powered by a third-party model provider (Anthropic) via Kolumn's server; board context is sent with each request (details in privacy); outputs may be wrong; the AI can create/move/update/complete/delete cards on the user's board — destructive actions ask for confirmation and offer undo, but the user owns the result; daily limits per plan; Kolumn may change models/limits; the user must also follow the provider-facing rules restated in the Usage Policy.
6. **Acceptable use** — short list plus a pointer to `/legal/usage-policy` as the authoritative list (source keeps the full list in the terms; Kolumn splits it — keep only the summary here).
7. **Workspaces and sharing** — workspace owners/admins control membership; inviting someone shares board content with them; owners are responsible for their members; leaving/removal effects; per-board sharing for personal boards.
8. **Third-party services** — Supabase (hosting/auth/database), Anthropic (AI), Sentry, PostHog, payment processor (when live); Kolumn is not responsible for content the user pastes in from other tools (notes, Slack threads, transcripts, email — the landing's capture story) or for those tools.
9. **Ownership, software and feedback** — Kolumn owns the service and brand; feedback licence; no reverse engineering/scraping; open-source components per their licences.
10. **Suspension and termination** — user deletion in Settings → Account (immediate, content purged per privacy); Kolumn's right to suspend for policy violations or non-payment; survival of sections.
11. **Disclaimers, limitation of liability, indemnity** — "as is", AI-output disclaimer, liability cap (existing text uses 12-month fees), user indemnity for workspace content.
12. **Changes to these terms** — notice in-app/by email for material changes; effective date and version archive on this page.
13. **Governing law and disputes** — **open question**: jurisdiction, venue, arbitration/consumer carve-outs.
14. **Contact** — support address; postal address if required.

### Diff against `src/pages/TermsPage.jsx` (10 sections today)
Existing sections map to: 1 Agreement → intro + §1/§2 · 2 Your account → §2 · 3 Your content → §4 · 4 Acceptable use → §6 · 5 AI features → §5 · 6 Plans and billing → §3 · 7 Disclaimer and liability → §11 · 8 Termination → §10 · 9 Changes → §12 · 10 Contact → §14.
**Missing vs the source and Kolumn's reality**: who-we-are/entity; concrete prices, periods, renewal, cancellation and refunds; the early-access "no charge yet" state; workspaces/sharing and member responsibility; third-party services; ownership/feedback/reverse-engineering; governing law and disputes; defined terms; effective date + version history; the Usage Policy reference. **Keep** the existing plain tone and the AI confirmation/undo sentence — it is accurate (`isDestructive()` in `toolExecutor.js`, delete toasts carry Undo).

## 4. Data and content sources
`src/content/legal/terms.md` with frontmatter per template §4 (`effective`, `lastUpdated`, `version`, `previous`). Code dependencies to list in the file header: `supabase/functions/chat/tier.ts` (`FREE_DAILY_LIMIT`, tool gating), `src/pages/UpgradeProPage.jsx` (`PRICES`, trial length), `src/components/settings/BillingSection.jsx` (cancellation flow), `src/lib/toolExecutor.js` (`isDestructive`). Archive the current 2026-07-22 text as `archive/terms-2026-07-22.md` so version 1 is preserved.

## 5. Open questions
- Legal entity, address, governing law and dispute mechanism.
- Minimum age (18 in the current page vs 13/16 with parental consent) and whether the onboarding terms step needs an explicit age checkbox.
- Refund/cancellation policy for Pro (pro-rata? end of period?) and what the 7-day trial converts to when billing is not live.
- Team tier: name it in the terms at all before pricing exists?
- Whether the AI section should reference the provider's own usage policy by link (source's terms incorporate their AUP by link).
