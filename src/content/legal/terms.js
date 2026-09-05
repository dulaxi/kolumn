// Terms of Service — content only, no layout. Rendered by
// src/pages/marketing/LegalDocPage.jsx.
//
// Moved verbatim from src/pages/TermsPage.jsx (deleted) onto the current
// legal-document template — no wording changed, only the container. This
// is a published, existing page (not a draft outline like usage-policy.js
// / responsible-disclosure.js / privacy-choices.js), so `draft: false`
// suppresses LegalDocPage's "pending legal review" notice.
//
// Known gaps against docs/superpowers/specs/marketing/terms.md — entity
// name, governing law/disputes, concrete billing/cancellation specifics,
// workspaces and sharing, third-party services list, ownership/feedback,
// version history — are unaddressed here; see that spec's §3 diff and §5
// open questions. Do not add language for these without counsel.

export const TERMS = {
  title: 'Terms of Service',
  lastUpdated: '2026-07-22',
  draft: false,
  sections: [
    {
      heading: '1. Agreement',
      body: [
        'By creating an account or using Kolumn, you agree to these Terms and confirm you are at least 18 years old. If you use Kolumn on behalf of an organization, you represent that you can bind that organization.',
      ],
    },
    {
      heading: '2. Your account',
      body: [
        'You are responsible for your credentials and for activity under your account. Keep your password safe and tell us promptly about any unauthorized use.',
      ],
    },
    {
      heading: '3. Your content',
      body: [
        'Boards, cards, and messages you create are yours. You grant us a limited license to store, process, and display that content solely to operate and improve the service infrastructure — we do not sell it and do not use it to train AI models.',
      ],
    },
    {
      heading: '4. Acceptable use',
      body: [
        { list: [
          'No unlawful, infringing, or abusive content or activity.',
          'No attempts to probe, disrupt, or overload the service.',
          'No reselling or scraping the service without written permission.',
        ] },
      ],
    },
    {
      heading: '5. AI features',
      body: [
        "Kolumn's assistant is powered by third-party AI models. AI output can be wrong or incomplete; review it before relying on it. Destructive AI actions ask for confirmation, and deletes offer an undo, but you remain responsible for changes made in your workspace.",
      ],
    },
    {
      heading: '6. Plans and billing',
      body: [
        'Paid plans renew until cancelled. Where a trial is offered, you can cancel before it ends without charge. We will notify you before billing begins on any early-access plan.',
      ],
    },
    {
      heading: '7. Disclaimer and liability',
      body: [
        'Kolumn is provided "as is" without warranties of any kind, to the maximum extent permitted by law. To the same extent, our total liability for any claim is limited to the amount you paid us in the twelve months before the claim arose.',
      ],
    },
    {
      heading: '8. Termination',
      body: [
        'You can delete your account at any time in Settings. We may suspend or terminate accounts that violate these Terms. On deletion, your content is removed per the Privacy Policy.',
      ],
    },
    {
      heading: '9. Changes',
      body: [
        'We may update these Terms; material changes will be announced in-app or by email. Continued use after changes take effect means you accept them.',
      ],
    },
    {
      heading: '10. Contact',
      body: [
        'Questions: hello@kolumn.app.',
      ],
    },
  ],
}
