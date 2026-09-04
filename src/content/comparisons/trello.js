// /compare/trello. Every fact about Trello below was checked against a live
// fetch of trello.com on CHECKED_ON — see _shared.js. Structural claim
// (board → lists → cards, no separate views layer) is sourced from Trello's
// own "Trello 101" guide; pricing figures are sourced from trello.com/pricing.
// See docs/superpowers/specs/marketing/_competitor-trello.md for the wider
// content-strategy audit this page's brief (_competitor-monday.md §3) grew
// out of.
import { CHECKED_ON, KOLUMN_POSITIONING, KOLUMN_FAQ } from './_shared'

export const META = {
  title: 'Kolumn vs Trello — Kolumn',
  description:
    'How Kolumn compares to Trello: boards and cards on both, but Trello adds lists-plus-views and a Power-Ups ecosystem Kolumn does not have yet.',
  ogTitle: 'Kolumn vs Trello',
  ogDescription: 'Two kanban tools, one AI layer. What Trello has that Kolumn does not, and the reverse.',
}

export const COMPARISON = {
  slug: 'trello',
  name: 'Trello',
  checkedOn: CHECKED_ON,
  hero: {
    h1: 'Kolumn vs Trello',
    subhead:
      "Both are kanban boards at heart. Trello has been at it for over a decade, with Power-Ups, multiple views, and an Atlassian-scale support org behind it. Kolumn is newer and narrower — a board plus an AI that fills it in from plain language.",
    cta: { label: 'Start free', to: '/onboarding' },
  },
  positioning: {
    kolumn: KOLUMN_POSITIONING,
    competitor:
      "Trello's own guide describes the model plainly: a board holds lists, lists hold cards, and cards move between lists to show progress — “there's no limit to the number of lists you can add to a board.” That's the same shape as Kolumn's boards → columns → cards. Where Trello diverges is everything built around that core: Power-Ups (integrations), Butler (rule-based automation), and, on paid plans, additional views (Calendar, Timeline, Table, Dashboard, Map) layered on top of the same cards.",
  },
  competitorPricing: {
    source: 'https://trello.com/pricing',
    checkedOn: CHECKED_ON,
    tiers: [
      {
        name: 'Free',
        price: '$0',
        period: 'forever',
        note: 'Up to 10 boards and 10 collaborators per workspace, unlimited cards, 250 automation runs a month.',
      },
      {
        name: 'Standard',
        price: '$5',
        period: 'per user/month billed annually ($6 billed monthly)',
        note: 'Unlimited boards, Trello AI features, 1,000 automation runs a month.',
      },
      {
        name: 'Premium',
        price: '$10',
        period: 'per user/month billed annually ($12.50 billed monthly)',
        note: 'Calendar, Timeline, Table, Dashboard, and Map views; unlimited automation runs.',
      },
      {
        name: 'Enterprise',
        price: '$17.50',
        period: 'per user/month billed annually',
        note: 'Unlimited workspaces, org-wide permissions, SSO via Atlassian Guard.',
      },
    ],
  },
  differentiators: [
    {
      icon: 'ChatCircleDots',
      title: 'One AI surface, two jobs',
      body: "The pill writes to the board you're on from a typed sentence; chat answers questions about your boards without touching them. Trello's AI features (checklist generation, card drafting, AI-generated boards) live inside the board editor itself, starting on its Standard plan.",
    },
    {
      icon: 'Sparkle',
      title: 'No setup screen',
      body: "Kolumn has no Power-Ups to browse, no Butler rules to write, no automation-run budget to watch. That's a smaller feature set, not a hidden one — it's the whole product.",
    },
    {
      icon: 'Users',
      title: 'No per-workspace collaborator cap on Free',
      body: "Trello's Free plan caps a workspace at 10 boards and 10 collaborators. Kolumn's Free plan has no board or member cap — the limit on Free is 20 AI messages a day, not headcount.",
    },
  ],
  chooseThemInstead: [
    {
      title: 'You want more than one view of the same board',
      body: "Trello's Premium plan renders the same cards as Calendar, Timeline, Table, Dashboard, and Map views. Kolumn is kanban-only today — there is no calendar or timeline view of a board.",
    },
    {
      title: 'You rely on third-party integrations',
      body: "Trello's Power-Ups directory connects Slack, Jira, Google Drive, and well over a hundred other tools directly to a board. Kolumn has no live integrations — capturing from Slack or email today means pasting the text in, not a connected app.",
    },
    {
      title: 'You need a native mobile app',
      body: "Trello ships iOS and Android apps. Kolumn is a web app with no mobile app yet."
    },
    {
      title: 'You need enterprise-grade admin and compliance',
      body: "Trello's Enterprise plan includes SSO/user provisioning through Atlassian Guard and org-wide permission controls, backed by Atlassian's compliance program. Kolumn has row-level security and members-only boards, but SSO and formal compliance certifications (SOC 2 included) are not built yet — see /security.",
    },
    {
      title: 'You want a decade of stability and a large template community',
      body: "Trello has been running at scale since 2011 with a large, community-contributed template library. Kolumn launched recently, has a small template gallery, and has no track record at scale yet.",
    },
  ],
  competitorClaims: [
    {
      text: "Trello's Free plan is capped at 10 boards and 10 collaborators per workspace, with unlimited cards and 250 automation (“Workspace command”) runs a month.",
      source: 'https://trello.com/pricing',
      checkedOn: CHECKED_ON,
    },
    {
      text: 'Trello Standard is $5 per user/month billed annually ($6 billed monthly) and includes Trello AI features and unlimited boards.',
      source: 'https://trello.com/pricing',
      checkedOn: CHECKED_ON,
    },
    {
      text: 'Trello Premium is $10 per user/month billed annually ($12.50 billed monthly) and adds Calendar, Timeline, Table, Dashboard, and Map views on top of the same cards.',
      source: 'https://trello.com/pricing',
      checkedOn: CHECKED_ON,
    },
    {
      text: 'Trello Enterprise is $17.50 per user/month billed annually and includes free SSO and user provisioning through Atlassian Guard.',
      source: 'https://trello.com/pricing',
      checkedOn: CHECKED_ON,
    },
    {
      text: "Trello's own guide defines the core model as boards containing lists, with cards moving between lists — no separate “views” layer in that base structure.",
      source: 'https://trello.com/guide/trello-101',
      checkedOn: CHECKED_ON,
    },
  ],
  faq: [
    {
      q: 'Which is more like a classic kanban board?',
      a: "Both, at the core — Trello's board/list/card model and Kolumn's board/column/card model are the same shape. Trello adds more around that core (Power-Ups, Butler, extra views on paid plans); Kolumn adds an AI layer that reads and writes the same boards.",
    },
    {
      q: 'Is Trello AI the same as Kolumn’s pill and chat?',
      a: "No. Trello AI (per trello.com/pricing) covers content generation, grammar correction, checklist generation, and AI-generated boards, available from the Standard plan up. Kolumn's pill creates/moves/updates cards from a typed sentence on the board you're on, and chat answers read-only questions about your boards — a narrower, board-scoped pair of tools rather than a general writing assistant.",
    },
    ...KOLUMN_FAQ,
  ],
  cta: { heading: 'See the board for yourself.' },
}
