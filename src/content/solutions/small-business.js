// Copy source: docs/superpowers/specs/marketing/solutions.md § "small-business".
// Schema: solution-page.md §4.
import { PRICING } from '../pricing'

export default {
  slug: 'small-business',
  name: 'Small business',
  icon: 'Storefront',
  group: 'team',
  blurb: `Orders, suppliers and the website fix you keep forgetting, on a board that fills itself in.`,
  seo: {
    title: `Kolumn for small business — a to-do board that runs itself`,
    description:
      `Type what's on your mind and get cards with dates and owners. A kanban for shops, studios and services, with no setup. Free to start; Pro is $${PRICING.limits.proMonthlyUsd}/month.`,
  },
  hero: {
    eyebrow: 'Kolumn for small business',
    h1: 'Run the week from one board',
    subhead: `Orders, suppliers, payroll, the booking form that's still broken. Kolumn is a kanban that fills itself in: type what's on your mind and the AI turns it into cards with dates and owners.`,
  },
  testimonials: [],
  pains: [
    {
      icon: 'Note',
      title: 'Everything is a sticky note',
      body: 'The counter, the phone, a group chat. Things get done because someone remembered, not because anything tracked them.',
    },
    {
      icon: 'Buildings',
      title: 'The software was built for enterprises',
      body: 'Permissions, fields, a training video. You need a list your team will actually open.',
    },
    {
      icon: 'DeviceMobile',
      title: `The team isn't at a desk`,
      body: `People on the floor need to glance at what's next, not log into a system.`,
    },
  ],
  helpIntro: `The pill does the typing you don't have time for.`,
  helps: [
    {
      tab: 'List',
      icon: 'ListBullets',
      kind: 'pill',
      prompt: 'reorder oat milk, call the sign guy, fix the booking form, spring window display',
      title: 'Type the list, get the board',
      body: 'Commas and new lines split into cards instantly, without waiting on the AI. Say more and the AI adds dates, owners and priorities.',
      result: [
        { title: 'Reorder oat milk' },
        { title: 'Call the sign guy' },
        { title: 'Fix the booking form' },
        { title: 'Spring window display' },
      ],
    },
    {
      tab: 'Assign',
      icon: 'UserCircle',
      kind: 'pill',
      pro: true,
      prompt: 'give the Friday deliveries to Sam, due Thursday, and mark payroll high',
      title: 'Assign and date in plain words',
      body: 'No dropdowns. Name the person and the day; the cards update.',
      result: [
        { title: 'Friday deliveries', assignee: 'Sam', due: 'thu' },
        { title: 'Payroll — Friday', priority: 'high' },
      ],
    },
    {
      tab: 'Share',
      icon: 'UsersThree',
      kind: 'info',
      title: 'Share only what each person needs',
      body: 'Personal boards stay yours until you share them. Share a single board with the two people who run Saturdays; keep the accounts board to yourself. Everyone sees changes as they happen.',
    },
  ],
  board: {
    name: 'Week of the 14th',
    columns: [
      {
        title: 'To do',
        cards: [
          { icon: 'CurrencyDollar', title: 'Payroll — Friday', due: 'fri', priority: 'high' },
          { icon: 'Storefront', title: 'Spring window display', checklist: { done: 0, total: 3 }, assignee: 'Sam' },
        ],
      },
      {
        title: 'Doing',
        cards: [{ icon: 'Globe', title: 'Fix the online booking form', priority: 'high' }],
      },
      {
        title: 'Waiting on',
        cards: [{ icon: 'Package', title: 'Reorder oat milk', labels: ['supplier'] }],
      },
      { title: 'Done', cards: [] },
    ],
  },
  faq: [
    {
      q: `We're three people. Is Pro worth it?`,
      a: 'Only if you want the AI to move and update cards for you. Free already creates cards from anything you type, and sharing is free.',
    },
  ],
  cta: { heading: 'Put the week on a board tonight.' },
}
