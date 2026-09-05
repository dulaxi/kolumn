// Privacy Policy — content only, no layout. Rendered by
// src/pages/marketing/LegalDocPage.jsx.
//
// Moved verbatim from src/pages/PrivacyPage.jsx (deleted) onto the current
// legal-document template — no wording changed, only the container. The
// three list items in §1 and §5 carried inline <strong> emphasis in the
// old JSX shell; LegalDocPage's plain-string list rendering can't carry
// that emphasis, so the labels are flattened to plain text with the exact
// same words ("Account data — email, display name, tier."). This is a
// published, existing page (not a draft outline like usage-policy.js /
// responsible-disclosure.js / privacy-choices.js), so `draft: false`
// suppresses LegalDocPage's "pending legal review" notice.
//
// Known gaps against docs/superpowers/specs/marketing/privacy.md —
// controller entity, cookies/browser storage, sharing with other members,
// a dedicated security section, international transfers, children, legal
// bases, product-email consent, version history — are unaddressed here;
// see that spec's §3 diff and §5 open questions. Do not add language for
// these without counsel.

export const PRIVACY = {
  title: 'Privacy Policy',
  lastUpdated: '2026-07-22',
  draft: false,
  sections: [
    {
      heading: '1. What we collect',
      body: [
        { list: [
          'Account data — email, display name, tier.',
          'Your content — boards, columns, cards, chat messages.',
          'Usage data — product analytics events and error reports, tied to your account id.',
        ] },
      ],
    },
    {
      heading: '2. How we use it',
      body: [
        'To run Kolumn: storing your boards, syncing them in realtime, powering AI features you invoke, sending the emails you request, and understanding aggregate product usage. We do not sell your data and we do not use your content to train AI models.',
      ],
    },
    {
      heading: '3. Processors',
      body: [
        'Your data is handled by the infrastructure we run on: Supabase (database, auth — encrypted in transit), Anthropic (processes the messages and board context you send to the assistant), Sentry (error reports), and PostHog (product analytics).',
      ],
    },
    {
      heading: '4. AI requests',
      body: [
        "When you use the assistant, the message you type and relevant board context are sent to Anthropic's API to generate the response. We send only what the feature needs.",
      ],
    },
    {
      heading: '5. Your controls',
      body: [
        { list: [
          'Export all boards and cards as JSON from Settings → Privacy.',
          'Delete your account from Settings → Account; content is removed from the live database.',
          'Revoke active sessions from Settings → Account.',
        ] },
      ],
    },
    {
      heading: '6. Retention',
      body: [
        'Content is kept while your account exists. Deleted accounts are purged from the live database; residual copies in encrypted backups expire on the backup rotation schedule.',
      ],
    },
    {
      heading: '7. Changes and contact',
      body: [
        'Material changes to this policy will be announced in-app or by email. Questions: hello@kolumn.app.',
      ],
    },
  ],
}
