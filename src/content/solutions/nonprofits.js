// Copy source: docs/superpowers/specs/marketing/solutions.md § "nonprofits".
// Schema: solution-page.md §4.
import { PRICING } from '../pricing'

export default {
  slug: 'nonprofits',
  name: 'Nonprofits',
  icon: 'HandHeart',
  group: 'team',
  blurb: 'Grant deadlines, volunteers and board reports on one board a small team can keep up with.',
  seo: {
    title: 'Kolumn for nonprofits — a kanban for grants and programs',
    description:
      `Paste a funder's timeline and get cards with due dates. One workspace per program, boards volunteers can read in a minute. Free to start; Pro is $${PRICING.limits.proMonthlyUsd}/month.`,
  },
  hero: {
    eyebrow: 'Kolumn for nonprofits',
    h1: 'More time on the mission, less on the tracker',
    subhead: 'Grant cycles, volunteer shifts, the report for the board meeting. Kolumn keeps them on one board, and the AI handles the updating so a small team stays on top of a lot.',
  },
  testimonials: [],
  pains: [
    {
      icon: 'EnvelopeOpen',
      title: 'Deadlines hide in email',
      body: `The LOI date is in a funder's PDF, the report date in a thread from March. Nothing surfaces them until the week they're due.`,
    },
    {
      icon: 'UsersThree',
      title: 'Volunteers come and go',
      body: `Every new person has to learn the tool. If the tool takes a training session, they don't.`,
    },
    {
      icon: 'ChartBar',
      title: 'Reporting eats the week before the board meeting',
      body: 'Someone rebuilds the status of every program by hand, every quarter.',
    },
  ],
  helpIntro: 'The pill and chat, doing the admin a program manager does after hours.',
  helps: [
    {
      tab: 'Grants',
      icon: 'CalendarBlank',
      kind: 'pill',
      prompt: 'paste: LOI due March 3, full proposal April 14, site visit in May, report due Sept 30 — make cards with those dates',
      title: 'A grant calendar as cards',
      body: `Paste the funder's timeline. Each milestone becomes a card with its due date, and overdue cards show up in notifications before they're late.`,
      result: [
        { title: 'LOI — community foundation', due: '+5d' },
        { title: 'Full proposal', due: '+21d' },
        { title: 'Site visit', due: '+30d' },
        { title: 'Final report', due: '+90d' },
      ],
    },
    {
      tab: 'Programs',
      icon: 'CubeFocus',
      kind: 'info',
      title: 'One workspace per program',
      body: 'Workspaces are team containers with members and invitations. Youth program volunteers see the youth board; the finance board is members-only. Everyone sees the same board in realtime.',
    },
    {
      tab: 'Report',
      icon: 'ChatsCircle',
      kind: 'chat',
      prompt: 'summarise the spring grant cycle board for the board meeting',
      title: 'Ask for the status, get the summary',
      body: 'Chat reads the board and writes the paragraph. Paste it into the board packet and move on.',
      result: ['The community foundation LOI is due in 5 days. Two grants are in Writing, one submitted, one awarded.'],
    },
  ],
  board: {
    name: 'Spring grant cycle',
    columns: [
      {
        title: 'Prospecting',
        cards: [{ icon: 'ChartBar', title: 'Impact numbers from Q4', labels: [{ text: 'reporting', color: 'blue' }], assignee: 'Dana' }],
      },
      {
        title: 'Writing',
        cards: [
          { icon: 'FileText', title: 'Community foundation LOI', due: '+5d', priority: 'high', assignee: 'Dana' },
          { icon: 'Calculator', title: 'Youth program budget narrative', checklist: { done: 2, total: 4 }, due: '+8d' },
        ],
      },
      {
        title: 'Submitted',
        cards: [{ icon: 'Heart', title: 'Thank-you letters to donors', assignee: 'Dana', labels: [{ text: 'donors', color: 'pink' }] }],
      },
      { title: 'Awarded', cards: [] },
    ],
  },
  faq: [
    {
      q: 'Is there a nonprofit discount?',
      a: `Not yet. Free covers most volunteer boards; Pro is $${PRICING.limits.proMonthlyUsd} per person per month for the people who run the pill.`,
    },
  ],
  cta: { heading: 'Start the next grant cycle on a board.' },
}
