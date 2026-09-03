// Content for /security. See docs/superpowers/specs/marketing/security.md §3-4.
//
// Claim rule: every CONTROLS entry carries a `code` field naming the file(s)
// that back its claim. `code` is not rendered — it exists so the claim stays
// checkable against the codebase. Do not add a sentence here without a tag.
//
// Verified against the codebase on 2026-09-02:
//   - RLS: supabase/schema.sql has 21 `create table` and 21
//     `enable row level security` statements (one per table, no gaps).
//   - Sessions: src/components/settings/AccountSection.jsx (SessionsList,
//     "Log out everywhere") + supabase/functions/account/index.ts
//     (GET /sessions, POST /revoke, refuses the current session).
//   - Export/delete: src/components/settings/PrivacySection.jsx (Export) +
//     AccountSection.jsx (Delete account) + account/index.ts POST
//     /delete-account (409 owned_shared_resources when boards/workspaces
//     are still shared with others).
//   - No training on content: src/pages/PrivacyPage.jsx §2.
//   - CSP/headers: public/serve.json.
//   - Server-side auth: supabase/functions/account/index.ts and
//     supabase/functions/chat/index.ts both call auth.getUser() against the
//     caller's JWT before doing anything; chat/context.ts queries with that
//     same user-scoped client, so the AI only ever sees RLS-visible rows;
//     supabase/functions/chat/tier.ts computes the effective tool list
//     server-side from (mode × tier) — chat mode gets no write tools.
//
// Not claimed, because the code doesn't support it (weakened from the spec's
// draft language — see security.md §5 open questions): SOC 2 / ISO 27001,
// a signed DPA, penetration testing, uptime guarantees, and any specifics
// about encryption at rest or backup retention. Card 5 ("Between you and
// the server") stays scoped to transit + headers for the same reason.

export const CONTACT_EMAIL = 'hello@kolumn.app'

export const SECURITY_META = {
  title: 'Security at Kolumn',
  description:
    'How Kolumn protects your boards: row-level security on every table, members-only access, session control, and no training on your content.',
  ogTitle: 'Security at Kolumn',
  ogDescription:
    'How Kolumn protects your boards: row-level security on every table, members-only access, session control, and no training on your content.',
}

export const HERO = {
  heading: 'Security at Kolumn',
  subhead:
    "Your boards are yours. This page says what protects them, in the same words the code uses — and nothing the code doesn't do.",
  primary: { label: 'Report a vulnerability', href: `mailto:${CONTACT_EMAIL}?subject=Security%20report` },
  secondary: { label: 'Privacy policy', to: '/privacy' },
}

export const AT_A_GLANCE = {
  heading: 'At a glance',
  items: [
    { id: 'rls', icon: 'ShieldCheck', label: 'Row-level security', value: 'On every table' },
    { id: 'access', icon: 'UsersThree', label: 'Board access', value: 'Members only' },
    { id: 'training', icon: 'Brain', label: 'Training on your content', value: 'Never' },
    { id: 'export', icon: 'Export', label: 'Export and delete', value: 'Self-serve, in Settings' },
  ],
}

