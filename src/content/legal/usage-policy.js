// Usage Policy — content only, no layout. Rendered by
// src/pages/marketing/LegalDocPage.jsx.
//
// This is a section outline turned into plain-language draft text, not a
// lawyer-drafted policy — see the draft notice rendered at the top of the
// page. Anything that is a legal commitment (enforcement rights, content
// categories the AI provider prohibits, etc.) is marked as a placeholder
// rather than invented.
//
// Grounded in: supabase/functions/chat/tier.ts (daily message limit, tool
// gating referenced in §3), supabase/functions/chat/tools.ts (what the AI
// can do, referenced in §4), src/store/workspacesStore.js and
// src/store/boardSharingStore.js (invitation flows referenced in §7). Must
// stay consistent with terms §6, which only summarizes and links here.
//
// Spec: docs/superpowers/specs/marketing/usage-policy.md

export const USAGE_POLICY = {
  title: 'Usage Policy',
  lastUpdated: '2026-09-02',
  sections: [
    {
      heading: '1. Who this policy applies to',
      body: [
        'This policy applies to everyone who uses Kolumn: every account holder, every workspace or board member, and anyone submitting text into the pill or into chat. It is part of the Terms of Service.',
        "Kolumn's AI features run on a third-party model provider (Anthropic) through Kolumn's own server. That provider's usage policies also govern how it processes the requests Kolumn sends it.",
        'If you believe someone is violating this policy, see section 9 for how to report it.',
      ],
    },
    {
      heading: '2. Follow the law and respect others',
      body: [
        { list: [
          'No unlawful content or activity.',
          "No infringing another person's intellectual property or privacy.",
          'No harassing or abusing other members of a workspace or board.',
          'No impersonating another person or organization, including through display names or invitations.',
        ] },
      ],
    },
    {
      heading: '3. Do not harm the service',
      body: [
        { list: [
          'No probing, scanning, or load-testing the service outside what the Responsible Disclosure Policy allows.',
          'No circumventing plan limits, tier gating, or the daily AI message limit.',
          'No automated or bulk account creation.',
          'No scraping the service.',
          'No reselling access to Kolumn without our written permission.',
          'No sharing your account credentials with someone who is not you.',
        ] },
      ],
    },
    {
      heading: '4. Do not misuse the AI features',
      body: [
        "Do not attempt to make Kolumn's AI act on boards or workspaces you do not have access to.",
        "Do not plant hidden instructions in shared card text intended to manipulate another member's AI session when they open that board (prompt injection).",
        '[Placeholder — counsel to confirm the specific content categories to prohibit here, consistent with the underlying AI provider\'s own usage policy, rather than this page inventing its own list.]',
        'Do not present AI-generated text as human-written in a context where that would deceive someone relying on it.',
      ],
    },
    {
      heading: '5. High-stakes decisions',
      body: [
        "Kolumn's AI is a project-management assistant. It must not be used as the sole basis for medical, legal, financial, employment, housing, or safety decisions about a person — keep a person in the loop for decisions like that.",
      ],
    },
    {
      heading: '6. Content you bring in',
      body: [
        'Pasting notes, meeting transcripts, message threads, or emails into a board is fine only when you have the right to share that content with your workspace and with the AI processor Kolumn uses to run its AI features.',
        "Do not paste in another person's personal data that you are not permitted to process.",
      ],
    },
    {
      heading: '7. Workspaces and sharing',
      body: [
        'Workspace owners and admins are responsible for who they invite. Only invite people who should be able to see the boards and cards in that workspace, and do not use invitations to spam people who did not ask for them.',
      ],
    },
    {
      heading: '8. Enforcement',
      body: [
        '[Placeholder — counsel and product to finalize the specific enforcement mechanics before this section is final.] In general, Kolumn may rate-limit, warn, suspend, or terminate accounts that violate this policy, and may remove content that violates it. See the Terms of Service for how suspension and termination work.',
      ],
    },
    {
      heading: '9. Reporting misuse',
      body: [
        'Report a suspected violation of this policy to hello@kolumn.app with enough detail for us to look into it.',
        'Security vulnerabilities should go through the Responsible Disclosure Policy instead of this address.',
      ],
    },
    {
      heading: '10. Changes to this policy',
      body: [
        'We may update this policy as Kolumn changes. Material changes will be announced in-app or by email, the same way changes to the Terms of Service are announced.',
      ],
    },
  ],
}
