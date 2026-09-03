// Content for the /support hub and /support/<slug> articles. Structured as
// plain data — see src/content/pricing.js for the pattern this follows.
//
// Six categories, four article entries each. Two entries carry a full
// `body` (markdown, rendered with react-markdown in SupportArticlePage —
// same dependency the chat surface already uses). Every other entry is a
// title + one-line `summary` with `body: null`; SupportArticlePage renders
// a "coming soon" state for those instead of an empty page.
//
// Accuracy: the daily-limit article's "20 messages a day" and the shared
// pill/chat counter must stay in sync with FREE_DAILY_LIMIT in
// supabase/functions/chat/tier.ts. The export/delete article must stay in
// sync with src/utils/exportData.js, src/components/settings/PrivacySection.jsx,
// src/components/settings/DeleteAccountModal.jsx and
// supabase/functions/account/index.ts's /delete-account route.

export { CONTACT_EMAIL as SUPPORT_CONTACT } from './pricing'

export const SUPPORT_META = {
  title: 'Kolumn support',
  description:
    'Answers about boards, cards, the AI pill and chat, workspaces, billing, and your data. Browse by topic or write to us.',
  ogTitle: 'Kolumn support',
  ogDescription:
    'Answers about boards, cards, the AI pill and chat, workspaces, billing, and your data. Browse by topic or write to us.',
}

const DAILY_LIMIT_BODY = `If you see **"You've reached your daily limit of 20 messages. Upgrade to Pro for unlimited access."** in the pill or in chat, you're on the Free plan and have sent 20 AI messages today. Nothing is broken, and nothing you typed was lost.

## What counts as a message

Every time you press Enter in the pill or send a message in chat and Kolumn asks the AI to respond, that's one message. Both surfaces draw from the same daily allowance — **20 messages a day on Free**.

Things that do **not** count against the limit:

- **Lists in the pill.** Type several items separated by commas or line breaks and Kolumn splits them into cards itself, without calling the AI at all.
- **Follow-up steps inside one request.** When the AI creates a card, then moves it, then reports back, that's still one message no matter how many steps it takes.
- **The short title Kolumn writes for a new chat thread.** That's background housekeeping, not a message you sent.
- **Drag-and-drop, editing cards by hand, and search.** None of these touch the AI.

## When the counter resets

The count is tracked per calendar day on the server and starts over once a day. If you're close to the limit late in your day, a reset isn't far off.

## What you can do right now

- **Keep working without the AI.** Boards, cards, drag-and-drop, and the pill's comma/newline list splitting all keep working — only AI responses pause.
- **Batch your asks.** One message like "add cards for the three follow-ups from today's call, all due Friday" costs the same as a single word.
- **Upgrade to Pro.** Pro removes the daily limit and turns on every AI tool in the pill — move, update, complete, and reorganize, not just create. Pro is priced at $8 a month; paid billing hasn't launched yet, so upgrading today doesn't charge a card. Open \`Settings → Billing\` in the app, or see [Upgrade to Pro](/upgrade/pro).

## If you see a different message

A generic error means Kolumn couldn't confirm your usage count and is refusing the request rather than guessing. Wait a moment and try again — if it keeps happening, check [status](/status) and then [write to us](mailto:hello@kolumn.app).`

