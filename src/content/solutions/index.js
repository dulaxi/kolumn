// Ordered registry for /solutions and /solutions/<slug>. Drives the hub tile
// grid, the SolutionPage renderer, and (per solution-page.md §4) will drive
// the prerender route list + sitemap once these pages are wired into
// marketing-routes.js. solutions.md §3 lists the order below.
import startups from './startups'
import smallBusiness from './small-business'
import nonprofits from './nonprofits'
import students from './students'
import legal from './legal'
import healthcare from './healthcare'
import customerSupport from './customer-support'
import engineering from './engineering'

export const SOLUTION_SLUGS = [
  'startups',
  'small-business',
  'nonprofits',
  'students',
  'legal',
  'healthcare',
  'customer-support',
  'engineering',
]

// Slug-keyed registry — the primary lookup used by SolutionPage.
export const SOLUTIONS = {
  startups,
  'small-business': smallBusiness,
  nonprofits,
  students,
  legal,
  healthcare,
  'customer-support': customerSupport,
  engineering,
}

// Ordered list form, for the hub grid and any "map over every vertical" use.
export const SOLUTIONS_LIST = SOLUTION_SLUGS.map((slug) => SOLUTIONS[slug])

// Hub grouping — solutions.md §3.2 ("BY TEAM" / "BY WORK").
export const GROUPS = [
  { id: 'team', caption: 'BY TEAM', title: 'Teams', slugs: ['startups', 'small-business', 'nonprofits', 'students'] },
  { id: 'work', caption: 'BY WORK', title: 'Work', slugs: ['legal', 'healthcare', 'customer-support', 'engineering'] },
]

// solutions.md §3.3 — "What every board comes with" hub section.
export const PIECES = [
  {
    icon: 'Lightning',
    title: 'The pill',
    body: 'Type what you want on any board. The AI creates, moves, updates and completes cards. Lists split into cards instantly, no AI needed.',
  },
  {
    icon: 'ChatsCircle',
    title: 'Chat',
    body: 'Ask questions about your boards and get summaries. It reads; it does not edit.',
  },
  {
    icon: 'CubeFocus',
    title: 'Workspaces',
    body: 'Team containers with members and invitations. Personal boards can be shared one at a time.',
  },
  {
    icon: 'ArrowsClockwise',
    title: 'Realtime',
    body: `Every member sees the same board. Moves land on everyone's screen as they happen.`,
  },
  {
    icon: 'Copy',
    title: 'Templates',
    body: 'Board and card templates, plus a getting-started board on your first sign-in.',
  },
  {
    icon: 'LockKey',
    title: 'Members-only access',
    body: `Row-level security on every table, export and account deletion in Settings, and we don't train on your content.`,
  },
]
