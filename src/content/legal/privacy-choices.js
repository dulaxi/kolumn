// Privacy choices — content only, no layout. Rendered by
// src/pages/marketing/LegalDocPage.jsx.
//
// Accuracy constraint (see CLAUDE.md task notes): this page must describe
// only controls that actually exist today. PostHog initializes
// unconditionally with no opt-out (src/lib/analytics.js, called
// unconditionally from src/main.jsx) and Sentry has no opt-out either. This
// file states plainly what is collected, that no working opt-out exists yet,
// and lists the missing controls as open items — it does not present a
// toggle or control that would not actually do anything.
//
// Grounded in: src/lib/analytics.js (PostHog init, no opt-out path),
// src/main.jsx (Sentry init, sampleRate 1.0, no opt-out path),
// src/lib/supabase.js (auth session storage), src/store/settingsStore.js
// (persisted local preferences: theme, sidebar, font, motion),
// src/store/chatStore.js (bounded local chat cache: 30 threads / 100
// messages per thread), src/lib/migrateLocalData.js (legacy migration
// flag), public/sw.js (service worker cache).
//
// Spec: docs/superpowers/specs/marketing/privacy-choices.md

export const PRIVACY_CHOICES = {
  title: 'Privacy choices',
  lastUpdated: '2026-09-02',
  sections: [
    {
      heading: '1. What this page covers',
      body: [
        "What Kolumn stores in your browser, what analytics and error-reporting tools we use, and where to find the account-level privacy controls that already exist in the app.",
        'The browser-storage items in section 2 are per browser — clearing your browser data or switching devices resets them. The account controls in section 7 apply to your account everywhere you sign in.',
      ],
    },
    {
      heading: '2. What Kolumn stores in your browser',
      body: [
        { list: [
          'Auth session — keeps you signed in. Required for the app to work.',
          'App preferences — theme, sidebar state, font, and motion settings. Stored locally so they persist between visits.',
          'Chat cache — a bounded local copy of your recent chat threads and messages (up to 30 threads, 100 messages each), used so chat loads quickly. The copy in Kolumn\'s database is the source of truth.',
          'Legacy migration flag — set once, only for accounts that had data from before Kolumn moved to its current database, so that data is not re-imported.',
          'Analytics identifiers — set when product analytics (PostHog) is enabled for this deployment. See section 3.',
          'Service worker cache — caches static app files so the app loads faster and can start while offline.',
        ] },
        'Kolumn does not use advertising cookies or third-party ad pixels.',
      ],
    },
    {
      heading: '3. Product analytics',
      body: [
        "When product analytics is enabled for this deployment, it starts automatically and records page views and in-product events, associated with your account id once you sign in.",
        "There is currently no control in Kolumn to opt out of analytics — this is an open item, listed in section 9, not a feature that exists today. Until it ships, the only way to avoid being included is to not use the app, or to block the analytics request yourself with browser tooling.",
        'We do not use this data for advertising and we do not sell it.',
      ],
    },
    {
      heading: '4. Error reporting',
      body: [
        'When error reporting is enabled for this deployment, Kolumn sends crash and error reports — stack traces, the page you were on, and basic browser information — so we can find and fix bugs.',
        'There is currently no opt-out for error reporting. [Placeholder — counsel and product have not yet decided whether one should be offered.]',
      ],
    },
    {
      heading: '5. Product emails',
      body: [
        '[Placeholder — product: sign-up currently references occasional product emails, but Settings has no email-preference control today. This needs to be built, or the reference needs to be removed, before this section can describe a real choice.]',
        'Account and security emails — sign-in, password reset, invitations — are not optional; they are necessary to run your account.',
      ],
    },
    {
      heading: '6. AI features',
      body: [
        "Kolumn's AI (the pill and chat) only processes your boards when you actively use it — there is no background processing of your board content by the AI. If you don't use those features, your content is never sent to the AI provider.",
        'See the Privacy Policy for exactly what is sent when you do use them.',
      ],
    },
    {
      heading: '7. Your account controls',
      body: [
        'These already exist in the app and apply to your account, not just this browser:',
        { list: [
          'Export your boards and cards as JSON from Settings → Privacy.',
          'Delete your account from Settings → Account, which removes your content from the live database.',
          'Review and revoke your active sessions from Settings → Account.',
        ] },
      ],
    },
    {
      heading: '8. Do Not Track and Global Privacy Control',
      body: [
        '[Placeholder — Kolumn does not currently detect or honor Do Not Track or Global Privacy Control browser signals. This section will describe real behavior once that is decided, rather than implying it is already respected.]',
      ],
    },
    {
      heading: '9. Open items',
      body: [
        "This page lists what's planned rather than implying it already exists:",
        { list: [
          'A real analytics opt-out, working for both signed-in users and anonymous visitors.',
          'A decision on whether error reporting should have an opt-out.',
          'A product-email preference in Settings, or removal of the sign-up copy that implies one exists.',
          'Do Not Track and Global Privacy Control support.',
        ] },
        'Until these ship, this section is the honest status of privacy choices at Kolumn.',
      ],
    },
    {
      heading: '10. Changes and contact',
      body: [
        "We'll update this page as these controls are built. Questions: hello@kolumn.app.",
      ],
    },
  ],
}
