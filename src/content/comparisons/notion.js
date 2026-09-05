// /compare/notion. Every fact about Notion below was checked against a live
// fetch of notion.com on CHECKED_ON — see _shared.js. Structural claim
// (board/kanban is one of several views on a database, which is a
// collection of pages) is sourced from notion.com/help/intro-to-databases;
// pricing figures (including the monthly-vs-annual split) are sourced from
// notion.com/pricing.
import { CHECKED_ON, KOLUMN_POSITIONING, KOLUMN_FAQ } from './_shared'

export const META = {
  title: 'Kolumn vs Notion — Kolumn',
  description:
    'How Kolumn compares to Notion: Notion boards are one view on a database inside a document workspace; Kolumn boards are the whole product.',
  ogTitle: 'Kolumn vs Notion',
  ogDescription: 'A document-first workspace with a board view, versus a board-first tool with an AI layer.',
}

export const COMPARISON = {
  slug: 'notion',
  name: 'Notion',
  checkedOn: CHECKED_ON,
  hero: {
    h1: 'Kolumn vs Notion',
    subhead:
      'Notion is a document workspace first — pages, wikis, and databases you can view as a table, list, calendar, gallery, timeline, or board. Kolumn is a board, and only a board.',
    cta: { label: 'Start free', to: '/onboarding' },
  },
  positioning: {
    kolumn: KOLUMN_POSITIONING,
    competitor:
      "Notion's own help center puts it directly: “databases in Notion are collections of pages” that display as “a list, calendar, chart, and more,” including a board view — “your data isn't limited to a table.” A Notion board is a view configuration on top of a database of pages, and that database in turn lives inside Notion's broader page/block document model — the same content can be a table one moment and a kanban board the next, because the board is a lens, not a separate structure.",
  },
  competitorPricing: {
    source: 'https://www.notion.com/pricing',
    checkedOn: CHECKED_ON,
    tiers: [
      {
        name: 'Free',
        price: '$0',
        period: 'forever',
        note: '5 MB file uploads, limited blocks once a workspace has 2+ members, 10 guests, 7-day page history.',
      },
      {
        name: 'Plus',
        price: '$10',
        period: 'per user/month billed annually ($12 billed monthly)',
        note: 'Unlimited file uploads and blocks, custom forms and sites, unlimited charts.',
      },
      {
        name: 'Business',
        price: '$20',
        period: 'per user/month billed annually ($24 billed monthly)',
        note: 'Notion Agent (multi-step tasks), AI meeting notes, unlimited guests, granular database permissions.',
      },
      {
        name: 'Enterprise',
        price: 'Contact sales',
        period: null,
        note: 'Zero data retention with LLM providers, advanced security controls and audit logs, SCIM provisioning.',
      },
    ],
  },
  differentiators: [
    {
      icon: 'Kanban',
      title: 'The board is not a view — it is the app',
      body: 'In Notion, a board is one of several ways to display a database of pages inside a larger document workspace. In Kolumn, there is no document layer underneath — the board is the entire structure, so a new card is a card, not a page you could also open as a table row.',
    },
    {
      icon: 'ChatCircleDots',
      title: 'A narrower AI, no separate add-on',
      body: "Notion AI is a trial on Free and Plus, then a fuller feature (Notion Agent, meeting notes) on Business, and custom AI credit packs are billed separately from the plan price. Kolumn's pill and chat are included in Free and Pro with no separate AI add-on to buy.",
    },
    {
      icon: 'FileText',
      title: 'No document layer to maintain',
      body: "Notion's page history is capped at 7 days on Free. Kolumn has no page-history feature at all, because there are no pages — cards carry the same fields (title, description, checklist, labels) whether you're on Free or Pro.",
    },
  ],
  chooseThemInstead: [
    {
      title: 'You want docs, wikis, and boards in one workspace',
      body: 'Notion combines a document editor, a wiki, and database views (including kanban) in a single tool. If the plan is to write specs, keep a knowledge base, and track tasks in the same place, that is a genuinely different and broader product than Kolumn, which is only the board.',
    },
    {
      title: 'You need more than a board view of the same data',
      body: 'A Notion database can be viewed as a table, calendar, gallery, or timeline, all backed by the same underlying pages. Kolumn has one view: the board.',
    },
    {
      title: 'You want a page-level permission and history model',
      body: "Notion's per-page sharing, guest limits by plan, and page history (7 days on Free, longer on paid plans) give fine-grained control over documents. Kolumn's access model is board-membership only — a member can see and edit the whole board, not a subset of pages within it.",
    },
    {
      title: 'You need enterprise data-handling guarantees today',
      body: "Notion Enterprise offers zero data retention with its LLM providers and audit logs. Kolumn doesn't train on your content and runs row-level security on every table, but doesn't yet offer a formal zero-retention guarantee or audit-log export — see /security.",
    },
    {
      title: 'You already live in Notion for everything else',
      body: 'If docs, wikis, and specs are already in Notion, adding its board view avoids a second tool entirely. Kolumn only replaces the board, not the rest of a Notion workspace.',
    },
  ],
  competitorClaims: [
    {
      text: "Notion's Free plan caps file uploads at 5 MB, limits page history to 7 days, and limits blocks once a workspace has more than one member.",
      source: 'https://www.notion.com/pricing',
      checkedOn: CHECKED_ON,
    },
    {
      text: 'Notion Plus is $10 per user/month billed annually ($12 billed monthly) and includes unlimited file uploads and unlimited blocks.',
      source: 'https://www.notion.com/pricing',
      checkedOn: CHECKED_ON,
    },
    {
      text: 'Notion Business is $20 per user/month billed annually ($24 billed monthly) and adds Notion Agent, AI meeting notes, and unlimited guests.',
      source: 'https://www.notion.com/pricing',
      checkedOn: CHECKED_ON,
    },
    {
      text: "Notion Enterprise pricing is by quote and includes zero data retention with Notion's LLM providers plus audit logs and SCIM provisioning.",
      source: 'https://www.notion.com/pricing',
      checkedOn: CHECKED_ON,
    },
    {
      text: "Notion's help center states that \"databases in Notion are collections of pages\" that can be displayed as a table, list, board, calendar, gallery, or timeline — multiple views of one underlying database, not separate structures.",
      source: 'https://www.notion.com/help/intro-to-databases',
      checkedOn: CHECKED_ON,
    },
  ],
  faq: [
    {
      q: 'Is a Notion board the same thing as a Kolumn board?',
      a: 'Structurally, no. A Notion board is a view on top of a database of pages, inside a larger document workspace — per Notion\'s help center, the same database can be shown as a table, list, calendar, gallery, or timeline instead. A Kolumn board has no underlying database or document layer; the board is the data.',
    },
    {
      q: 'Can Kolumn do what Notion does?',
      a: "No, and it isn't trying to. Kolumn has no page editor, no wiki, no database-view system — it's a kanban board with an AI layer on top. If the plan includes docs and wikis alongside task tracking, Notion is a broader tool built for that; Kolumn is narrower on purpose.",
    },
    ...KOLUMN_FAQ,
  ],
  cta: { heading: 'A board with nothing else to configure.' },
}
