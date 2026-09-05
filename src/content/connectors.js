// Content for the /connectors page ("capture from anywhere"). Structured as
// plain data — see src/content/pricing.js for the pattern this follows.
//
// Honesty rule (docs/superpowers/specs/marketing/connectors.md): Kolumn has
// no OAuth integrations. The four SOURCES below are kinds of text a person
// pastes or types into the pill, not live connections. Every line here has
// to survive "does the app do this today?" — the INTEGRATIONS block is the
// one deliberately forward-looking, clearly-labelled exception.

export const CONTACT_EMAIL = 'hello@kolumn.app'

export const META = {
  title: 'Capture from anywhere — paste text, get cards | Kolumn',
  description:
    'Paste notes, an email, a chat thread, or a meeting transcript into Kolumn and the AI turns it into cards on your board. No integrations to set up.',
  ogTitle: 'Capture from anywhere · Kolumn',
  ogDescription:
    'Paste notes, an email, a chat thread, or a meeting transcript into Kolumn and the AI turns it into cards on your board. No integrations to set up.',
}

export const HERO = {
  h1: 'Capture from anywhere',
  subhead:
    'Notes, an email, a chat thread, a meeting transcript — paste it into Kolumn and the AI turns it into cards on your board. Nothing to connect first.',
  primaryCta: { label: 'Start free', to: '/onboarding' },
  secondaryCta: { label: 'See how it works', to: '#how-it-works' },
}

// Icon names are Phosphor component names, resolved in ConnectorsPage.jsx —
// same pattern as the landing page's SLIDES vocabulary.
export const SOURCES = [
  {
    id: 'notes',
    icon: 'Notepad',
    title: 'Draft notes',
    description:
      'Type the way you think — redo hero, 3 pricing tiers, stripe integration b4 fri. Kolumn reads the shorthand and writes proper cards: a title, a one-line description, a label, a priority, and a due date where you hinted at one.',
  },
  {
    id: 'email',
    icon: 'Envelope',
    title: 'A pasted email',
    description:
      'Copy the body of an email that asks three people for three things. Kolumn finds each ask, turns it into its own card, assigns it to the person named, and keeps the "by tonight" as the due date.',
  },
  {
    id: 'chat',
    icon: 'ChatsCircle',
    title: 'A chat thread',
    description:
      'Paste a thread from your team chat. Each @mention with a request becomes a card for that person — roll back the deploy, draft the status post, start the postmortem — with today or tomorrow already set.',
  },
  {
    id: 'transcript',
    icon: 'Waveform',
    title: 'A meeting transcript',
    description:
      'Drop in the transcript from your recording tool. Kolumn reads who volunteered for what and makes one card per commitment, owner and day included, so the meeting ends with a board instead of a memory.',
  },
]

export const SOURCES_FOOTNOTE = 'Everything above is paste or type. Kolumn does not read your inbox, chat, or calls.'

export const STEPS = [
  {
    n: '01',
    title: 'Open a board',
    body: 'Every board has a pill at the bottom. Click it or press the shortcut — that is where text goes in.',
  },
  {
    n: '02',
    title: 'Paste, or type',
    body: 'Drop in the email, the thread, the transcript, or just your own shorthand. A plain comma- or line-separated list skips the AI and becomes cards instantly; anything richer goes to the AI.',
  },
  {
    n: '03',
    title: 'Read the cards',
    body: 'Cards land in the board’s first column (or the one you name) with a title, description, label, priority, assignee, and due date where the text implied one. Drag, edit, or undo — they are ordinary cards.',
  },
]

export const TIER_NOTE = {
  body: 'Free plans get 20 AI messages a day and card creation from the pill. Pro adds moves, updates, and completions from the same pill.',
  cta: { label: 'Compare plans', to: '/pricing' },
}

export const INTEGRATIONS = {
  eyebrow: 'Not yet',
  body: 'Kolumn does not connect to Slack, Gmail, Notion, or a calendar today. Whether it should — and which one first — is an open question we would rather ask than guess. If you paste from the same place every day, tell us which.',
  cta: { label: 'Tell us what to connect', to: `mailto:${CONTACT_EMAIL}?subject=What%20should%20Kolumn%20connect%20to%3F` },
}

export const FAQ = [
  {
    q: 'Does Kolumn read my email or chat?',
    a: 'No. Nothing is connected to your accounts. You copy the text yourself and paste it into a board. The AI only sees what you paste.',
  },
  {
    q: 'What happens to the text I paste?',
    a: 'It is sent to the AI once to produce the cards, and the cards are stored on your board like any other. We do not train on your content, and you can export or delete your data from Settings at any time.',
  },
  {
    q: 'Does it work on the free plan?',
    a: 'Yes. Free plans get 20 AI messages a day and can create cards from pasted text. Moving, updating, and completing cards from the pill are Pro.',
  },
]

export function connectorsJsonLd() {
  return [
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Kolumn', item: '/' },
        { '@type': 'ListItem', position: 2, name: 'Capture from anywhere', item: '/connectors' },
      ],
    },
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: FAQ.map(({ q, a }) => ({
        '@type': 'Question',
        name: q,
        acceptedAnswer: { '@type': 'Answer', text: a },
      })),
    },
  ]
}
