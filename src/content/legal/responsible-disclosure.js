// Responsible Disclosure Policy — content only, no layout. Rendered by
// src/pages/marketing/LegalDocPage.jsx.
//
// This is a section outline turned into plain-language draft text, not a
// lawyer-drafted policy — see the draft notice rendered at the top of the
// page. The safe-harbor language and any response-time or bounty commitment
// are legal/product decisions that have not been made; they are marked as
// placeholders rather than invented. Contact address is hello@kolumn.app.
//
// Grounded in: supabase/functions/* (in-scope edge functions: chat, account,
// check-email), supabase/schema.sql (row-level security scope), public/sw.js
// (service worker), src/App.jsx (no sandbox routes exist to exclude today).
//
// Spec: docs/superpowers/specs/marketing/responsible-disclosure.md

export const RESPONSIBLE_DISCLOSURE = {
  title: 'Responsible Disclosure Policy',
  lastUpdated: '2026-09-02',
  sections: [
    {
      heading: '1. Purpose',
      body: [
        "Kolumn is a small team, and boards can hold real work content, so we take security reports seriously and welcome good-faith research. If an issue you find lives in a provider we rely on — Supabase, Anthropic, Sentry, PostHog, or our hosting provider — please also report it to that provider directly.",
      ],
    },
    {
      heading: '2. Scope of systems',
      body: [
        'In scope:',
        { list: [
          'The production web app at kolumn.app.',
          "Kolumn's Supabase edge functions (chat, account, check-email).",
          "Kolumn's database access-control rules — row-level security on boards, cards, columns, workspaces, and chat data. Access-control bypasses are the most valuable reports.",
          'The service worker that runs in the browser.',
          'Authentication flows: sign-up, password reset, session revocation.',
        ] },
        'Out of scope:',
        { list: [
          'The underlying infrastructure of Supabase, Anthropic, Sentry, PostHog, or our hosting provider — report those to the provider directly.',
          'Any staging or sandbox routes that are not part of the production app.',
          'Third-party sites linked from Kolumn.',
        ] },
      ],
    },
    {
      heading: '3. What counts as a vulnerability',
      body: [
        'Generally in scope: a way to read, modify, or delete another account\'s boards, cards, or workspace data; a gap in row-level security; injection; cross-site scripting or request forgery; authentication or session flaws; an exposed secret or credential; server-side request forgery in an edge function.',
        'Generally out of scope: missing security-header best practices with no working proof of concept; social engineering or physical attacks against Kolumn\'s people; pure denial-of-service testing; and AI-model behavior on its own — a jailbreak, or an AI response you disagree with, is not by itself a security vulnerability.',
        'The exception: a prompt-injection technique that lets one board\'s content act on another user\'s session or cross a permission boundary is in scope, because that is an access-control bypass, not just a model-behavior complaint.',
      ],
    },
    {
      heading: '4. How to report',
      body: [
        'Email hello@kolumn.app with a clear description, the affected page or function, reproduction steps, and a proof of concept if you have one. Please report one issue per email so we can track it.',
        "Do not include another user's real data in your report — reproduce the issue with test data from an account you created yourself.",
        '[Placeholder — confirm whether a PGP key for encrypted reports will be published before this policy is final.]',
      ],
    },
    {
      heading: '5. Rules of engagement',
      body: [
        { list: [
          'Test only against accounts, boards, and workspaces you created yourself.',
          "Do not access, modify, or delete another user's content.",
          "If you accidentally access something you shouldn't have, stop testing and tell us.",
          'No automated scanning that could degrade the service for other users.',
          'No extortion, and no threatening to disclose an issue publicly before we have had a reasonable chance to address it.',
        ] },
        '[Placeholder — counsel to add any jurisdiction or sanctions-list language this section needs before it is final.]',
      ],
    },
    {
      heading: '6. What we aim to do in return',
      body: [
        '[Placeholder — counsel and product have not yet committed to a specific acknowledgement or fix-timeline SLA; do not treat any number here as promised until this section is finalized.]',
        "We intend to acknowledge reports, keep researchers updated as we investigate, and credit researchers publicly if they'd like to be credited. We will not share a reporter's identity without their permission.",
      ],
    },
    {
      heading: '7. Safe harbor',
      body: [
        '[Placeholder — this section is meant to state that good-faith research consistent with this policy will not be met with legal action from Kolumn. That commitment requires counsel review and is not binding until this section is finalized and this placeholder is removed.]',
      ],
    },
    {
      heading: '8. Rewards',
      body: [
        "Kolumn does not currently offer a paid bug bounty. We're glad to credit researchers publicly, with their permission, for reports that lead to a fix.",
      ],
    },
    {
      heading: '9. Changes to this policy',
      body: [
        "We may update this policy as Kolumn's systems change. Material changes will be announced on this page.",
      ],
    },
  ],
}
