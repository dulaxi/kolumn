// Content for the Features hub (/features) and feature detail pages
// (/features/<slug>). FEATURES drives the hub grid; FEATURE_PAGES holds the
// full template copy for the slugs that have a built detail page today
// (pill, chat) — see docs/superpowers/specs/marketing/{features,feature-page}.md.
//
// Plan facts (message limit, price, trial length) are never typed as
// literals below — they come from src/content/pricing.js (PRICING.limits),
// the same source PricingPage renders, so this copy cannot silently lag the
// edge function's FREE_DAILY_LIMIT.
//
// Accuracy note: chat's `search_cards` and `summarize_board` tools are
// unimplemented placeholders server-side (see CLAUDE.md, "Tier & gating").
// Nothing below claims chat can search across boards or summarize one —
// chat's Free/Pro split here is only the shared daily message cap.
//
// Shortcut list (search & shortcuts hub summary) mirrors the bindings in
// src/hooks/useKeyboardShortcuts.js wired up in AppLayout.jsx: mod+k, "/",
// mod+b, "n" (board pages only).

import { PRICING } from './pricing'

const { freeMessagesPerDay, proMonthlyUsd, trialDays } = PRICING.limits

// Ordered by how a new user meets them: type into the pill, ask chat a
// question, then the structure underneath — workspaces, templates, sync,
// search. Only `pill` and `chat` have a built detail page (FEATURE_PAGES)
// and a `to` target — the other four are real product capabilities with no
// page built yet, so they render as non-linked cards on the hub (no `to`).
// Do not add a `to` for one of the four until its detail page actually
// exists.
export const FEATURES = [
  {
    slug: 'pill',
    name: 'The pill',
    summary: 'Type what you need on any board and the AI creates, moves, updates, or completes the cards.',
    icon: 'Sparkle',
    to: '/features/pill',
  },
  {
    slug: 'chat',
    name: 'Chat',
    summary: 'Ask a question about your boards and get an answer in words. Read-only, always.',
    icon: 'ChatCircle',
    to: '/features/chat',
  },
  {
    slug: 'workspaces',
    name: 'Workspaces',
    summary: 'Boards live in a team workspace with members and invitations, or stay personal.',
    icon: 'Cube',
  },
  {
    slug: 'templates',
    name: 'Templates',
    summary: "Board and card templates so the next board looks like the last one.",
    icon: 'Stack',
  },
  {
    slug: 'sync',
    name: 'Realtime sync',
    summary: 'Move a card and your teammates see it move. No refresh, no "who has the latest."',
    icon: 'ArrowsClockwise',
  },
  {
    slug: 'search',
    name: 'Search and shortcuts',
    summary: 'Cmd+K or / opens search across every board. N starts a new card, Cmd+B tucks the sidebar.',
    icon: 'MagnifyingGlass',
  },
]

export const FEATURES_HUB = {
  meta: {
    title: 'Features — Kolumn, the AI kanban',
    description:
      'Type what you need and cards appear. Ask about your boards in chat. Workspaces, templates, sync, and keyboard search — a kanban that stayed a kanban.',
    ogTitle: 'Kolumn features',
  },
  eyebrow: 'Features',
  h1: 'Everything the board does that you used to do',
  subhead:
    'Kolumn is a kanban with an AI layer on top. Type what you need and the cards appear. Ask a question and the answer comes from your own boards. The rest is the kanban you already know.',
  heroCta: { label: 'Create a free board', to: '/onboarding' },
  pricingLink: { label: 'See pricing', to: '/pricing' },
  closing: {
    h2: 'Start with a board. The AI shows up when you type.',
    cta: { label: 'Create a free account', to: '/onboarding' },
    secondary: { label: 'or read about security', to: '/security' },
  },
}

// Shared "how a plan changes what the AI does" summary, reused by both
// feature detail pages so the two never state the limits differently.
const PLAN_FACTS = { freeMessagesPerDay, proMonthlyUsd, trialDays }

