// Content for /tutorials (hub) and /tutorials/<slug> (article). Plain JS
// data — no markdown loader (see src/content/pricing.js and templates.js
// for the same pattern). Body blocks are consumed by
// src/components/marketing/Prose.jsx.
//
// Only the pill tutorial (list-to-cards-with-the-pill) ships a full body;
// the other seven are metadata-only (title + summary) and the article page
// renders a "coming soon" state until they're written — see TutorialPage.jsx.
//
// tier + minutes must stay honest against supabase/functions/chat/tier.ts
// (FREE_DAILY_LIMIT = 20, PRO_ONLY_TOOLS) and src/content/pricing.js: the
// pill's write actions (move/update/complete/reorganize) are Pro-only,
// create-type actions and chat Q&A are Free. The placeholder text and the
// comma/newline heuristic quoted in the pill tutorial must match
// src/components/board/QuickAddBar.jsx exactly.

export const TUTORIAL_TOPICS = [
  { id: 'ai', label: 'The AI' },
  { id: 'team', label: 'Working together' },
  { id: 'around', label: 'Getting around' },
]

export const TUTORIALS = [
  {
    slug: 'list-to-cards-with-the-pill',
    title: 'Turn a list into cards with the pill',
    summary: "Paste notes, a comma list, or one sentence. Cards land on the board you're looking at.",
    topic: 'ai',
    tier: 'free',
    minutes: 4,
    next: ['move-update-complete-with-the-pill', 'ask-your-boards-in-chat'],
    body: [
      {
        type: 'paragraph',
        text: 'Every board in Kolumn has a pill at the bottom. It looks like a text field. It is the fastest way to get things onto the board, because it accepts whatever you already have: a bulleted list from a doc, a sentence you’d say out loud, a pasted thread.',
      },
      {
        type: 'paragraph',
        text: 'This tutorial makes cards three ways. By the end you’ll know which one the pill will pick before you press Enter.',
      },
      { type: 'heading', level: 2, text: 'Step 1 — Paste a list, one item per line' },
      {
        type: 'paragraph',
        text: 'Open any board. Click the pill (it reads “Type a task or paste notes...”) and paste this:',
      },
      { type: 'code', text: 'Book the venue\nSend the invite list to Priya\nDraft the agenda' },
      {
        type: 'paragraph',
        text: 'Press Enter. Three cards appear in the first column, one per line, in the order you pasted them.',
      },
      {
        type: 'paragraph',
        text: 'Nothing was sent to the AI. When the text contains line breaks, the pill splits on them and creates a card per line straight away. It’s instant and it doesn’t count against your daily AI messages.',
      },
      { type: 'heading', level: 2, text: 'Step 2 — Or a comma list' },
      { type: 'paragraph', text: 'Type this on one line:' },
      { type: 'code', text: 'Order lanyards, confirm the caterer, print name badges' },
      {
        type: 'paragraph',
        text: 'Enter. Same result: three cards. Commas work like line breaks, with one exception covered in the next step.',
      },
      { type: 'heading', level: 2, text: 'Step 3 — Or just say what you want' },
      { type: 'paragraph', text: 'Now type a sentence:' },
      { type: 'code', text: 'Add a card to follow up with the venue about parking, due Friday, high priority' },
      {
        type: 'paragraph',
        text: 'This one goes to the AI. The pill notices the text starts like an instruction (“Add…”, “Create…”, “I need…”) rather than a list, so it stops splitting on commas and hands the whole sentence over. A moment later one card arrives with the title, the due date, and the priority already set.',
      },
      {
        type: 'paragraph',
        text: 'The AI only ever works on the board you’re looking at. It can’t create cards on another board from here.',
      },
      { type: 'heading', level: 2, text: 'What the pill decides, and when' },
      {
        type: 'list',
        items: [
          'Has line breaks → one card per line. No AI.',
          'Has commas and reads like a list → one card per item. No AI.',
          'Has commas but starts like an instruction → the AI reads the whole thing.',
          'Anything else → the AI reads it.',
        ],
      },
      {
        type: 'paragraph',
        text: 'If a fast-path card lands with the wrong title, open it and fix it. If the AI got something wrong, type a correction into the pill (“rename the parking card to ‘Confirm parking with venue’”) — on Pro, the pill can edit cards as well as create them. That’s the next tutorial.',
      },
      { type: 'heading', level: 2, text: 'Limits worth knowing' },
      {
        type: 'paragraph',
        text: 'On the free plan the pill can create cards and the AI answers up to 20 messages a day. The list-splitting paths don’t use a message. Moving, updating, and completing cards through the pill is a Pro feature.',
      },
    ],
  },
  {
    slug: 'move-update-complete-with-the-pill',
    title: 'Move, update, and complete cards by typing',
    summary: 'Tell the pill what changed. It edits the cards on this board instead of creating new ones.',
    topic: 'ai',
    tier: 'pro',
    minutes: 5,
    next: ['ask-your-boards-in-chat', 'list-to-cards-with-the-pill'],
    body: null,
  },
  {
    slug: 'ask-your-boards-in-chat',
    title: 'Ask your boards a question',
    summary: "Open Chat, ask what's overdue or what a board is about, get an answer. Nothing gets changed.",
    topic: 'ai',
    tier: 'free',
    minutes: 3,
    next: ['list-to-cards-with-the-pill', 'set-up-a-workspace'],
    body: null,
  },
  {
    slug: 'set-up-a-workspace',
    title: 'Set up a workspace and invite your team',
    summary: "Create a workspace, send invitations, and watch edits show up on everyone's screen as they happen.",
    topic: 'team',
    tier: 'free',
    minutes: 6,
    next: ['share-one-board', 'search-and-shortcuts'],
    body: null,
  },
  {
    slug: 'share-one-board',
    title: 'Share a single board',
    summary: 'Give someone access to one board without adding them to a workspace.',
    topic: 'team',
    tier: 'free',
    minutes: 3,
    next: ['set-up-a-workspace', 'search-and-shortcuts'],
    body: null,
  },
  {
    slug: 'start-from-a-template',
    title: 'Start from a template',
    summary: "Reuse a board or card layout you've already got right, and revisit the getting-started board.",
    topic: 'around',
    tier: 'free',
    minutes: 4,
    next: ['search-and-shortcuts', 'export-theme-and-motion'],
    body: null,
  },
  {
    slug: 'search-and-shortcuts',
    title: 'Find anything with ⌘K',
    summary: "Search cards across boards, open them without the mouse, and the shortcuts worth memorising.",
    topic: 'around',
    tier: 'free',
    minutes: 3,
    next: ['start-from-a-template', 'export-theme-and-motion'],
    body: null,
  },
  {
    slug: 'export-theme-and-motion',
    title: 'Export your data, switch themes, reduce motion',
    summary: 'A tour of Settings: download everything you own, pick light/dark/system, turn animation down.',
    topic: 'around',
    tier: 'free',
    minutes: 4,
    next: ['start-from-a-template', 'search-and-shortcuts'],
    body: null,
  },
]

export function getTutorial(slug) {
  return TUTORIALS.find((t) => t.slug === slug) || null
}

export function tutorialsByTopic(topicId) {
  return TUTORIALS.filter((t) => t.topic === topicId)
}

export function relatedTutorials(tutorial) {
  return (tutorial.next || []).map((slug) => getTutorial(slug)).filter(Boolean)
}