const EXPORT_DELETE_BODY = `Your boards are yours. You can take a copy at any time, and you can delete your account without asking anyone. Both live in Settings.

## Export a backup

1. Open **Settings** from the bottom-left of the sidebar.
2. Go to **Privacy**.
3. Click **Export**. Your browser downloads a file named \`kolumn-backup-YYYY-MM-DD.json\`.

The file contains every **board, column, and card** you have loaded in Kolumn, plus an \`exported_at\` timestamp. It does not include chat threads, workspace membership, or invitations — those aren't part of the backup. Kolumn cards don't carry file attachments, so there's nothing there to miss.

The export is plain JSON and isn't encrypted, so treat the file like any other document that has your work in it.

## Delete your account

Deleting your account removes your profile and every board, column, and card you own. **There is no undo**, and support can't restore a deleted account.

1. Export a backup first if you want one (above).
2. Open \`Settings → Account\` and scroll to **Danger zone**.
3. Click **Delete account**.
4. Type your email address exactly as shown, then click **Delete my account**.

You're signed out immediately and the account is gone.

### "Transfer or delete these first"

If you still **own a workspace or board that other people belong to**, Kolumn stops the deletion and lists them by name. Deleting your account would take those boards away from everyone else on them. Hand off ownership or delete each item yourself, then try again.

## Related actions in Settings

- **Cancel a paid plan** without deleting anything: \`Settings → Billing → Cancel plan\`. You move to Free immediately and keep every board.
- **Sign out of every device**: \`Settings → Account → Log out everywhere\`. Useful if you've lost a device and don't want to delete anything.
- **Stop sharing a board** instead of deleting it: remove members from the board's share menu.

If you need something the export doesn't cover, or you deleted your account and want to confirm it's gone, [write to us](mailto:hello@kolumn.app) from the email that was on the account.`

