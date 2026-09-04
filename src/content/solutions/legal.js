// Copy source: docs/superpowers/specs/marketing/solutions.md § "legal".
// Schema: solution-page.md §4.
import { PRICING } from '../pricing'

export default {
  slug: 'legal',
  name: 'Legal',
  icon: 'Scales',
  group: 'work',
  blurb: 'Matters on a board, not in a mailbox. Deadlines, drafts and client follow-ups, members-only.',
  seo: {
    title: 'Kolumn for legal teams — a kanban for matters',
    description:
      `Paste a client email and get cards with deadlines. One members-only board per matter, row-level security, export any time. Free to start; Pro is $${PRICING.limits.proMonthlyUsd}/month.`,
  },
  hero: {
    eyebrow: 'Kolumn for legal teams',
    h1: 'Matters on a board, not in a mailbox',
    subhead: `Deadlines, drafts and client follow-ups on one kanban. Kolumn's AI turns an email thread or a call note into cards, and every board is readable only by its members.`,
  },
  testimonials: [],
  pains: [
    {
      icon: 'Warning',
      title: 'Deadlines are non-negotiable, trackers are optional',
      body: `The response window is in a letter; the reminder is in someone's calendar. One of them is wrong.`,
    },
    {
      icon: 'Briefcase',
      title: 'Practice software is heavy, the to-do list is light',
      body: 'The matter system holds documents. The actual next steps live in a notebook.',
    },
    {
      icon: 'ShareNetwork',
      title: 'Sharing means another portal',
      body: 'Clients and co-counsel need to see progress, not learn a system.',
    },
  ],
  helpIntro: 'Intake, tracking and the status call, from one board per matter.',
  helps: [
    {
      tab: 'Intake',
      icon: 'EnvelopeOpen',
      kind: 'pill',
      prompt: 'paste this client email — make cards for each request and add the 21-day response deadline',
      title: 'Intake by pasting',
      body: `A client's email becomes cards. Dates in the text become due dates; the rest becomes a checklist.`,
      result: [
        { title: 'Response deadline — 21 days', due: '+21d', priority: 'high' },
        { title: 'Demand letter draft', priority: 'high' },
        { title: 'Settlement call prep' },
      ],
    },
    {
      tab: 'Matters',
      icon: 'LockKey',
      kind: 'info',
      title: 'One board per matter, members-only',
      body: `Boards are visible to their members and no one else, enforced by row-level security in the database. Share a matter board with a client; keep the firm board internal. Export a board's data from Settings whenever you need a copy.`,
    },
    {
      tab: 'Status',
      icon: 'ChatsCircle',
      kind: 'chat',
      prompt: `what's due this week across all my matter boards?`,
      title: 'Ask before the status call',
      body: 'Chat reads every board you are a member of and answers in text. No spreadsheet of spreadsheets.',
      result: ['The Hartley response deadline is in 21 days. The demand letter draft is unassigned and high priority.'],
    },
  ],
  board: {
    name: 'Hartley — lease dispute',
    columns: [
      {
        title: 'Intake',
        cards: [
          { icon: 'Timer', title: 'Response deadline — 21 days', due: '+21d', priority: 'high' },
          { icon: 'Phone', title: 'Settlement call prep', labels: ['client'] },
        ],
      },
      {
        title: 'Drafting',
        cards: [{ icon: 'FileText', title: 'Demand letter draft', priority: 'high', assignee: 'Ines' }],
      },
      {
        title: 'Client review',
        cards: [{ icon: 'Paperclip', title: 'Collect lease amendments from client', checklist: { done: 1, total: 3 } }],
      },
      { title: 'Filed', cards: [] },
    ],
  },
  faq: [
    {
      q: 'Where is the data stored and who can read it?',
      a: 'In Postgres on Supabase, behind row-level security on every table; only board members can read a board. We do not train on your content. Export and account deletion are in Settings.',
    },
  ],
  cta: { heading: 'Open the next matter on a board.' },
}
