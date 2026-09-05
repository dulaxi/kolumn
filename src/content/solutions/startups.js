// Copy source: docs/superpowers/specs/marketing/solutions.md § "startups".
// Schema: solution-page.md §4.
import { PRICING } from '../pricing'

export default {
  slug: 'startups',
  name: 'Startups',
  icon: 'Rocket',
  group: 'team',
  blurb: `The roadmap, the launch and this week's fires on one board that re-plans in a sentence.`,
  seo: {
    title: 'Kolumn for startups — an AI kanban for launches',
    description:
      `Paste standup notes or a Slack thread and get cards with owners and dates. A kanban that keeps up with the pivot. Free to start; Pro is $${PRICING.limits.proMonthlyUsd}/month.`,
  },
  hero: {
    eyebrow: 'Kolumn for startups',
    h1: 'A board that keeps up with the pivot',
    subhead: `Plans change weekly. Kolumn turns whatever you already have — a founder's notes, a chat thread, a call transcript — into cards on a board the whole team can see. The AI does the sorting.`,
  },
  testimonials: [],
  pains: [
    {
      icon: 'Files',
      title: 'The roadmap lives in five places',
      body: `A doc, a spreadsheet, two chat channels and someone's head. None of them agree on what ships this week.`,
    },
    {
      icon: 'Gear',
      title: 'Nobody wants to be the tool admin',
      body: `Custom fields, workflow rules, a setup call. Ten-person teams don't have a person for that.`,
    },
    {
      icon: 'ClockCounterClockwise',
      title: 'Priorities move faster than the board',
      body: 'By the time the board is updated it describes last Tuesday. So people stop looking at it.',
    },
  ],
  helpIntro: 'Three things a founding team does every week, done from the pill.',
  helps: [
    {
      tab: 'Capture',
      icon: 'Notepad',
      kind: 'pill',
      prompt: 'turn these standup notes into cards — anything with a date goes to This week, the rest to Backlog',
      title: `Paste, don't transcribe`,
      body: 'Drop meeting notes into the pill. Titles, priorities and due dates land on cards without anyone retyping them. A comma-separated list becomes cards instantly, no AI round-trip.',
      result: [
        { icon: 'Article', title: 'Pricing page copy', due: 'fri' },
        { icon: 'Lightning', title: 'Stripe webhook retries', priority: 'high' },
        { icon: 'FileText', title: 'Investor update draft' },
      ],
    },
    {
      tab: 'Re-plan',
      icon: 'ArrowsLeftRight',
      kind: 'pill',
      pro: true,
      prompt: 'move everything labeled onboarding to next sprint and mark the pricing spike high priority',
      title: 'Re-plan in a sentence',
      body: 'When the plan changes, say so. Batch moves and priority changes happen in one line instead of twenty drags.',
      result: [
        { icon: 'Envelope', title: 'Onboarding email sequence', priority: 'medium' },
        { icon: 'MagnifyingGlass', title: 'Pricing spike investigation', priority: 'high' },
      ],
    },
    {
      tab: 'Ask',
      icon: 'ChatsCircle',
      kind: 'chat',
      prompt: `what's blocking the launch board this week?`,
      title: `Ask the board what's going on`,
      body: `Chat reads your boards and answers in plain text: what's due, what's overdue, what moved. Summaries for the investor update without a status meeting.`,
      result: ['Stripe webhook retries is high priority in This week. Everything else in review or shipped is on schedule.'],
    },
  ],
  board: {
    name: 'Launch — v1',
    columns: [
      {
        title: 'Backlog',
        cards: [{ icon: 'FileText', title: 'Investor update draft', priority: 'medium', due: '+4d' }],
      },
      {
        title: 'This week',
        cards: [
          { icon: 'Browser', title: 'Pricing page copy', labels: [{ text: 'marketing', color: 'blue' }], due: 'fri' },
          { icon: 'Lightning', title: 'Stripe webhook retries', priority: 'high', assignee: 'Priya', labels: [{ text: 'bug', color: 'red' }] },
        ],
      },
      {
        title: 'In review',
        cards: [{ icon: 'Envelope', title: 'Onboarding email sequence', checklist: { done: 3, total: 5 }, assignee: 'Jordan' }],
      },
      { title: 'Shipped', cards: [] },
    ],
  },
  faq: [
    {
      q: 'Can the whole team use it free?',
      a: 'Yes. Free has no seat limit; the 20 AI messages a day are per person. Pro is per person too, so upgrade the people who drive the board.',
    },
  ],
  cta: { heading: 'Ship the next thing from one board.' },
}
