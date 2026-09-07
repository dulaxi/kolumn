// Six concrete answers to "is this for me?" for the landing page, each with
// a small board behind it. The strip of labels reads as one sentence; the
// board underneath fills in with that use case's cards when you hover a
// label (and cycles on its own until you do). See
// src/components/marketing/UseCaseShowcase.jsx.
//
// Rules for editing this file:
//
// 1. Every `to` must be a real route in src/content/marketing-routes.js.
//    LandingPageChrome.test.jsx resolves each one and fails on a dead link.
//
// 2. Never a real `due_date` — use `dueLabel` instead, and keep it evergreen
//    ("Fri", "Next Tue"), never an absolute date. Every date helper in
//    src/utils/dateUtils.js is relative to now, so a hardcoded `due_date`
//    renders copper and "overdue" a few months after it ships, and one
//    computed at render time differs between the build-time prerender and
//    the browser — a hydration mismatch. `dueLabel` maps to CardVisual's
//    `dueDateLabel`, which draws the chip from a literal string with the
//    no-urgency styling. UseCaseShowcase.test.jsx fails on any `due_date`.
//
// 3. Descriptions are line-clamped to two lines by CardVisual. Keep them to
//    one short line: they add height, and BOARD_MIN_HEIGHT in
//    UseCaseShowcase.jsx is measured against the tallest column.
//
// 4. Column names are per use case, because a wedding board does not have a
//    column called "Doing". But the FIRST entry deliberately keeps the plain
//    To do / Doing / Done: it is the state that gets prerendered, the state
//    a visitor sees before anything moves, and the exact three names the
//    hero's sub-line has just promised. Teach the pattern once with the
//    generic names, then show it bending to fit. Keep three columns
//    everywhere so the shape stays recognisable as it changes.
//
// Card fields are the DB's (snake_case), because these render through the
// app's real CardVisual, not a marketing lookalike.

function card(id, title, extra = {}) {
  return { id, title, description: '', completed: false, checklist: null, priority: null, ...extra }
}

export const USE_CASES = [
  {
    label: 'Moving house',
    to: '/templates/household-chores',
    columns: [
      {
        title: 'To do',
        cards: [
          card('mh1', 'Book the removal van', { icon: 'truck', priority: 'high', dueLabel: 'Fri', description: 'Two-bed, third floor, no lift.', labels: [{ text: 'Logistics', color: 'blue' }] }),
          card('mh2', 'Cancel the broadband', { icon: 'wifi-slash' }),
        ],
      },
      {
        title: 'Doing',
        cards: [
          card('mh3', 'Clear out the loft', { icon: 'package', checklist: [{ done: true }, { done: true }, { done: false }, { done: false }, { done: false }] }),
        ],
      },
      {
        title: 'Done',
        cards: [
          card('mh4', 'Hand in notice', { icon: 'envelope', completed: true, labels: [{ text: 'Admin', color: 'gray' }] }),
        ],
      },
    ],
  },
  {
    label: 'A dissertation',
    to: '/templates/study-plan',
    columns: [
      {
        title: 'Reading',
        cards: [
          card('ds1', 'Read the Kaplan paper', { icon: 'file-text', labels: [{ text: 'Sources', color: 'blue' }] }),
          card('ds2', 'Rebuild the bibliography', { icon: 'book-open' }),
        ],
      },
      {
        title: 'Drafting',
        cards: [
          card('ds3', 'Chapter 3', { icon: 'notebook', priority: 'high', dueLabel: 'Next Tue', description: 'Methodology, 4,000 words.', labels: [{ text: 'Writing', color: 'purple' }], checklist: [{ done: true }, { done: false }, { done: false }, { done: false }] }),
        ],
      },
      {
        title: 'Submitted',
        cards: [
          card('ds4', 'Ethics approval', { icon: 'check-circle', completed: true }),
        ],
      },
    ],
  },
  {
    label: 'Client work',
    to: '/templates/client-projects',
    columns: [
      {
        title: 'To do',
        cards: [
          card('cw1', 'Invoice Acme for March', { icon: 'receipt', priority: 'high', dueLabel: 'Mon', labels: [{ text: 'Billing', color: 'green' }] }),
          card('cw2', 'Second round of copy', { icon: 'pen-nib' }),
        ],
      },
      {
        title: 'In progress',
        cards: [
          card('cw3', 'Homepage revisions', { icon: 'browser', description: "Sarah's notes from the Tuesday call.", assignee_name: 'Rhea', labels: [{ text: 'Design', color: 'pink' }] }),
        ],
      },
      {
        title: 'Delivered',
        cards: [
          card('cw4', 'Kickoff call', { icon: 'phone-call', completed: true }),
        ],
      },
    ],
  },
  {
    label: 'A wedding',
    to: '/templates/event-planning',
    columns: [
      {
        title: 'To book',
        cards: [
          card('wd1', 'Cake tasting', { icon: 'cake', description: 'Three bakeries shortlisted.', labels: [{ text: 'Catering', color: 'pink' }] }),
          card('wd2', 'Final suit fitting', { icon: 't-shirt' }),
        ],
      },
      {
        title: 'In progress',
        cards: [
          card('wd3', 'Send the invitations', { icon: 'envelope', priority: 'high', dueLabel: 'Fri', checklist: [{ done: true }, { done: true }, { done: true }, { done: false }] }),
        ],
      },
      {
        title: 'Confirmed',
        cards: [
          card('wd4', 'Book the venue', { icon: 'map-pin', completed: true, labels: [{ text: 'Paid', color: 'green' }] }),
        ],
      },
    ],
  },
  {
    label: 'This sprint',
    to: '/templates/sprint-board',
    columns: [
      {
        title: 'Backlog',
        cards: [
          card('sp1', 'Fix the login bug', { icon: 'bug', priority: 'high', dueLabel: 'Thu', description: 'Rate limiter rejects valid retries.', labels: [{ text: 'Backend', color: 'red' }] }),
          card('sp2', 'Tighten the rate limiter', { icon: 'gauge' }),
        ],
      },
      {
        title: 'In progress',
        cards: [
          card('sp3', 'Search results ranking', { icon: 'magnifying-glass', assignee_name: 'Theo', labels: [{ text: 'Backend', color: 'red' }] }),
        ],
      },
      {
        title: 'Shipped',
        cards: [
          card('sp4', 'Release 2.4', { icon: 'rocket', completed: true }),
        ],
      },
    ],
  },
  {
    label: 'Next quarter',
    to: '/templates/product-roadmap',
    columns: [
      {
        title: 'Proposed',
        cards: [
          card('nq1', 'Q1 hiring plan', { icon: 'users', description: 'Two engineers, one designer.', labels: [{ text: 'Planning', color: 'yellow' }] }),
          card('nq2', 'Revisit pricing', { icon: 'tag', priority: 'high' }),
        ],
      },
      {
        title: 'Committed',
        cards: [
          card('nq3', 'Board deck', { icon: 'chart-line', dueLabel: 'Thu', checklist: [{ done: true }, { done: false }, { done: false }] }),
        ],
      },
      {
        title: 'Done',
        cards: [
          card('nq4', 'Close out Q4', { icon: 'check-circle', completed: true }),
        ],
      },
    ],
  },
]
