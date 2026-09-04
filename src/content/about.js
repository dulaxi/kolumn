// Content for /about. See docs/superpowers/specs/marketing/about.md §3-4.
//
// DETAILS.plans and CTA.body's "twenty AI messages a day" must stay in sync
// with src/content/pricing.js (`limits.proMonthlyUsd`, `limits.freeMessagesPerDay`)
// and supabase/functions/chat/tier.ts (`FREE_DAILY_LIMIT`).
//
// VALUES is shared with /careers (imported there, not duplicated).

import { PRICING } from './pricing'

export const ABOUT_META = {
  title: "About Kolumn — a kanban that stayed a kanban",
  description:
    "Kolumn is a small, independent kanban app with an AI that does the busywork on your boards. Here's what it is and why it's shaped this way.",
  ogTitle: 'About Kolumn',
  ogDescription:
    "Kolumn is a small, independent kanban app with an AI that does the busywork on your boards. Here's what it is and why it's shaped this way.",
}

export const HERO = {
  heading: 'A kanban that stayed a kanban.',
  subhead:
    'Kolumn is a small, independent project management app. Boards, columns, cards — and an AI that does the busywork on them without changing what a board is.',
  cta: { label: 'Try Kolumn', to: '/onboarding' },
}

export const WHAT_IT_IS = {
  heading: 'What it is',
  lede: 'Most project tools grow until they need a setup guide. Kolumn is built to stay small enough to use on day one.',
  items: [
    {
      title: 'The board',
      body: 'Columns and cards you drag by hand. Priority, due date, labels, checklist, assignees, an icon. Nothing you have to configure before you can start.',
    },
    {
      title: 'The pill',
      body: 'A single line on every board. Type what you mean — "move the login bugs to done, assign the rest to Mia" — and the AI does it on that board. Paste a list and it becomes cards without an AI call.',
    },
    {
      title: 'Chat',
      body: "Ask questions across your boards and get summaries back. Chat reads; it doesn't write. Changing a board is the pill's job, on purpose.",
    },
    {
      title: 'Workspaces',
      body: 'Invite people, share a board or a whole workspace, and watch edits land in realtime. Personal boards stay personal until you say otherwise.',
    },
  ],
}

// Ships empty on purpose — no names, no bios, no photos until confirmed.
// See open questions in about.md §5. When non-empty, each entry is
// { name, role, avatarName? }.
export const TEAM = {
  heading: 'Who makes it',
  body: "Kolumn is built by a very small team, without a growth department. The people who answer support email are the people who ship the fix. That's not a virtue on its own — it's why the product can stay narrow: nobody is under pressure to add a feature so there's something to announce.",
  members: [],
}

// Shared with /careers — one source, two pages (see careers.js).
export const VALUES = {
  heading: 'What we hold to',
  lede: 'Four rules that decide most product arguments before they start.',
  items: [
    {
      index: '01',
      title: 'Stay a kanban.',
      body: "No custom-field schemas, no sprint rituals, no view that needs a tutorial. If a feature only works after setup, it doesn't ship.",
    },
    {
      index: '02',
      title: 'Scope the AI.',
      body: "The AI acts on one board at a time, through the same operations you'd do by hand, and only when you ask. Destructive actions get a confirmation and an undo. Chat can't change anything.",
    },
    {
      index: '03',
      title: 'Your data is yours.',
      body: "Every table is protected by row-level security. Only board members see a board. You can export everything as JSON or delete the account, from Settings, without asking us. We don't train on your content.",
    },
    {
      index: '04',
      title: 'Say what it does.',
      body: "Marketing copy is held to the code. If something isn't shipped, it isn't on the site. The security page is written the same way.",
    },
  ],
}

// Founded / based-in rows omitted until confirmed (about.md §5, open questions).
export const DETAILS = {
  heading: 'Details',
  rows: [
    { label: 'Product', value: 'Kolumn — kanban with an AI layer' },
    { label: 'Plans', value: `Free · Pro $${PRICING.limits.proMonthlyUsd}/month` },
    { label: 'Runs on', value: 'React, Supabase (Postgres), Anthropic models' },
  ],
}

export const CTA = {
  heading: 'Try it on a real board.',
  body: 'Free plan, no card. Twenty AI messages a day.',
  primary: { label: 'Start free', to: '/onboarding' },
  secondary: { label: "Read how it's secured", to: '/security' },
}
