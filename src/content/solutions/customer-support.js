// Copy source: docs/superpowers/specs/marketing/solutions.md § "customer-support".
// Schema: solution-page.md §4.
export default {
  slug: 'customer-support',
  name: 'Customer support',
  icon: 'Headset',
  group: 'work',
  blurb: `Escalations, bug handoffs and macro rewrites — everything the ticket queue isn't for.`,
  seo: {
    title: 'Kolumn for customer support — a kanban for escalations',
    description:
      'Paste a customer thread and get a card with a summary and priority. Track escalations and engineering handoffs on one board. Free to start; Pro is $8/month.',
  },
  hero: {
    eyebrow: 'Kolumn for customer support',
    h1: `Escalations that don't get lost`,
    subhead: `The ticket queue is for tickets. Kolumn is for everything around it: escalations, bug reports headed to engineering, the macros that need a rewrite. Paste a thread, get a card.`,
  },
  testimonials: [],
  pains: [
    {
      icon: 'Ticket',
      title: `The helpdesk isn't a project tool`,
      body: `A ticket is closed or it isn't. The follow-up work behind it has nowhere to live.`,
    },
    {
      icon: 'GitBranch',
      title: 'Engineering handoffs vanish',
      body: `The bug goes into a channel, gets a thumbs-up, and nobody can say a week later whether it shipped.`,
    },
    {
      icon: 'ListMagnifyingGlass',
      title: 'The weekly review is a scroll through chat',
      body: 'Someone reconstructs the week from messages to write three bullet points.',
    },
  ],
  helpIntro: 'A board between the queue and the codebase.',
  helps: [
    {
      tab: 'Escalate',
      icon: 'Notepad',
      kind: 'pill',
      prompt: 'paste this thread — make a card, summarise the issue in the description, priority high, label billing',
      title: 'Paste the thread, get the card',
      body: 'A customer conversation becomes a card with a summary and priority. The thread stays where it was; the work is now visible.',
      result: [{ title: 'Export fails for large workspaces', priority: 'high', labels: ['billing'] }],
    },
    {
      tab: 'Batch',
      icon: 'ArrowsLeftRight',
      kind: 'pill',
      pro: true,
      prompt: `move everything labeled billing that's older than a week to With engineering and mark it high`,
      title: 'Batch by sentence',
      body: 'Triage in one line instead of one drag per card.',
      result: [{ title: 'Export fails for large workspaces', priority: 'high' }],
    },
    {
      tab: 'Review',
      icon: 'ChatsCircle',
      kind: 'chat',
      prompt: 'summarise what moved to Resolved on the escalations board this week',
      title: 'Chat for the weekly review',
      body: 'Ask; paste the answer into the update. Chat reads the board, it does not edit it.',
      result: ['Two cards moved to Resolved this week: the Safari login loop and the refund macro rewrite.'],
    },
  ],
  board: {
    name: 'Escalations',
    columns: [
      {
        title: 'New',
        cards: [{ icon: 'Browser', title: 'Login loop on Safari — 3 reports', priority: 'high' }],
      },
      {
        title: 'Investigating',
        cards: [
          { icon: 'TextAa', title: 'Refund policy macro rewrite', assignee: 'Jo', checklist: { done: 1, total: 2 } },
          { icon: 'Handshake', title: 'Enterprise trial follow-up', due: '+2d', labels: ['sales'] },
        ],
      },
      {
        title: 'With engineering',
        cards: [{ icon: 'Export', title: 'Export fails for large workspaces', priority: 'high', labels: ['bug'] }],
      },
      { title: 'Resolved', cards: [] },
    ],
  },
  faq: [
    {
      q: 'Does it connect to our helpdesk?',
      a: 'No. There are no live integrations; you paste the thread. That is deliberate for now: nothing syncs somewhere you did not intend.',
    },
  ],
  cta: { heading: 'Give escalations a board of their own.' },
}
