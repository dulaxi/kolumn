// Copy source: docs/superpowers/specs/marketing/solutions.md § "engineering".
// Schema: solution-page.md §4.
import { PRICING } from '../pricing'

export default {
  slug: 'engineering',
  name: 'Engineering',
  icon: 'Code',
  group: 'work',
  blurb: `A kanban you won't have to configure. Standups and PR threads become cards; bulk moves in a sentence.`,
  seo: {
    title: 'Kolumn for engineering teams — a kanban, no config',
    description:
      `No workflows to design, no fields to enforce. Paste a standup or PR discussion and the cards are there; move them in a sentence. Free; Pro is $${PRICING.limits.proMonthlyUsd}/month.`,
  },
  hero: {
    eyebrow: 'Kolumn for engineering teams',
    h1: `A kanban you won't have to configure`,
    subhead: 'No workflows to design, no fields to enforce, no admin. Kolumn is a plain board with an AI that files the work: paste a standup or a PR discussion and the cards are there.',
  },
  testimonials: [],
  pains: [
    {
      icon: 'SlidersHorizontal',
      title: 'The tracker became the work',
      body: 'Custom states, required fields, a grooming ritual to keep the tool happy. The tool was supposed to keep you happy.',
    },
    {
      icon: 'Microphone',
      title: 'Standup notes never reach the board',
      body: 'Everyone says what they are doing. The board says what they were doing last week.',
    },
    {
      icon: 'Columns',
      title: 'Product and engineering keep two boards',
      body: 'Same work, two sources of truth, one weekly reconciliation meeting.',
    },
  ],
  helpIntro: 'Capture, re-plan, and find things — from the keyboard.',
  helps: [
    {
      tab: 'Standup',
      icon: 'Notepad',
      kind: 'pill',
      prompt: 'paste standup: Priya — rate limit the export endpoint; Sam — flaky realtime reconnect test; Lee — on-call runbook. Make cards, assign them',
      title: 'Standup to cards',
      body: 'Paste the notes. Cards with owners appear on the sprint board; nobody transcribes. Comma lists split instantly with no AI call.',
      result: [
        { title: 'Rate-limit the export endpoint', assignee: 'Priya', priority: 'high' },
        { title: 'Flaky test: realtime reconnect', assignee: 'Sam' },
        { title: 'Write runbook for on-call', assignee: 'Lee' },
      ],
    },
    {
      tab: 'Re-plan',
      icon: 'ArrowsLeftRight',
      kind: 'pill',
      pro: true,
      prompt: 'move everything assigned to Sam to Priya and mark the auth bug high',
      title: 'Bulk moves in plain language',
      body: 'Reassign, reprioritise and move in one line. The board updates for everyone in realtime.',
      result: [{ title: 'Flaky test: realtime reconnect', assignee: 'Priya', priority: 'high' }],
    },
    {
      tab: 'Find',
      icon: 'MagnifyingGlass',
      kind: 'chat',
      prompt: `what's still in code review older than three days?`,
      title: 'Search and ask',
      body: '⌘K finds any card by title. Chat answers questions across boards: what is stale, what is blocked, what shipped. Read-only, by design.',
      result: ['Flaky test: realtime reconnect has been in Code review for 3 days.'],
    },
  ],
  board: {
    name: 'Sprint 14',
    columns: [
      { title: 'Backlog', cards: [{ icon: 'Cloud', title: 'Migrate avatar uploads to new bucket', checklist: { done: 0, total: 3 } }] },
      {
        title: 'In progress',
        cards: [
          { icon: 'Gauge', title: 'Rate-limit the export endpoint', priority: 'high', assignee: 'Priya' },
          { icon: 'BookOpen', title: 'Write runbook for on-call', assignee: 'Lee' },
        ],
      },
      {
        title: 'Code review',
        cards: [{ icon: 'Bug', title: 'Flaky test: realtime reconnect', labels: ['flaky'], due: '+3d' }],
      },
      { title: 'Done', cards: [] },
    ],
  },
  faq: [
    {
      q: 'Is there an API or a Git integration?',
      a: `Not yet. Cards come from what you paste or type; there's no public API and no repository sync. If that changes it will be on the pricing page before it is on this one.`,
    },
  ],
  cta: { heading: `Run the next sprint from a board you didn't configure.` },
}
