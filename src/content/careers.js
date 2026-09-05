// Content for /careers. See docs/superpowers/specs/marketing/careers.md §3-4.
// Ships with zero open roles — the empty state is the honest, current state
// of the page. ROLES is here so a real role only ever needs a data entry,
// never a redesign.

import { CONTACT_EMAIL } from './pricing'
import { VALUES } from './about'

export { VALUES }

export const CAREERS_CONTACT = CONTACT_EMAIL

export const CAREERS_META = {
  title: 'Careers at Kolumn',
  description:
    "Kolumn is built by a very small team. There are no open roles right now, but if you'd like to talk about working on it, say hi.",
  ogTitle: 'Careers at Kolumn',
  ogDescription:
    "Kolumn is built by a very small team. There are no open roles right now, but if you'd like to talk about working on it, say hi.",
}

export const HERO = {
  heading: 'Work on Kolumn',
  subhead:
    "Kolumn is built by a very small team. There are no open roles right now. If you'd like to talk about working on it anyway — design, engineering, or something we haven't thought of — say hi.",
}

export const HOW_WE_BUILD = {
  heading: 'How Kolumn gets built',
  items: [
    {
      title: 'Small surface, on purpose.',
      body: "Boards, a pill, a chat. Every new thing has to earn its place against those three, and most don't.",
    },
    {
      title: 'Ship to real boards.',
      body: 'Changes go to the product people actually use, quickly, with an undo. The verify step is opening the app and using it.',
    },
    {
      title: 'Copy is held to the code.',
      body: "If the site says it, the code does it. That's true of the security page and it's true of this one.",
    },
  ],
}

// Ships empty — see careers.md §5. Each entry, when real, is
// { slug, title, team, location, type, summary, href, datePosted }.
export const ROLES = []

export const OPEN_ROLES_EMPTY = {
  heading: 'Open roles',
  lede: "Everything listed here is real and current. When there's nothing, we say so.",
  caption: '0 open roles',
  title: 'No open roles right now',
  body: "We're not hiring at the moment. If you'd like to be the first to hear when that changes, or you just want to talk shop, send a note.",
  cta: { label: 'Say hi', href: `mailto:${CAREERS_CONTACT}` },
}

// Row 3 (remote/location) is unanswered — `a: null` rows are filtered at
// render, per careers.md §3.7.
export const FAQ = [
  {
    q: 'Do you offer internships?',
    a: 'Not right now. The team is too small to give an intern a good experience, and a bad internship is worse than none.',
  },
  {
    q: 'Can I send a speculative application?',
    a: "Yes. A short note about what you'd want to work on and a link to something you've made is enough. We read all of them and reply to all of them, though not always fast.",
  },
  {
    q: 'Is the work remote?',
    a: null,
  },
]

export const CTA = {
  heading: 'Meanwhile, try the thing.',
  body: "The best way to know if you'd want to work on Kolumn is to use it for a week.",
  primary: { label: 'Start free', to: '/onboarding' },
  secondary: { label: 'About Kolumn', to: '/about' },
}
