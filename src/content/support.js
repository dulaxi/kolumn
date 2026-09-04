// Content for the /support hub and /support/<slug> articles. Structured as
// plain data — see src/content/pricing.js for the pattern this follows.
//
// Six categories, four article entries each. Titles, summaries, and
// ordering live here; the article *body* lives as markdown under
// src/content/articles/support/<slug>.md, loaded at build time by
// src/lib/content.js (getSupportArticleBody) and attached below. A slug
// with no markdown file gets `body: null` — that absence is exactly what
// marks an article thin (see supportArticleRoute in marketing-routes.js):
// SupportArticlePage renders a "coming soon" state instead of an empty
// page. Writing a new article is a two-file change: this entry (title +
// summary) and the markdown file — see .claude/skills/marketing-page/SKILL.md.
//
// Accuracy: the daily-limit article's "20 messages a day" and the shared
// pill/chat counter must stay in sync with FREE_DAILY_LIMIT in
// supabase/functions/chat/tier.ts. The export/delete article must stay in
// sync with src/utils/exportData.js, src/components/settings/PrivacySection.jsx,
// src/components/settings/DeleteAccountModal.jsx and
// supabase/functions/account/index.ts's /delete-account route.

export { CONTACT_EMAIL as SUPPORT_CONTACT } from './pricing'
import { PRICING } from './pricing'
import { getSupportArticleBody } from '../lib/content'

export const SUPPORT_META = {
  title: 'Kolumn support',
  description:
    'Answers about boards, cards, the AI pill and chat, workspaces, billing, and your data. Browse by topic or write to us.',
  ogTitle: 'Kolumn support',
  ogDescription:
    'Answers about boards, cards, the AI pill and chat, workspaces, billing, and your data. Browse by topic or write to us.',
}

// icon: a Phosphor component name, resolved in SupportPage.jsx (same
// pattern as content/connectors.js and content/templates.js).
const RAW_SUPPORT_CATEGORIES = [
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
      },
      {
        slug: 'your-getting-started-board',
        title: 'Your getting-started board',
        summary: 'What the seeded board shows you and what to try first.',
      },
      {
        slug: 'create-a-board-from-a-template',
        title: 'Create a board from a template',
        summary: 'Pick a board template, or start blank and add columns.',
      },
      {
        slug: 'keyboard-shortcuts-and-search',
        title: 'Keyboard shortcuts and search',
        summary: '⌘K search, and the shortcuts that move you around.',
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
      },
      {
        slug: 'move-reorder-and-complete-cards',
        title: 'Move, reorder, and complete cards',
        summary: 'Drag between columns, sort within one, mark done.',
      },
      {
        slug: 'add-rename-and-delete-columns',
        title: 'Add, rename, and delete columns',
        summary: 'Column basics, and what happens to cards in a deleted column.',
      },
      {
        slug: 'undo-a-delete',
        title: 'Undo a delete',
        summary: 'Deleted cards and columns get an Undo in the toast — here is how long you have.',
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
      },
      {
        slug: 'add-many-cards-at-once',
        title: 'Add many cards at once',
        summary: 'Comma- or newline-separated lists become cards instantly, no AI call.',
      },
      {
        slug: 'daily-limit',
        title: 'Why did the AI say I hit my daily limit?',
        summary: "The Free plan's 20-message day, what counts, and when it resets.",
        updated: '2026-09-02',
        related: ['what-the-pill-can-do', 'add-many-cards-at-once', 'free-vs-pro'],
        tags: ['limit', 'free', 'pro', 'pill', 'chat', '20 messages'],
      },
      {
        slug: 'chat-vs-the-pill',
        title: 'Chat vs the pill',
        summary: 'Chat answers questions about your boards; it never edits them.',
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
      },
      {
        slug: 'create-a-workspace-and-invite-members',
        title: 'Create a workspace and invite members',
        summary: 'A container for team boards, with its own member list.',
      },
      {
        slug: 'why-isnt-a-teammate-seeing-my-changes',
        title: "Why isn't a teammate seeing my changes?",
        summary: 'Realtime sync, the offline toast, and what to check.',
      },
      {
        slug: 'leave-or-remove-someone-from-a-board',
        title: 'Leave or remove someone from a board',
        summary: 'Owners, members, and what leaving does to assigned cards.',
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
        summary: `20 AI messages a day and create-only pill actions on Free; every AI tool on Pro at $${PRICING.limits.proMonthlyUsd}/month.`,
      },
      {
        slug: 'manage-your-plan',
        title: 'Upgrade, cancel, or change your plan',
        summary: 'Move between Free and Pro from Settings — plans are managed manually until billing fully launches.',
      },
      {
        slug: 'change-or-reset-your-password',
        title: 'Change or reset your password',
        summary: 'Settings → Account → Change password, or reset from the sign-in page if you are locked out.',
      },
      {
        slug: 'sign-out-everywhere-and-review-sessions',
        title: 'Sign out everywhere and review sessions',
        summary: 'See active sessions, revoke one, or log out of every device at once.',
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
      },
      {
        slug: 'where-is-my-data-stored',
        title: 'Where is my data stored?',
        summary: 'Supabase Postgres, encrypted in transit, row-level security on every table.',
      },
      {
        slug: 'does-the-ai-train-on-my-boards',
        title: 'Does the AI train on my boards?',
        summary: 'No. What the AI is sent per request, and what is never sent.',
      },
      {
        slug: 'who-can-see-my-boards',
        title: 'Who can see my boards?',
        summary: 'Members only — owners, board members, and workspace members explained.',
      },
    ],
  },
]

// Attaches each article's markdown body (or `null`) by slug — see the file
// header. Every consumer (findArticle, SUPPORT_CATEGORIES, the route
// registry) reads this derived export, never RAW_SUPPORT_CATEGORIES.
export const SUPPORT_CATEGORIES = RAW_SUPPORT_CATEGORIES.map((category) => ({
  ...category,
  articles: category.articles.map((article) => ({
    ...article,
    body: getSupportArticleBody(article.slug),
  })),
}))

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
