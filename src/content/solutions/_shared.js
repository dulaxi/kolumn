// Shared strings across every /solutions/<slug> page: the FAQ pool each
// vertical extends with one item, and the tier annotations shown under
// "How Kolumn helps" blocks. Kept in one place so a pricing or limit change
// doesn't require touching eight content files — see src/content/pricing.js
// for the numbers themselves (solution-page.md §4: "import from one
// constants module rather than retyping").
import { PRICING } from '../pricing'

const { freeMessagesPerDay, proMonthlyUsd } = PRICING.limits

// solution-page.md §3.5 — captions for helps[] blocks that use write tools
// beyond create, or that lean on Pro-only chat read tools.
export const TIER_STRINGS = {
  pillPro: `Pro — free plan creates cards only`,
  chatReadTools: `Chat answers questions on every plan; read tools on Pro`,
}

// solution-page.md §3.8 — the 4-item shared pool. Each vertical file adds
// one extra, vertical-specific FAQ item on top of this array.
export const SHARED_FAQ = [
  {
    q: 'Is it free?',
    a: `Yes. The free plan has boards, columns, cards, sharing and ${freeMessagesPerDay} AI messages a day; the pill creates cards for you. Pro is $${proMonthlyUsd}/month and adds the rest of the AI: moving, updating and completing cards from the pill, and read tools in chat.`,
  },
  {
    q: 'Who can see a board?',
    a: `Members, and only members. Every table sits behind row-level security in Postgres. Personal boards are private until you share them; workspace boards are visible to that workspace's members.`,
  },
  {
    q: 'Does the AI train on our cards?',
    a: `No. We don't train on your content. You can export your data and delete your account from Settings.`,
  },
  {
    q: 'Do we have to set anything up?',
    a: `No. There are no custom fields, workflows or required rituals. A board with three columns is a complete Kolumn setup; the AI handles the busywork.`,
  },
  {
    q: 'Can we bring work in from elsewhere?',
    a: `Paste it. Notes, a chat thread, a meeting transcript or an email pasted into the pill become cards. There is no importer and no live integrations today.`,
  },
]