// icon: a Phosphor component name, resolved in SupportPage.jsx (same
// pattern as content/connectors.js and content/templates.js).
export const SUPPORT_CATEGORIES = [
  {
    slug: 'getting-started',
    label: 'Getting started',
    icon: 'Sparkle',
    summary: 'Your first board, the pill, and where things live.',
    articles: [
      {
        slug: 'what-is-kolumn',
        title: 'What is Kolumn?',
        summary: 'A kanban that stayed a kanban, with an AI that runs the busywork.',
        body: null,
      },
      {
        slug: 'your-getting-started-board',
        title: 'Your getting-started board',
        summary: 'What the seeded board shows you and what to try first.',
        body: null,
      },
      {
        slug: 'create-a-board-from-a-template',
        title: 'Create a board from a template',
        summary: 'Pick a board template, or start blank and add columns.',
        body: null,
      },
      {
        slug: 'keyboard-shortcuts-and-search',
        title: 'Keyboard shortcuts and search',
        summary: '⌘K search, and the shortcuts that move you around.',
        body: null,
      },
    ],
  },
  {
    slug: 'boards-and-cards',
    label: 'Boards & cards',
    icon: 'Kanban',
    summary: 'Columns, cards, and the fields on them.',
    articles: [
      {
        slug: 'anatomy-of-a-card',
        title: 'Anatomy of a card',
        summary: 'Title, description, icon, priority, due date, labels, checklist, assignees, task number.',
        body: null,
      },
      {
        slug: 'move-reorder-and-complete-cards',
        title: 'Move, reorder, and complete cards',
        summary: 'Drag between columns, sort within one, mark done.',
        body: null,
      },
      {
        slug: 'add-rename-and-delete-columns',
        title: 'Add, rename, and delete columns',
        summary: 'Column basics, and what happens to cards in a deleted column.',
        body: null,
      },
      {
        slug: 'undo-a-delete',
        title: 'Undo a delete',
        summary: 'Deleted cards and columns get an Undo in the toast — here is how long you have.',
        body: null,
      },
    ],
  },
  {
    slug: 'ai-pill-and-chat',
    label: 'The AI pill & chat',
    icon: 'ChatCircleDots',
    summary: 'Plain-language actions on a board, and questions about all of them.',
    articles: [
      {
        slug: 'what-the-pill-can-do',
        title: 'What the pill can do',
        summary: 'Type intent on a board; the AI creates, moves, updates, and completes cards there.',
        body: null,
      },
      {
        slug: 'add-many-cards-at-once',
        title: 'Add many cards at once',
        summary: 'Comma- or newline-separated lists become cards instantly, no AI call.',
        body: null,
      },
      {
        slug: 'daily-limit',
        title: 'Why did the AI say I hit my daily limit?',
        summary: "The Free plan's 20-message day, what counts, and when it resets.",
        updated: '2026-09-02',
        related: ['what-the-pill-can-do', 'add-many-cards-at-once', 'free-vs-pro'],
        tags: ['limit', 'free', 'pro', 'pill', 'chat', '20 messages'],
        body: DAILY_LIMIT_BODY,
      },
      {
        slug: 'chat-vs-the-pill',
        title: 'Chat vs the pill',
        summary: 'Chat answers questions about your boards; it never edits them.',
        body: null,
      },
    ],
  },
  {
    slug: 'workspaces-and-sharing',
    label: 'Workspaces & sharing',
    icon: 'Cube',
    summary: 'Teams, invitations, and who can see what.',
    articles: [
      {
        slug: 'share-a-single-board',
        title: 'Share a single board',
        summary: 'Invite by email; personal boards can be shared without a workspace.',
        body: null,
      },
      {
        slug: 'create-a-workspace-and-invite-members',
        title: 'Create a workspace and invite members',
        summary: 'A container for team boards, with its own member list.',
        body: null,
      },
      {
        slug: 'why-isnt-a-teammate-seeing-my-changes',
        title: "Why isn't a teammate seeing my changes?",
        summary: 'Realtime sync, the offline toast, and what to check.',
        body: null,
      },
      {
        slug: 'leave-or-remove-someone-from-a-board',
        title: 'Leave or remove someone from a board',
        summary: 'Owners, members, and what leaving does to assigned cards.',
        body: null,
      },
    ],
  },
  {
    slug: 'account-and-billing',
    label: 'Account & billing',
    icon: 'CreditCard',
    summary: 'Your plan, your sessions, your login.',
    articles: [
      {
        slug: 'free-vs-pro',
        title: 'Free vs Pro',
        summary: '20 AI messages a day and create-only pill actions on Free; every AI tool on Pro at $8/month.',
        body: null,
      },
      {
        slug: 'manage-your-plan',
        title: 'Upgrade, cancel, or change your plan',
        summary: 'Move between Free and Pro from Settings — plans are managed manually until billing fully launches.',
        body: null,
      },
      {
        slug: 'change-or-reset-your-password',
        title: 'Change or reset your password',
        summary: 'Settings → Account → Change password, or reset from the sign-in page if you are locked out.',
        body: null,
      },
      {
        slug: 'sign-out-everywhere-and-review-sessions',
        title: 'Sign out everywhere and review sessions',
        summary: 'See active sessions, revoke one, or log out of every device at once.',
        body: null,
      },
    ],
  },
  {
    slug: 'privacy-and-data',
    label: 'Privacy & data',
    icon: 'LockKey',
    summary: 'Where your data lives and how to take it with you.',
    articles: [
      {
        slug: 'export-or-delete-your-data',
        title: 'How do I export or delete my data?',
        summary: 'A JSON backup from Settings → Privacy, and the delete-account flow.',
        updated: '2026-09-02',
        related: ['where-is-my-data-stored', 'who-can-see-my-boards', 'manage-your-plan'],
        tags: ['export', 'backup', 'json', 'delete account', 'privacy'],
        body: EXPORT_DELETE_BODY,
      },
      {
        slug: 'where-is-my-data-stored',
        title: 'Where is my data stored?',
        summary: 'Supabase Postgres, encrypted in transit, row-level security on every table.',
        body: null,
      },
      {
        slug: 'does-the-ai-train-on-my-boards',
        title: 'Does the AI train on my boards?',
        summary: 'No. What the AI is sent per request, and what is never sent.',
        body: null,
      },
      {
        slug: 'who-can-see-my-boards',
        title: 'Who can see my boards?',
        summary: 'Members only — owners, board members, and workspace members explained.',
        body: null,
      },
    ],
  },
]

// Six hand-picked slugs for the hub's "Popular articles" list.
export const POPULAR_ARTICLES = [
  'daily-limit',
  'what-the-pill-can-do',
  'export-or-delete-your-data',
  'share-a-single-board',
  'why-isnt-a-teammate-seeing-my-changes',
  'manage-your-plan',
]

export function findArticle(slug) {
  for (const category of SUPPORT_CATEGORIES) {
    const article = category.articles.find((a) => a.slug === slug)
    if (article) return { article, category }
  }
  return null
}

export function popularArticles() {
  return POPULAR_ARTICLES.map((slug) => findArticle(slug)).filter(Boolean)
}