export const FEATURE_PAGES = {
  pill: {
    slug: 'pill',
    meta: {
      title: 'The pill — Kolumn',
      description:
        'Type what you need on any board and the AI creates, moves, updates, or completes the cards. Paste a list and it becomes cards instantly.',
      ogTitle: 'The pill',
    },
    plan: PLAN_FACTS,
    hero: {
      tag: 'The pill',
      h1: 'Say what should happen. The board does it.',
      subhead:
        'The pill sits at the bottom of every board. Type a task, a change, or a whole list in plain words and the AI creates, moves, updates, or completes the cards — on this board, and only this board.',
      cta: { label: 'Create a free board', to: '/onboarding' },
      availability: `Free accounts get create actions and ${freeMessagesPerDay} AI messages a day. Every write action on Pro.`,
      availabilityLink: { label: 'See pricing', to: '/pricing' },
      demo: {
        input: 'Move the login bug to In review, assign Sam, due Friday',
        rows: [
          { ok: true, label: 'Moved "Login bug" → In review' },
          { ok: true, label: 'Assigned Sam' },
          { ok: true, label: 'Due date set: Fri 5 Sep' },
        ],
      },
    },
    rows: [
      {
        h3: 'Plain words in, cards out',
        body:
          'Open the pill, write what you need, press Enter. "Add a card for the onboarding email, high priority, due Thursday." The AI reads the board it is on — its columns, its cards, its members — and makes the change. You watch each step land in a checklist under the input.',
      },
      {
        h3: 'Lists skip the AI entirely',
        body:
          'Paste anything with commas or line breaks — "Fix header, Update pricing page, Email the printer" — and the pill splits it into cards on the spot. No model call, no wait, no message counted against your day. It only sends prose to the AI when the text reads like a sentence.',
      },
      {
        h3: 'Scoped to the board you are looking at',
        body:
          'The pill never reaches across boards. Every action is pinned to the board it opened on, so "move the design review" cannot land somewhere you did not mean. Anything destructive asks first, and there is an undo on the toast.',
      },
    ],
    tabs: [
      {
        key: 'create',
        label: 'Create',
        prompt: 'Add three cards to Backlog: write release notes, record the demo, update the changelog',
        h3: 'Three cards, one sentence',
        body: 'Each card gets a title and lands in the column you named. Priority, due date, and assignee are filled in when you mention them.',
      },
      {
        key: 'move',
        label: 'Move',
        prompt: 'Move everything marked "urgent" to In progress',
        h3: 'Batch moves',
        body: 'The AI matches cards by what you said — title, label, priority — and moves them together. Pro.',
      },
      {
        key: 'update',
        label: 'Update',
        prompt: 'Give the checkout bug to Priya and make it high priority',
        h3: 'Edit without opening the card',
        body: 'Assignee, priority, labels, due date, description. Say it and it is set. Pro.',
      },
      {
        key: 'complete',
        label: 'Complete',
        prompt: 'Mark the three onboarding tasks done',
        h3: 'Close out a batch',
        body: 'Completed cards keep their history and get the check. Pro.',
      },
      {
        key: 'paste',
        label: 'Paste a list',
        prompt: 'Book venue\nSend invites\nOrder lanyards',
        h3: 'No AI, no wait',
        body: 'Line breaks and commas split into cards instantly. Free on every plan and never counted as a message.',
      },
    ],
    grid: [
      { icon: 'Plus', h3: 'Create cards', body: 'Title, column, priority, due date, assignee, labels — whatever you mention, filled in.' },
      { icon: 'ArrowsLeftRight', h3: 'Move cards', body: 'One card or a batch, matched by title, label, or priority. Pro.' },
      { icon: 'PencilSimple', h3: 'Update fields', body: 'Change any field on any card without opening it. Pro.' },
      { icon: 'CheckCircle', h3: 'Complete and duplicate', body: "Close out work or clone a card as a starting point. Pro." },
      { icon: 'ListChecks', h3: 'Checklists', body: "Tick items off a card's checklist by name. Pro." },
      { icon: 'Columns', h3: 'Columns and members', body: 'Add or remove columns, invite or remove members from the board. Pro.' },
    ],
    plans: {
      free: { name: 'Free', body: `Create actions. ${freeMessagesPerDay} AI messages a day. Pasted lists are unlimited and never count.` },
      pro: {
        name: 'Pro',
        body: `Every write action: move, update, complete, duplicate, checklists, columns, members. $${proMonthlyUsd} a month, ${trialDays}-day trial.`,
        cta: { label: 'Start Pro trial', to: '/onboarding' },
      },
    },
    faq: [
      { q: 'Does the pill work on every board?', a: 'Yes. It is mounted on every board you can open, including boards shared with you. It acts on that board only.' },
      { q: 'What counts as a message?', a: `Each time the pill sends text to the AI. Pasted lists split locally and do not count. Free accounts get ${freeMessagesPerDay} a day; Pro is uncapped.` },
      { q: 'Can it delete things?', a: 'On Pro, yes — after a confirmation. Every delete puts an Undo on the toast.' },
      { q: 'What if it gets a card wrong?', a: "The progress list under the pill shows each step, and the AI's last line tells you what it did after seeing the results. Fix it by hand or type the correction." },
      { q: 'Is there a voice mode?', a: 'Not yet. The microphone button is a placeholder for a later release.' },
    ],
    sibling: {
      icon: 'ChatCircle',
      h3: 'Want answers instead of actions?',
      body: 'Chat reads your boards and replies in words. It never edits a card.',
      cta: { label: 'Explore chat', to: '/features/chat' },
    },
    closing: {
      h2: 'Open a board and start typing.',
      cta: { label: 'Create a free account', to: '/onboarding' },
    },
  },

  chat: {
    slug: 'chat',
    meta: {
      title: 'Chat — Kolumn',
      description:
        'Ask questions about your boards and get answers from your own cards: what is overdue, what shipped, what is still open. Read-only, always.',
      ogTitle: 'Chat',
    },
    plan: PLAN_FACTS,
    hero: {
      tag: 'Chat',
      h1: 'Ask your boards a question',
      subhead:
        'Chat is the conversation side of Kolumn. It reads your boards and answers in words — what is overdue, what shipped this week, what is still waiting on someone. It never moves a card.',
      cta: { label: 'Start free', to: '/onboarding' },
      availability: `Text answers on Free, ${freeMessagesPerDay} messages a day shared with the pill. No daily limit on Pro.`,
      availabilityLink: { label: 'See pricing', to: '/pricing' },
      demo: {
        question: 'What is overdue on the launch board?',
        answer: 'Three cards are past due: "Write launch email" (2 days), "Approve final assets" (1 day), and "Book send-off post" (due today).',
        cards: ['Write launch email', 'Approve final assets', 'Book send-off post'],
      },
    },
    rows: [
      {
        h3: 'It already knows your boards',
        body:
          'Every message is answered with your boards, columns, cards, due dates, and members in context. Ask "what is overdue" and the answer names the cards. Ask "what did we finish this week" and it reads the activity, not a guess.',
      },
      {
        h3: 'Read-only by design',
        body:
          'Chat has no write tools. Nothing you say here creates, moves, or deletes a card, so you can think out loud without side effects. When you are ready to act, the pill is one click away on the board.',
      },
      {
        h3: 'Threads that stay',
        body:
          'Every conversation is saved to your account, named, and searchable in your chat list. Star the ones you come back to. Cards mentioned in a reply show up in a rail on the right so you can open them without leaving the thread.',
      },
    ],
    tabs: [
      {
        key: 'status',
        label: 'Status',
        prompt: 'Where are we on the website relaunch?',
        h3: 'A status line, not a spreadsheet',
        body: 'Counts per column, what moved recently, and what is blocking — in a few sentences.',
      },
      {
        key: 'overdue',
        label: 'Overdue',
        prompt: 'What is overdue and who owns it?',
        h3: 'Overdue, by owner',
        body: 'Cards past their due date, grouped by assignee, with the cards linked in the rail.',
      },
      {
        key: 'week',
        label: 'This week',
        prompt: 'What did the team finish this week?',
        h3: 'A week in review',
        body: 'Completed cards from the last seven days, by board.',
      },
      {
        key: 'who',
        label: 'Who has what',
        prompt: 'What is Sam working on?',
        h3: "One person's plate",
        body: 'Open cards for one member across every board you share.',
      },
      {
        key: 'freeform',
        label: 'Ask anything',
        prompt: "What's slipping this sprint?",
        h3: 'Not just templates',
        body: 'Ask in your own words. Chat reads full board context on every message — columns, cards, due dates, members — and replies in text.',
      },
    ],
    // Deliberately no "search cards" / "summarize a board" items — those
    // tools are unimplemented placeholders server-side today. Every item
    // below is something chat actually does.
    grid: [
      { icon: 'Question', h3: 'Answer from your cards', body: 'Every reply is grounded in the boards you can see, not a general guess.' },
      { icon: 'Clock', h3: 'Overdue and due today', body: 'Deadlines are in context on every message.' },
      { icon: 'Users', h3: 'Full team context', body: 'Members, assignees, and recent activity feed every answer.' },
      { icon: 'Cards', h3: 'Card rail', body: 'Cards mentioned in a reply are listed beside it — click straight through.' },
      { icon: 'Star', h3: 'Saved threads', body: 'Rename, star, and come back to any conversation.' },
      { icon: 'ShieldCheck', h3: 'Read-only, on every plan', body: 'Chat cannot create, move, or delete a card. Ever.' },
    ],
    plans: {
      free: { name: 'Free', body: `Text answers grounded in your boards. Shares ${freeMessagesPerDay} AI messages a day with the pill.` },
      pro: {
        name: 'Pro',
        body: `No daily limit — uncapped and shared with the pill. $${proMonthlyUsd} a month, ${trialDays}-day trial.`,
        cta: { label: 'Start Pro trial', to: '/onboarding' },
      },
    },
    faq: [
      { q: 'Can chat create or move cards?', a: 'No. Chat is read-only on every plan. Use the pill on a board for actions.' },
      { q: 'Which boards can it see?', a: 'The ones you can open: your own, boards shared with you, and boards in your workspaces. Nothing else.' },
      { q: 'Are conversations saved?', a: 'Yes, to your account, with the same row-level security as your boards. Delete a thread and it is gone.' },
      { q: 'Is my content used to train models?', a: 'No. See the security page.', link: { label: 'security page', to: '/security' } },
      { q: 'Does the daily limit include the pill?', a: `Yes. Free accounts share ${freeMessagesPerDay} messages a day between chat and the pill.` },
    ],
    sibling: {
      icon: 'Sparkle',
      h3: 'Ready to change something?',
      body: 'The pill on every board turns a sentence into cards — and on Pro, into moves and updates too.',
      cta: { label: 'Explore the pill', to: '/features/pill' },
    },
    closing: {
      h2: 'Ask the board. It answers.',
      cta: { label: 'Create a free account', to: '/onboarding' },
    },
  },
}
