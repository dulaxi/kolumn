// /compare/asana. Every fact about Asana below was checked against a live
// fetch of asana.com on CHECKED_ON — see _shared.js. Structural claim (tasks
// live inside projects; board/kanban is one of several views on the same
// task data) is sourced from asana.com/product; pricing figures are sourced
// from asana.com/pricing.
import { CHECKED_ON, KOLUMN_POSITIONING, KOLUMN_FAQ } from './_shared'

export const META = {
  title: 'Kolumn vs Asana — Kolumn',
  description:
    'How Kolumn compares to Asana: Asana treats a board as one view of a task inside a project; Kolumn treats the board as the whole product.',
  ogTitle: 'Kolumn vs Asana',
  ogDescription: 'A single-purpose kanban vs. a multi-view work-management suite that includes one.',
}

export const COMPARISON = {
  slug: 'asana',
  name: 'Asana',
  checkedOn: CHECKED_ON,
  hero: {
    h1: 'Kolumn vs Asana',
    subhead:
      "Asana is a work-management platform where a project's tasks can be viewed as a list, a board, a timeline, or a calendar — kanban is one lens among several on the same data. Kolumn only has the board.",
    cta: { label: 'Start free', to: '/onboarding' },
  },
  positioning: {
    kolumn: KOLUMN_POSITIONING,
    competitor:
      "Asana organizes work as tasks inside projects, and a project supports several interchangeable views of that same task list — on Asana's own product page, a “boards project” is one such view, with columns you can add to organize tasks and drag cards between. Timeline, calendar, and list views show the same underlying tasks differently. So a Kanban board in Asana is a display mode on top of a broader task/project data model, not the base unit the way it is in Kolumn.",
  },
  competitorPricing: {
    source: 'https://asana.com/pricing',
    checkedOn: CHECKED_ON,
    tiers: [
      {
        name: 'Personal',
        price: '$0',
        period: 'forever',
        note: 'Up to 2 users can collaborate for free; unlimited tasks and projects; list, board, and calendar views.',
      },
      {
        name: 'Starter',
        price: '$10.99',
        period: 'per user/month billed annually ($13.49 billed monthly)',
        note: 'Unlimited team members, Timeline and Gantt views, unlimited automations and forms, AI Studio (50K credits/month).',
      },
      {
        name: 'Advanced',
        price: '$24.99',
        period: 'per user/month billed annually ($30.49 billed monthly)',
        note: 'Unlimited portfolios and goals, approvals and proofing, AI Studio (75K credits/month).',
      },
      {
        name: 'Enterprise',
        price: 'Contact sales',
        period: null,
        note: 'SAML authentication and user provisioning, universal workload and capacity planning, AI Studio (200K credits/month).',
      },
    ],
  },
  differentiators: [
    {
      icon: 'Sparkle',
      title: 'The board is the whole product',
      body: "Asana's board view sits alongside list, timeline, and calendar views of the same tasks — useful if a team wants those other lenses, but it means the board is one configuration choice among several rather than the app itself. Kolumn only offers the board.",
    },
    {
      icon: 'ChatCircleDots',
      title: 'A narrower AI, scoped to the board',
      body: "Asana's AI Studio is a workflow-automation layer with a monthly credit budget, available from the Starter plan up. Kolumn's pill and chat are unmetered by credits — the limit on Free is a daily message count, not a credit pool — but they only ever act on the board you're looking at.",
    },
    {
      icon: 'Users',
      title: 'No 2-person cap on Free',
      body: "Asana's free Personal plan is capped at 2 collaborators. Kolumn's Free plan has no headcount cap — any number of people can join a board or workspace on Free; the daily limit is on AI messages, not members.",
    },
  ],
  chooseThemInstead: [
    {
      title: 'Your team has outgrown pure kanban',
      body: 'Asana adds goals, portfolios, dependencies, approvals, and timeline/Gantt planning on top of tasks — real project-management structure Kolumn does not have and is not building toward. If a team needs those, Asana is built for it and Kolumn is not.',
    },
    {
      title: 'You need more than 2 free collaborators without paying',
      body: "Asana's free Personal plan caps out at 2 people; a bigger free team needs a paid Asana tier. Kolumn's Free plan has no collaborator cap, so this cuts the other way for larger free teams — worth naming because it is the one place Asana's free tier is more restrictive, not less.",
    },
    {
      title: 'You want workflow automation across many tools',
      body: 'AI Studio and unlimited automations/forms (from Starter up) let Asana trigger actions across connected systems. Kolumn has no automation-rule builder and no third-party connections.',
    },
    {
      title: 'You need enterprise identity and compliance controls',
      body: "Asana Enterprise includes SAML authentication, user provisioning, and an Enterprise+ tier for heavier security/compliance needs. Kolumn has row-level security and members-only boards, but no SSO and no compliance certifications yet — see /security.",
    },
    {
      title: 'You want an established, mature product',
      body: 'Asana has run at scale for well over a decade with a large customer base and support organization. Kolumn is new, with no enterprise customers or track record at that scale yet.',
    },
  ],
  competitorClaims: [
    {
      text: "Asana's free Personal plan allows up to 2 users to collaborate; unlimited tasks and projects; list, board, and calendar views.",
      source: 'https://asana.com/pricing',
      checkedOn: CHECKED_ON,
    },
    {
      text: 'Asana Starter is $10.99 per user/month billed annually ($13.49 billed monthly) and includes unlimited team members, Timeline/Gantt views, and AI Studio Basic with 50,000 credits per billing account per month.',
      source: 'https://asana.com/pricing',
      checkedOn: CHECKED_ON,
    },
    {
      text: 'Asana Advanced is $24.99 per user/month billed annually ($30.49 billed monthly) and includes unlimited portfolios and goals plus AI Studio Basic with 75,000 credits per month.',
      source: 'https://asana.com/pricing',
      checkedOn: CHECKED_ON,
    },
    {
      text: 'Asana Enterprise pricing is by quote and includes SAML authentication, user provisioning, and AI Studio Basic with 200,000 credits per month.',
      source: 'https://asana.com/pricing',
      checkedOn: CHECKED_ON,
    },
    {
      text: "Asana's own product page describes adding columns to organize tasks in a \"boards project\" with drag-and-drop between columns — a board is one of several views (alongside list, timeline, calendar) on the same project's tasks.",
      source: 'https://asana.com/product',
      checkedOn: CHECKED_ON,
    },
  ],
  faq: [
    {
      q: 'Is Asana a kanban tool?',
      a: 'Asana can show a project as a kanban board, but the board is one of several views (list, board, timeline, calendar) over the same underlying tasks — per asana.com/product, you add columns to a "boards project" rather than the board being the project itself. Kolumn only has the board.',
    },
    {
      q: 'Does Asana have an AI pill like Kolumn?',
      a: 'Not the same shape. Asana AI Studio (from Starter up) is a workflow/automation builder with a monthly credit allowance. Kolumn\'s pill writes to the board you\'re on from a typed sentence, and chat answers read-only questions — both scoped to a single board rather than cross-tool automation.',
    },
    ...KOLUMN_FAQ,
  ],
  cta: { heading: 'Start with a board, not a setup wizard.' },
}
