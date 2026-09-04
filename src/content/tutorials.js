// Content for /tutorials (hub) and /tutorials/<slug> (article). Titles,
// summaries, and ordering live here; the article *body* lives as markdown
// under src/content/articles/tutorials/<slug>.md, loaded at build time by
// src/lib/content.js (getTutorialBody) and attached below. Rendered via
// react-markdown + remark-gfm in TutorialPage.jsx, styled to match
// src/components/marketing/Prose.jsx's type scale.
//
// Only the pill tutorial (list-to-cards-with-the-pill) ships a full body;
// the other seven are metadata-only (title + summary) and the article page
// renders a "coming soon" state until they're written — see TutorialPage.jsx.
// A `minutes` (read time) is fabricated signal on a page with no content, so
// only entries with a real `body` carry one; body-less entries omit it and
// TutorialCard.jsx / TutorialPage.jsx render without it. Writing a new
// tutorial is a two-file change: this entry (title + summary + minutes) and
// the markdown file — see .claude/skills/marketing-page/SKILL.md.
//
// tier + minutes must stay honest against supabase/functions/chat/tier.ts
// (FREE_DAILY_LIMIT = 20, PRO_ONLY_TOOLS) and src/content/pricing.js: the
// pill's write actions (move/update/complete/reorganize) are Pro-only,
// create-type actions and chat Q&A are Free. The placeholder text and the
// comma/newline heuristic quoted in the pill tutorial must match
// src/components/board/QuickAddBar.jsx exactly.

import { getTutorialBody } from '../lib/content'

export const TUTORIAL_TOPICS = [
  { id: 'ai', label: 'The AI' },
  { id: 'team', label: 'Working together' },
  { id: 'around', label: 'Getting around' },
]

const RAW_TUTORIALS = [
  {
    slug: 'list-to-cards-with-the-pill',
    title: 'Turn a list into cards with the pill',
    summary: "Paste notes, a comma list, or one sentence. Cards land on the board you're looking at.",
    topic: 'ai',
    tier: 'free',
    minutes: 4,
    next: ['move-update-complete-with-the-pill', 'ask-your-boards-in-chat'],
  },
  {
    slug: 'move-update-complete-with-the-pill',
    title: 'Move, update, and complete cards by typing',
    summary: 'Tell the pill what changed. It edits the cards on this board instead of creating new ones.',
    topic: 'ai',
    tier: 'pro',
    next: ['ask-your-boards-in-chat', 'list-to-cards-with-the-pill'],
  },
  {
    slug: 'ask-your-boards-in-chat',
    title: 'Ask your boards a question',
    summary: "Open Chat, ask what's overdue or what a board is about, get an answer. Nothing gets changed.",
    topic: 'ai',
    tier: 'free',
    next: ['list-to-cards-with-the-pill', 'set-up-a-workspace'],
  },
  {
    slug: 'set-up-a-workspace',
    title: 'Set up a workspace and invite your team',
    summary: "Create a workspace, send invitations, and watch edits show up on everyone's screen as they happen.",
    topic: 'team',
    tier: 'free',
    next: ['share-one-board', 'search-and-shortcuts'],
  },
  {
    slug: 'share-one-board',
    title: 'Share a single board',
    summary: 'Give someone access to one board without adding them to a workspace.',
    topic: 'team',
    tier: 'free',
    next: ['set-up-a-workspace', 'search-and-shortcuts'],
  },
  {
    slug: 'start-from-a-template',
    title: 'Start from a template',
    summary: "Reuse a board or card layout you've already got right, and revisit the getting-started board.",
    topic: 'around',
    tier: 'free',
    next: ['search-and-shortcuts', 'export-theme-and-motion'],
  },
  {
    slug: 'search-and-shortcuts',
    title: 'Find anything with ⌘K',
    summary: "Search cards across boards, open them without the mouse, and the shortcuts worth memorising.",
    topic: 'around',
    tier: 'free',
    next: ['start-from-a-template', 'export-theme-and-motion'],
  },
  {
    slug: 'export-theme-and-motion',
    title: 'Export your data, switch themes, reduce motion',
    summary: 'A tour of Settings: download everything you own, pick light/dark/system, turn animation down.',
    topic: 'around',
    tier: 'free',
    next: ['start-from-a-template', 'search-and-shortcuts'],
  },
]

// Attaches each tutorial's markdown body (or `null`) by slug — see the
// file header. Every consumer (getTutorial, TUTORIALS, the route registry)
// reads this derived export, never RAW_TUTORIALS.
export const TUTORIALS = RAW_TUTORIALS.map((tutorial) => ({
  ...tutorial,
  body: getTutorialBody(tutorial.slug),
}))

export function getTutorial(slug) {
  return TUTORIALS.find((t) => t.slug === slug) || null
}

export function tutorialsByTopic(topicId) {
  return TUTORIALS.filter((t) => t.topic === topicId)
}

export function relatedTutorials(tutorial) {
  return (tutorial.next || []).map((slug) => getTutorial(slug)).filter(Boolean)
}
