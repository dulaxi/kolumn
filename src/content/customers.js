// Content for /customers (hub) and /customers/<slug> (story). Plain JS
// data, no markdown loader — see src/content/tutorials.js for the pattern.
//
// Kolumn has no named customers yet. Every entry here is `kind: 'scenario'`
// — an illustrative composite, not a real team. Each one must render a
// visible "Scenario" label on both the hub tile (StoryCard) and the story
// page itself (CustomerStoryPage hero); that requirement is enforced by
// src/__tests__/ContentPages.test.jsx. `quoteBy` always ends in
// "(composite)" for the same reason — never a real-sounding attribution.
// No invented company names, logos, or metrics: `metrics` stays empty for
// every scenario, and the story renders `setup` in its place instead of a
// number. See docs/superpowers/specs/marketing/customers.md and
// _KOLUMN-BRIEF.md before adding a real customer story.

import { PRICING } from './pricing'

export const CUSTOMER_STORIES = [
  {
    slug: 'two-person-studio',
    kind: 'scenario',
    persona: 'Small team',
    featured: true,
    name: 'A two-person design studio',
    headline: 'A two-person studio runs six clients on one board',
    summary:
      'Two designers, six retainers, one board. Client emails go in through the pill and come out as cards nobody has to retype.',
    role: 'Co-founders, brand and web design',
    industry: 'Design services',
    teamSize: '2 people',
    plan: 'Pro',
    boards: 3,
    quote: 'We stopped keeping a separate list of "things the client mentioned." The board is the list now.',
    quoteBy: 'Mara, co-founder (composite)',
    setup: [
      { label: 'The pill', text: 'Every client email is pasted in and becomes cards' },
      { label: 'Chat', text: 'A Friday summary before each retainer call' },
    ],
    boardPreview: {
      columns: [
        { title: 'Requests', cards: ['Homepage hero copy v2', 'Add pricing table', 'Swap founder headshots'] },
        { title: 'In progress', cards: ['Case study layout', 'Brand deck refresh'] },
        { title: 'With client', cards: ['Nav restructure proposal'] },
        { title: 'Done', cards: ['Q3 newsletter template', 'Favicon set'] },
      ],
    },
    relatedSlugs: ['solo-founder', 'five-person-product-team'],
    body: [
      {
        type: 'paragraph',
        text: 'Mara and Teo run a two-person studio doing brand and web work for six retainer clients. Before Kolumn they had a board per client, a shared doc per client, and a habit of promising things in email that never made it onto either. Every Monday started with twenty minutes of reconciling the three.',
      },
      { type: 'heading', level: 2, text: 'The board' },
      {
        type: 'paragraph',
        text: 'They have three boards now, not six. One board, Client work, has four columns: Requests, In progress, With client, Done. Every card carries a label with the client’s name, so a filter on the label is the per-client view they used to keep as separate boards. The other two boards are Studio (their own site, invoicing, hiring a contractor) and a Pitch template they duplicate when a new prospect appears.',
      },
      { type: 'heading', level: 2, text: 'What the pill changed' },
      {
        type: 'paragraph',
        text: 'The habit that made the difference is small. When a client email arrives, Mara pastes the body into the pill on the Client work board and types one line on top: “client: Harbor, due Friday.” The AI reads the email, makes a card for each request it finds, labels them Harbor, and sets the due date. She checks the titles, deletes one if the AI over-read a pleasantry as a task, and moves on.',
      },
      { type: 'paragraph', quote: true, text: '“We stopped keeping a separate list of ‘things the client mentioned.’ The board is the list now.” — Mara, co-founder (composite)' },
      {
        type: 'paragraph',
        text: 'Short lists skip the AI entirely. Teo types “favicon set, og image, 404 page” into the pill and gets three cards in the Requests column immediately — no model call, no wait.',
      },
      { type: 'heading', level: 2, text: 'Friday' },
      {
        type: 'paragraph',
        text: 'Before each retainer call they open Chat and ask what moved for that client this week. The answer is a summary drawn from the board — what’s done, what’s waiting on the client, what’s overdue. Chat only reads; nothing changes unless they go back to the board and change it. That is the part they trust.',
      },
      { type: 'heading', level: 2, text: 'What it costs them' },
      {
        type: 'paragraph',
        text: 'Both are on Pro. The free tier would cover the pasting habit — it allows create-type actions — but they use "move everything tagged Harbor that’s done to Done" style requests often enough that the write tools earn the price.',
      },
    ],
  },
  {
    slug: 'nonprofit-coordinator',
    kind: 'scenario',
    persona: 'Nonprofit',
    featured: false,
    name: 'A volunteer coordinator at a food bank',
    headline: 'One coordinator, forty volunteers, and a board that survives the weekend',
    summary:
      'A part-time coordinator turns Sunday-night meeting notes into a week of shifts and tasks, and shares the board with people who never log in.',
    role: 'Volunteer coordinator (part-time)',
    industry: 'Nonprofit',
    teamSize: '1 staff + 3 shift leads',
    plan: 'Free',
    boards: 2,
    quote: "I'm not going to teach forty people a tool. I needed something where the board is the whole tool.",
    quoteBy: 'Devi, volunteer coordinator (composite)',
    setup: [
      { label: 'The pill', text: "Sunday meeting notes pasted in, split into the week's cards" },
      { label: 'Sharing', text: 'The board shared with three shift leads; the rest get a printout' },
    ],
    boardPreview: {
      columns: [
        { title: 'This week', cards: ['Tue delivery — 2 drivers', 'Sort donations Wed', 'Call the bakery'] },
        { title: 'Needs a volunteer', cards: ['Saturday front desk', 'Spanish-speaking intake'] },
        { title: 'Done', cards: ['Order pallets', 'Update signage'] },
      ],
    },
    relatedSlugs: ['two-person-studio', 'solo-founder'],
    body: [
      {
        type: 'paragraph',
        text: 'Devi coordinates about forty volunteers for a neighbourhood food bank, fifteen hours a week. The job is mostly logistics: who drives on Tuesday, who sorts on Wednesday, which shift still has nobody. The tool before Kolumn was a group chat and a paper sign-up sheet that lived in a drawer.',
      },
      { type: 'heading', level: 2, text: 'Two boards, one of which matters' },
      {
        type: 'paragraph',
        text: 'The board that matters is This week. Three columns: This week, Needs a volunteer, Done. Cards are shifts and errands. A card in Needs a volunteer is the whole recruiting system — when someone says yes, Devi types their name as the assignee and drags the card left.',
      },
      {
        type: 'paragraph',
        text: 'The second board, Grants and admin, is hers alone and is the kind of thing that used to be a folder of emails.',
      },
      { type: 'heading', level: 2, text: 'Sunday night' },
      {
        type: 'paragraph',
        text: 'The planning meeting is Sunday evening and produces a page of notes. Devi pastes the whole page into the pill and lets the AI split it into cards. It gets the shifts, the dates, and most of the errands. It occasionally makes a card out of a sentence that was just a complaint about the freezer. She deletes those.',
      },
      { type: 'paragraph', quote: true, text: '“I’m not going to teach forty people a tool. I needed something where the board is the whole tool.” — Devi, volunteer coordinator (composite)' },
      { type: 'heading', level: 2, text: 'Who sees it' },
      {
        type: 'paragraph',
        text: 'Three shift leads are members of the board and see changes as they happen. Nobody else has an account — Devi takes a screenshot of the board on Monday morning and shares it in the group chat. Kolumn does not need forty users for one person to get value from it, and that was the point.',
      },
      { type: 'heading', level: 2, text: 'Free tier, on purpose' },
      {
        type: 'paragraph',
        text: 'Devi is on the free plan. The daily allowance of AI messages covers one Sunday paste and a few mid-week additions. She has not needed the paid write tools: moving cards by hand is fine when there are twelve of them.',
      },
    ],
  },
  {
    slug: 'solo-founder',
    kind: 'scenario',
    persona: 'Solo',
    featured: false,
    name: 'A solo founder shipping a paid app',
    headline: 'A solo founder keeps product, support, and marketing on one screen',
    summary:
      'One person, three kinds of work, no project manager. The board is the only place the plan exists, and chat is how she asks it what’s next.',
    role: 'Founder and only employee',
    industry: 'Software',
    teamSize: '1',
    plan: 'Pro',
    boards: 1,
    quote:
      'The dangerous thing about working alone is that the plan lives in your head. Now it lives on the board and I can ask it questions.',
    quoteBy: 'Lena, founder (composite)',
    setup: [
      { label: 'The pill', text: 'Support emails and feature ideas typed in as they arrive' },
      { label: 'Chat', text: '"What\'s overdue?" every morning instead of scrolling' },
    ],
    boardPreview: {
      columns: [
        { title: 'Ideas', cards: ['CSV import', 'Dark mode', 'Annual plan'] },
        { title: 'Now', cards: ['Fix export bug', 'Stripe webhook retry'] },
        { title: 'Support', cards: ['Refund — order 4471', 'Onboarding email typo'] },
        { title: 'Shipped', cards: ['Password reset flow'] },
      ],
    },
    relatedSlugs: ['two-person-studio', 'five-person-product-team'],
    body: [
      {
        type: 'paragraph',
        text: 'Lena builds and sells a small scheduling app. She writes the code, answers the support inbox, and does the marketing, alone. She has tried task managers that wanted her to set up projects and sprints for a team of one, and stopped using each of them within a month.',
      },
      { type: 'heading', level: 2, text: 'One board with four columns' },
      {
        type: 'paragraph',
        text: 'Ideas, Now, Support, Shipped. That is the entire system. Cards get a priority and sometimes a due date; nothing else is required. Support tickets are cards in the Support column with the customer’s order number in the title, which is enough to find them again with search.',
      },
      { type: 'heading', level: 2, text: 'How things get on the board' },
      {
        type: 'paragraph',
        text: 'Mostly through the pill, mostly in one line. “refund order 4471, high priority” becomes a card in Support with the priority set. A longer support email gets pasted in whole and comes back as one or two cards with the actual request extracted from the apology and the context.',
      },
      {
        type: 'paragraph',
        text: 'Feature ideas arrive the same way, usually at night: “idea: annual plan with two months free.” The AI puts it in Ideas because the board’s column names make the intent obvious.',
      },
      { type: 'paragraph', quote: true, text: '“The dangerous thing about working alone is that the plan lives in your head. Now it lives on the board and I can ask it questions.” — Lena, founder (composite)' },
      { type: 'heading', level: 2, text: 'Morning' },
      {
        type: 'paragraph',
        text: 'The first thing she does is open Chat and ask what is overdue and what is in Now. It answers from the board. She does not use it to change anything — that stays a deliberate act on the board itself — but she has stopped scrolling the columns to build the day’s list in her head.',
      },
      { type: 'heading', level: 2, text: 'Why Pro' },
      {
        type: 'paragraph',
        text: `The write tools. "Move everything in Support older than a week to Shipped if it’s completed" is a sentence, not a ten-minute tidy. At $${PRICING.limits.proMonthlyUsd} a month it replaced two tools she was paying more for and using less.`,
      },
    ],
  },
  {
    slug: 'five-person-product-team',
    kind: 'scenario',
    persona: 'Small team',
    featured: false,
    name: 'A five-person product team',
    headline: 'A five-person team replaced its stand-up with a board and a question',
    summary:
      'Two engineers, a designer, a PM, and a founder share a workspace. Meeting transcripts go in through the pill; the Monday stand-up became a chat summary.',
    role: 'Product manager',
    industry: 'Software',
    teamSize: '5',
    plan: 'Pro',
    boards: 4,
    quote: 'We kept the Kanban. We just stopped being the ones who typed everything into it.',
    quoteBy: 'Jonah, product manager (composite)',
    setup: [
      { label: 'Workspace', text: 'One workspace, four boards, everyone a member' },
      { label: 'The pill', text: 'Meeting transcripts pasted in after each planning call' },
    ],
    boardPreview: {
      columns: [
        { title: 'Backlog', cards: ['Bulk invite flow', 'Audit log export', 'Empty-state copy'] },
        { title: 'This sprint', cards: ['Invite email template', 'Role picker UI', 'Rate-limit banner'] },
        { title: 'Review', cards: ['Session revoke endpoint'] },
        { title: 'Done', cards: ['Workspace switcher', 'Member list'] },
      ],
    },
    relatedSlugs: ['two-person-studio', 'solo-founder'],
    body: [
      {
        type: 'paragraph',
        text: 'Five people: two engineers, a designer, a product manager, and the founder who still writes code on Thursdays. They had used a tool with custom fields for tracking and a separate doc for the roadmap and a chat channel for the actual decisions. Nobody could say which of the three was true.',
      },
      { type: 'heading', level: 2, text: 'The workspace' },
      {
        type: 'paragraph',
        text: 'One Kolumn workspace, four boards, all five people members of all four. Product is the main board with Backlog, This sprint, Review, Done. Bugs, Design, and Ops are smaller and quieter. Realtime sync means the board on the designer’s screen is the board on the PM’s — no refresh, no "did you see my update."',
      },
      { type: 'heading', level: 2, text: 'After the planning call' },
      {
        type: 'paragraph',
        text: 'The planning call is recorded and transcribed. Jonah pastes the transcript into the pill on the Product board with "sprint 14" typed above it. The AI pulls out the commitments — the things someone said they would do — and makes a card for each, assigning it to the person who said it. He reads the list against his own notes. It usually gets nine out of ten; the tenth is a sentence that sounded like a commitment and wasn’t.',
      },
      { type: 'paragraph', quote: true, text: '“We kept the Kanban. We just stopped being the ones who typed everything into it.” — Jonah, product manager (composite)' },
      { type: 'heading', level: 2, text: 'The stand-up that became a question' },
      {
        type: 'paragraph',
        text: 'Monday stand-up is now the PM opening Chat and asking what moved on Product since Friday and what is stuck in Review. The summary goes into the team channel. People still talk — but about the two cards that need a decision, not about reading the board aloud.',
      },
      { type: 'heading', level: 2, text: 'Things that stayed manual' },
      {
        type: 'paragraph',
        text: 'Dragging cards. Assigning the designer to a card because you know she’s the right person, not because a transcript said so. Deleting cards, which asks for confirmation and can be undone. The AI creates and moves; the humans decide.',
      },
      { type: 'heading', level: 2, text: 'Plan' },
      {
        type: 'paragraph',
        text: 'Everyone is on Pro. The Team tier exists but its pricing is not published yet, which is the honest answer to "why not Team."',
      },
    ],
  },
]

export function getStory(slug) {
  return CUSTOMER_STORIES.find((s) => s.slug === slug) || null
}

export function featuredStory() {
  return CUSTOMER_STORIES.find((s) => s.featured) || CUSTOMER_STORIES[0]
}

export function relatedStories(story, count = 3) {
  const explicit = (story.relatedSlugs || []).map((s) => getStory(s)).filter(Boolean)
  if (explicit.length >= count) return explicit.slice(0, count)
  const fallback = CUSTOMER_STORIES.filter((s) => s.slug !== story.slug && !explicit.includes(s))
  return [...explicit, ...fallback].slice(0, count)
}
