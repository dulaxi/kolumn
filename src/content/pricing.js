// Single source of truth for every price, limit, and plan bullet shown to
// users. src/data/plans.js derives the in-app PLANS from `tiers`;
// UpgradeProPage reads `limits`; the /pricing page renders all of it.
// FREE_DAILY_LIMIT in supabase/functions/chat/tier.ts must equal
// limits.freeMessagesPerDay — src/__tests__/pricingContent.test.js pins it.

export const CONTACT_EMAIL = 'hello@kolumn.app'

export const PRICING = {
  meta: {
    title: 'Pricing — Kolumn',
    description:
      'Kolumn is free for boards, cards, and 20 AI messages a day. Pro is $8 a month for unlimited AI on every board. Team is on the way.',
    ogTitle: 'Kolumn pricing',
    ogDescription: 'Free for boards, cards, and 20 AI messages a day. Pro is $8 a month.',
  },
  hero: {
    heading: 'Pricing',
    subhead: 'Free for as long as you like. Pro when the AI should do more than create cards.',
  },
  limits: { freeMessagesPerDay: 20, proMonthlyUsd: 8, proYearlyUsd: 80, trialDays: 7 },
  tiers: [
    {
      id: 'free',
      name: 'Free',
      tagline: 'For getting started',
      price: '$0',
      period: 'forever',
      caption: 'No card, no time limit.',
      badge: null,
      comingSoon: false,
      inheritsFrom: null,
      bullets: [
        'Unlimited boards, columns, and cards',
        'Drag-and-drop, labels, priorities, due dates, checklists',
        'Realtime sync with everyone on the board',
        'The pill creates cards from plain language — 20 AI messages a day',
        'Chat: ask questions, search cards, and summarize boards',
        'Board and card templates',
      ],
      cta: { label: 'Start for free', to: '/onboarding' },
    },
    {
      id: 'pro',
      name: 'Pro',
      tagline: 'For daily use',
      price: '$8',
      period: 'month',
      caption:
        'Billed monthly, plus tax. $80 a year if you pay up front. Paid billing has not launched yet — see the pricing FAQ for what selecting Pro does today.',
      badge: 'Recommended',
      comingSoon: false,
      inheritsFrom: 'Free',
      bullets: [
        'No daily AI message limit',
        'The pill moves, updates, completes, and reorganizes cards — not just creates them',
        '7-day free trial — no card is charged either way while billing is in early access',
      ],
      // Label avoids "free trial", which implies a card and a countdown that
      // do not exist yet. Billing is in early access; nothing is charged.
      cta: { label: 'Get Pro in early access', to: '/onboarding' },
    },
    {
      id: 'team',
      name: 'Team',
      tagline: 'For workspaces',
      price: 'Coming soon',
      period: null,
      caption: 'Shared workspaces for more than one team. Pricing is not set yet.',
      badge: null,
      comingSoon: true,
      inheritsFrom: 'Pro',
      bullets: [
        'Workspaces with members and invitations',
        'Boards shared per workspace or per board',
        'Row-level security on every table, members-only access',
      ],
      cta: { label: 'Get notified', to: `mailto:${CONTACT_EMAIL}?subject=Kolumn%20Team%20plan` },
    },
  ],
  footnote:
    'Prices are in USD and exclude tax. The free message limit resets every day. Plans can change; we will email you before anything you pay for does.',
  comparison: {
    columns: ['Free', 'Pro', 'Team'],
    note: 'Team is in progress. It will include everything in Pro; what it adds beyond that is not final.',
    rows: [
      { label: 'Boards, columns, cards', cells: ['Unlimited', 'Unlimited', 'Unlimited'] },
      { label: 'AI messages per day', cells: ['20', 'No limit', 'No limit'] },
      { label: 'Pill: create cards from plain language', cells: [true, true, true] },
      { label: 'Pill: move, update, complete, reorganize', cells: [false, true, true] },
      { label: 'Chat: ask questions, search cards, and summarize boards', cells: [true, true, true] },
      { label: 'Realtime sync across members', cells: [true, true, true] },
      { label: 'Board and card templates', cells: [true, true, true] },
      { label: 'Workspaces with members and invitations', cells: [true, true, true] },
      { label: 'Export your data, delete your account', cells: [true, true, true] },
      { label: 'Row-level security, members-only boards', cells: [true, true, true] },
    ],
  },
  reassurance: {
    heading: 'Not sure? Start on Free.',
    body: 'Every plan uses the same boards. Move to Pro from Settings when you hit the daily limit; nothing is lost either way.',
    cta: { label: 'Start for free', to: '/onboarding' },
  },
  faq: [
    {
      q: 'What do I get on Free?',
      a: 'Boards, columns, and cards with no cap, realtime sync with your team, templates, and the AI pill on every board. Free gets 20 AI messages a day; the counter resets daily. Chat works too — it answers questions, and can search your cards and summarize a board, on every plan including Free.',
    },
    {
      q: 'What does Pro change?',
      a: 'Two things. The daily message limit goes away, and the AI is allowed to do more than create: it can move, update, complete, and reorganize cards on the board you are looking at. Pro is priced at $8 a month, billed monthly, or $80 for a year, once paid billing launches.',
    },
    {
      q: 'What counts as an AI message?',
      a: 'Anything you send to the pill or to chat. Lists you paste into the pill with commas or line breaks are split into cards without touching the AI, so they never count. A single message that triggers several actions still counts once.',
    },
    {
      q: 'Is Pro billing live yet?',
      a: "Not yet. Kolumn's paid billing has not launched, so Pro is not chargeable today — no payment method is collected anywhere in the app. Choosing Pro from onboarding or Settings switches your account to Pro immediately at no cost. We will email everyone before any card is charged once billing does launch; until then you can move back to Free anytime from Settings.",
    },
    {
      q: 'Is there a trial?',
      a: "Pro is framed as a 7-day free trial, but since paid billing has not launched, nothing is charged when the trial period ends either — you simply stay on Pro until you switch back to Free yourself, from Settings.",
    },
    {
      q: 'Can I switch plans later?',
      a: 'Any time, from Settings. Downgrading to Free keeps every board, card, and workspace exactly as it is; the only thing that changes is what the AI is allowed to do next.',
    },
    {
      q: 'What about the Team plan?',
      a: 'Team is being built. It will include everything in Pro and is aimed at workspaces shared across more than one team. There is no price yet; if we announce one, people who asked to be notified hear first.',
    },
    {
      q: 'Is my data private?',
      a: 'Yes. Every table uses row-level security, so only members of a board can read it. We do not train on your content, and you can export or delete everything from Settings.',
    },
  ],
}

export function pricingJsonLd() {
  const { limits, faq } = PRICING
  return [
    {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: 'Kolumn',
      brand: { '@type': 'Organization', name: 'Kolumn' },
      offers: [
        { '@type': 'Offer', name: 'Free', price: 0, priceCurrency: 'USD', availability: 'https://schema.org/InStock' },
        {
          '@type': 'Offer',
          name: 'Pro',
          price: limits.proMonthlyUsd,
          priceCurrency: 'USD',
          // Paid billing has not launched. PreOrder keeps a rich result from
          // presenting "$8" as a price you can pay today, which the visible
          // page is careful to qualify.
          availability: 'https://schema.org/PreOrder',
          priceSpecification: [
            { '@type': 'UnitPriceSpecification', price: limits.proMonthlyUsd, priceCurrency: 'USD', billingDuration: 'P1M' },
            { '@type': 'UnitPriceSpecification', price: limits.proYearlyUsd, priceCurrency: 'USD', billingDuration: 'P1Y' },
          ],
        },
      ],
    },
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: faq.map(({ q, a }) => ({
        '@type': 'Question',
        name: q,
        acceptedAnswer: { '@type': 'Answer', text: a },
      })),
    },
  ]
}