export const CONTROLS = {
  heading: 'What protects your boards',
  lede: 'Six controls, each one shipped. Where it lives in the app is noted so you can check it yourself.',
  items: [
    {
      id: 'access-control',
      icon: 'ShieldCheck',
      title: 'Access control',
      body: "Every table in Kolumn's database has row-level security switched on. Boards, columns and cards are readable and writable only by members of that board; workspace boards are visible to workspace members. Notes and chat threads are private to the account that made them. These rules run in the database, so they apply the same to the app, the AI and anyone with a database URL.",
      inApp: 'Board → Share to see who has access.',
      code: 'supabase/schema.sql — RLS on all 21 tables; policies for boards, columns, cards, notes; chat_threads/chat_messages per-user RLS',
    },
    {
      id: 'sessions',
      icon: 'Key',
      title: 'Sign-in and sessions',
      body: 'Sign-in runs on Supabase Auth. Settings → Account lists every active session with its device, approximate location and last activity. You can end any one of them, or sign out everywhere at once. Sign-in attempts are rate-limited.',
      inApp: 'Settings → Account → Active sessions.',
      code: 'src/components/settings/{AccountSection,SessionsList}.jsx; supabase/functions/account/index.ts GET /sessions, POST /revoke; authStore.signOutEverywhere; schema.sql auth_rate_limits',
    },
    {
      id: 'your-data',
      icon: 'Export',
      title: 'Your data, your call',
      body: "Export every board, column and card as JSON from Settings → Privacy, any time. Delete your account from Settings → Account; your content is removed from the live database. If you still own a board or workspace that other people belong to, deletion is blocked until you hand it over — so you can't take a team's board down by leaving.",
      inApp: 'Settings → Privacy → Export · Settings → Account → Delete account.',
      code: 'src/components/settings/PrivacySection.jsx + src/utils/exportData.js; DeleteAccountModal.jsx; supabase/functions/account/index.ts POST /delete-account (409 owned_shared_resources)',
    },
    {
      id: 'ai-and-content',
      icon: 'Brain',
      title: 'The AI and your content',
      body: "The AI sees the boards you've asked it to work on and nothing else — the same rows your account can read, sent to the model for that request. We don't use your content to train models. The pill can change one board at a time; chat can only read. Deletes and other destructive actions ask first and can be undone.",
      inApp: 'Settings → Privacy → "Your content is yours".',
      code: 'src/pages/PrivacyPage.jsx §2; supabase/functions/chat/context.ts (user-scoped client); supabase/functions/chat/tier.ts (mode × tier) tool gating; src/lib/toolExecutor.js isDestructive(); UndoListener in App.jsx',
    },
    {
      id: 'in-transit',
      icon: 'LockKey',
      title: 'Between you and the server',
      body: "Everything travels over HTTPS. The app is served with a Content-Security-Policy that only allows connections to Kolumn's own backend, plus error and analytics reporting; it can't be framed by another site, and browsers are told not to sniff content types or leak referrers.",
      inApp: 'View the response headers on any page.',
      code: "public/serve.json — CSP default-src 'self', connect-src limited to Supabase/Sentry/PostHog; X-Frame-Options DENY; X-Content-Type-Options nosniff; Referrer-Policy strict-origin-when-cross-origin; Permissions-Policy camera/microphone/geolocation off",
    },
    {
      id: 'server-checks',
      icon: 'Cloud',
      title: 'The server checks, not the browser',
      body: 'Actions that need more than your own permissions — listing sessions, revoking one, deleting the account, calling the AI — run in server functions that verify your sign-in token first. The browser never holds an AI API key, and the server decides which AI tools your plan may use, not the client.',
      inApp: 'Nothing to click; this is how requests are handled.',
      code: 'supabase/functions/account/index.ts (identity from the verified JWT only); supabase/functions/chat/index.ts auth.getUser() before any work; supabase/functions/chat/tier.ts computes the effective tool list server-side',
    },
  ],
}

// Ships empty — no certifications exist yet. Render nothing when empty; no
// "coming soon" placeholder (security.md §3.5 — that's a claim too).
// Each entry, when real, is { name, scope, date, href }.
export const CERTIFICATIONS = []

export const SUBPROCESSORS = {
  heading: 'Who else touches your data',
  lede: 'Kolumn runs on a small number of services. This is the full list.',
  columns: ['Service', 'What it does', 'Data it sees'],
  rows: [
    { service: 'Supabase', does: 'Database, sign-in, realtime sync, file storage', sees: 'Your account and everything on your boards' },
    { service: 'Anthropic', does: 'Runs the AI for the pill and chat', sees: 'The messages and board context of each AI request' },
    { service: 'Sentry', does: 'Error reports', sees: 'Stack traces and the state needed to reproduce a crash' },
    { service: 'PostHog', does: 'Product analytics', sees: 'How the app is used, in aggregate' },
  ],
}

export const FAQ = [
  {
    q: 'Who can see my boards?',
    a: "Members of that board, and members of the workspace if the board lives in one. That's enforced by row-level security in the database, not by the app hiding things.",
  },
  {
    q: 'Do you train AI on my content?',
    a: "No. Your content is sent to the model only to answer the request you just made, and we don't use it to train anything.",
  },
  {
    q: 'Can I get my data out?',
    a: 'Yes — Settings → Privacy → Export downloads every board, column and card as JSON. Deleting your account is one screen over, in Settings → Account.',
  },
  {
    q: 'Someone has my password. What do I do?',
    a: 'Change it from Settings → Account, then use "Log out everywhere" to end every session. You can also end a single session from the Active sessions list.',
  },
  {
    q: 'Are you SOC 2 or ISO 27001 certified?',
    a: 'Not yet. Any certification we complete will be listed on this page with its date and scope; nothing is listed until it is real.',
  },
]

export const CTA = {
  heading: 'Found something?',
  body: "If you've found a security issue in Kolumn, we'd like to hear about it before anyone else does. Email us and we'll follow up.",
  primary: { label: 'Report a vulnerability', href: `mailto:${CONTACT_EMAIL}?subject=Security%20report` },
  secondary: { label: 'Read the privacy policy', to: '/privacy' },
}
