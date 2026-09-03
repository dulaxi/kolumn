// Content for the /templates gallery and /templates/<slug> detail pages.
// Structured as plain data (see src/content/pricing.js for the pattern) so
// the marketing pages and, eventually, the onboarding "Use template" flow
// (src/lib/seedStarterBoard.js) share one source of truth. The `columns`
// shape here is exactly what seedStarterBoard(userId, template) consumes —
// { title, cards: [{ title, icon, priority, description?, checklist? }] } —
// so wiring "Use template" later needs no new seeding code.
//
// Card `icon` values are kebab-case strings resolved by
// src/components/board/DynamicIcon.jsx (the same convention as real card
// data). Template `icon` values are Phosphor component names resolved in
// the page components (same pattern as `SLIDES` on the landing page).
//
// Per docs/superpowers/specs/marketing/templates.md §4: templates 4
// (sprint-board), 5 (bug-triage) and 11 (product-roadmap) mirror
// STARTER_BOARDS' 'engineering/sprint', 'engineering/bug-triage' and
// 'product/roadmap' entries; 1 (weekly-planner) and 9 (study-plan) are
// near-copies of 'other/review' and 'student/coursework'. Reconciling the
// two files into one is flagged as follow-up work in the spec, not part of
// this page build.

export const TEMPLATE_AREAS = [
  'Engineering',
  'Marketing',
  'Product',
  'Operations',
  'Study',
  'Life',
]

const FREE_PRO_NOTE =
  'Creating cards from the pill works on every plan. Moving, updating, completing, and reorganizing cards needs Pro.'

export const TEMPLATE_FAQ = [
  {
    q: 'Is a template a normal board?',
    a: "Yes. It's created as a board you own, with the columns and cards listed on its page. Rename columns, delete the starter cards, share it — nothing about it is locked.",
  },
  {
    q: "Can I change a template after I've used it?",
    a: 'The board and the template are not linked. Changing one never touches the other, and you can use the same template as many times as you like.',
  },
  {
    q: 'Do templates cost anything?',
    a: 'No. Templates are on every tier, including Free. The AI actions inside the board follow your plan’s limits (20 messages a day on Free).',
  },
]

export const TEMPLATES = [
  {
    slug: 'weekly-planner',
    name: 'Weekly planner',
    description: 'Everything on your mind, sorted into this week, next week and done.',
    icon: 'ListChecks',
    use: 'personal',
    area: 'Life',
    audience: 'Anyone who wants one place for tasks instead of a notes app, a reminders app, and a memory.',
    prompts: ['add a card for "renew the car registration"', 'add three cards: call the plumber, return the package, book haircut'],
    proNote: FREE_PRO_NOTE,
    columnNotes: [
      'Catch everything here first, one card each.',
      'What you’re actually committing to this week.',
      'Real, but not urgent yet.',
      'Finished — kept for the satisfaction of it.',
    ],
    columns: [
      {
        title: 'Inbox',
        cards: [
          { title: 'Everything on your mind — one card each', icon: 'tray', priority: 'medium' },
        ],
      },
      {
        title: 'This week',
        cards: [
          { title: 'The one thing that matters most', icon: 'star', priority: 'high' },
          { title: 'Book the dentist', icon: 'calendar-blank', priority: 'low' },
        ],
      },
      { title: 'Next week', cards: [] },
      { title: 'Done', cards: [] },
    ],
  },
  {
    slug: 'content-calendar',
    name: 'Content calendar',
    description: 'Posts and articles from idea to published, one card each.',
    icon: 'CalendarBlank',
    use: 'team',
    area: 'Marketing',
    audience: 'A marketing or content team tracking posts and articles across the same stages every time.',
    prompts: ['add a card for next week’s newsletter draft', 'add a card for "customer story: Acme" with a due date of Friday'],
    proNote: FREE_PRO_NOTE,
    columnNotes: [
      'Topics worth writing, not yet assigned.',
      'Being written.',
      'Being reviewed.',
      'Ready, waiting on a publish date.',
      'Live.',
    ],
    columns: [
      {
        title: 'Ideas',
        cards: [{ title: 'Brainstorm this month’s topics', icon: 'lightbulb', priority: 'medium' }],
      },
      {
        title: 'Drafting',
        cards: [
          {
            title: 'Launch announcement post',
            icon: 'note-pencil',
            priority: 'high',
            checklist: [
              { text: 'Outline', done: false },
              { text: 'Draft', done: false },
              { text: 'Images', done: false },
            ],
          },
        ],
      },
      { title: 'Editing', cards: [] },
      { title: 'Scheduled', cards: [] },
      {
        title: 'Published',
        cards: [{ title: 'Welcome post', icon: 'check-circle', priority: 'low' }],
      },
    ],
  },
  {
    slug: 'job-hunt',
    name: 'Job hunt',
    description: 'Track every application from "saw the posting" to "signed the offer."',
    icon: 'Briefcase',
    use: 'personal',
    area: 'Life',
    audience: 'Anyone job-hunting who is tired of losing track of which company is at which stage.',
    prompts: ['add a card for "Product designer at Acme" with a due date for the deadline', 'add a card to prep for the interview on Thursday'],
    proNote: FREE_PRO_NOTE,
    columnNotes: [
      'Roles worth applying to.',
      'Application sent, waiting to hear back.',
      'In the interview process.',
      'An offer is on the table.',
      'Declined, withdrawn, or accepted — either way, resolved.',
    ],
    columns: [
      {
        title: 'Saved',
        cards: [
          {
            title: 'Example: Product designer at Acme',
            icon: 'buildings',
            priority: 'medium',
            description: 'Link the posting, note the deadline, drop the JD in the description.',
          },
        ],
      },
      {
        title: 'Applied',
        cards: [
          {
            title: 'Tailor the résumé per role',
            icon: 'file-text',
            priority: 'high',
            checklist: [
              { text: 'Summary', done: false },
              { text: 'Top 3 wins', done: false },
              { text: 'Keywords', done: false },
            ],
          },
        ],
      },
      {
        title: 'Interviewing',
        cards: [{ title: 'Prep the three stories you’ll tell', icon: 'chat-circle-dots', priority: 'high' }],
      },
      { title: 'Offer', cards: [] },
      { title: 'Closed', cards: [] },
    ],
  },
  {
    slug: 'sprint-board',
    name: 'Sprint board',
    description: 'The classic engineering flow with a backlog that stays out of the way.',
    icon: 'Lightning',
    use: 'team',
    area: 'Engineering',
    audience: 'An engineering team running short sprints who wants a backlog that never becomes the whole board.',
    prompts: ['add a card for "fix the flaky auth test"', 'add three cards: write the migration, backfill the data, add the index'],
    proNote: FREE_PRO_NOTE,
    columnNotes: [
      'Not this sprint, but not lost either.',
      'Picked for this sprint, not started.',
      'Someone is on it right now.',
      'Waiting on a second pair of eyes.',
      'Shipped.',
    ],
    columns: [
      {
        title: 'Backlog',
        cards: [
          {
            title: 'Define the sprint goal',
            icon: 'target',
            priority: 'high',
            checklist: [
              { text: 'Write one sentence', done: false },
              { text: 'Share with the team', done: false },
            ],
          },
          { title: 'Groom the backlog', icon: 'list-checks', priority: 'medium' },
        ],
      },
      { title: 'To do', cards: [] },
      {
        title: 'In progress',
        cards: [{ title: 'Your first sprint task goes here', icon: 'circle-dashed', priority: 'medium' }],
      },
      { title: 'Review', cards: [] },
      { title: 'Done', cards: [] },
    ],
  },
  {
    slug: 'bug-triage',
    name: 'Bug triage',
    description: 'Reports come in, get a severity, get fixed. Nothing falls through.',
    icon: 'Bug',
    use: 'team',
    area: 'Engineering',
    audience: 'A team fielding bug reports from more than one channel who needs one queue, not three.',
    prompts: ['add a card for "checkout button unresponsive on Safari"', 'add a card to confirm the fix on staging'],
    proNote: FREE_PRO_NOTE,
    columnNotes: [
      'Just came in, not looked at yet.',
      'Severity assigned.',
      'Someone is actively fixing it.',
      'Fix is up, needs a check.',
      'Confirmed fixed.',
    ],
    columns: [
      {
        title: 'Reported',
        cards: [
          {
            title: 'Example: login button unresponsive',
            icon: 'bug',
            priority: 'high',
            description: 'Repro steps, expected vs actual, environment.',
          },
          {
            title: 'Set up severity labels',
            icon: 'tag',
            priority: 'medium',
            checklist: [{ text: 'critical / major / minor', done: false }],
          },
        ],
      },
      { title: 'Triaged', cards: [] },
      { title: 'Fixing', cards: [] },
      {
        title: 'Verifying',
        cards: [{ title: 'Confirm the fix on staging', icon: 'check-square', priority: 'medium' }],
      },
      { title: 'Resolved', cards: [] },
    ],
  },
  {
    slug: 'event-planning',
    name: 'Event planning',
    description: 'Venue, guests, vendors and the day-of run sheet on one board.',
    icon: 'Confetti',
    use: 'team',
    area: 'Operations',
    audience: 'Whoever is organizing an event with more than one moving part — venue, guests, vendors, and a schedule.',
    prompts: ['add a card for "confirm catering headcount"', 'add a card for the venue walkthrough with a due date'],
    proNote: FREE_PRO_NOTE,
    columnNotes: [
      'Date, budget, and rough shape.',
      'Locked in and paid for.',
      'Being worked, not yet locked.',
      'The run sheet for the day itself.',
      'Done, receipts filed.',
    ],
    columns: [
      {
        title: 'Ideas',
        cards: [{ title: 'Pick a date and a budget ceiling', icon: 'calendar-check', priority: 'high' }],
      },
      {
        title: 'Booked',
        cards: [{ title: 'Venue deposit paid', icon: 'buildings', priority: 'high' }],
      },
      {
        title: 'In progress',
        cards: [
          {
            title: 'Guest list',
            icon: 'users',
            priority: 'medium',
            checklist: [
              { text: 'Draft', done: false },
              { text: 'Send invites', done: false },
              { text: 'Chase RSVPs', done: false },
            ],
          },
        ],
      },
      {
        title: 'Day of',
        cards: [{ title: 'Run sheet, hour by hour', icon: 'clock', priority: 'high' }],
      },
      { title: 'Wrapped', cards: [] },
    ],
  },
  {
    slug: 'onboarding-checklist',
    name: 'Onboarding checklist',
    description: 'A new hire’s first month, laid out so nobody has to ask what’s next.',
    icon: 'UserPlus',
    use: 'team',
    area: 'Operations',
    audience: 'A manager or people-ops team who wants a repeatable first month instead of tribal knowledge.',
    prompts: ['add a card for "set up their email and calendar"', 'add a card for their first 1:1'],
    proNote: FREE_PRO_NOTE,
    columnNotes: [
      'What has to be ready before they show up.',
      'The first five days.',
      'The rest of the ramp.',
      'Fully onboarded.',
    ],
    columns: [
      {
        title: 'Before day one',
        cards: [
          {
            title: 'Laptop, accounts, calendar invites',
            icon: 'laptop',
            priority: 'high',
            checklist: [
              { text: 'Laptop shipped', done: false },
              { text: 'Email', done: false },
              { text: 'Slack', done: false },
              { text: 'Calendar', done: false },
            ],
          },
        ],
      },
      {
        title: 'Week one',
        cards: [{ title: 'Meet the team — one card per intro', icon: 'users', priority: 'medium' }],
      },
      {
        title: 'First month',
        cards: [{ title: 'Ship something small', icon: 'rocket-launch', priority: 'medium' }],
      },
      { title: 'Done', cards: [] },
    ],
  },
  {
    slug: 'grant-pipeline',
    name: 'Grant pipeline',
    description: 'Funders to research, applications in flight, reports due.',
    icon: 'Bank',
    use: 'team',
    area: 'Operations',
    audience: 'A nonprofit or grants team juggling several funders at once, each with its own deadlines.',
    prompts: ['add a card for a funder to research, with the deadline as the due date', 'add a card for the Q2 impact report'],
    proNote: FREE_PRO_NOTE,
    columnNotes: [
      'Funders worth applying to.',
      'Application being written.',
      'Sent, waiting to hear back.',
      'Funded.',
      'Reporting obligations after the award.',
    ],
    columns: [
      {
        title: 'Prospects',
        cards: [
          {
            title: 'Example: Community Foundation spring round',
            icon: 'bank',
            priority: 'medium',
            description: 'Deadline, amount, fit score, contact.',
          },
        ],
      },
      {
        title: 'Drafting',
        cards: [
          {
            title: 'Reusable org boilerplate',
            icon: 'file-text',
            priority: 'high',
            checklist: [
              { text: 'Mission', done: false },
              { text: 'Budget', done: false },
              { text: 'Board list', done: false },
            ],
          },
        ],
      },
      { title: 'Submitted', cards: [] },
      { title: 'Awarded', cards: [] },
      {
        title: 'Reporting',
        cards: [{ title: 'Q1 impact report', icon: 'chart-bar', priority: 'medium' }],
      },
    ],
  },
  {
    slug: 'study-plan',
    name: 'Study plan',
    description: 'Courses, readings and assignments with due dates that actually nag you.',
    icon: 'BookOpen',
    use: 'personal',
    area: 'Study',
    audience: 'A student juggling more than one class who wants due dates in one place instead of scattered across syllabi.',
    prompts: ['add a card for the reading due Friday', 'add a card for the essay draft with a due date'],
    proNote: FREE_PRO_NOTE,
    columnNotes: [
      'Every assignment lands here first.',
      'Being worked on.',
      'Turned in, waiting on a grade.',
      'Graded and done.',
    ],
    columns: [
      {
        title: 'This week',
        cards: [
          {
            title: 'Add each assignment as a card',
            icon: 'plus-circle',
            priority: 'medium',
            description: 'Set due dates — overdue work turns copper so nothing slips.',
          },
        ],
      },
      {
        title: 'In progress',
        cards: [{ title: 'Reading: chapters 3–4', icon: 'book-open', priority: 'medium' }],
      },
      {
        title: 'Submitted',
        cards: [{ title: 'Essay draft', icon: 'paper-plane-tilt', priority: 'low' }],
      },
      { title: 'Graded', cards: [] },
    ],
  },
  {
    slug: 'client-projects',
    name: 'Client projects',
    description: 'One column per stage of the engagement, from proposal to invoice.',
    icon: 'Handshake',
    use: 'team',
    area: 'Operations',
    audience: 'A freelancer or agency running several client engagements at different stages at once.',
    prompts: ['add a card for a new proposal, with the decision date as the due date', 'add a card to send the kickoff deposit invoice'],
    proNote: FREE_PRO_NOTE,
    columnNotes: [
      'Scoped, priced, waiting on a decision.',
      'Work underway.',
      'Blocked on something from the client.',
      'Delivered.',
      'Invoiced.',
    ],
    columns: [
      {
        title: 'Proposal',
        cards: [
          {
            title: 'Example: Northwind website refresh',
            icon: 'briefcase',
            priority: 'medium',
            description: 'Scope, price, decision date.',
          },
        ],
      },
      {
        title: 'Active',
        cards: [{ title: 'Weekly check-in notes', icon: 'chat-circle-dots', priority: 'medium' }],
      },
      {
        title: 'Waiting on client',
        cards: [{ title: 'Brand assets', icon: 'image', priority: 'low' }],
      },
      { title: 'Delivered', cards: [] },
      {
        title: 'Invoiced',
        cards: [{ title: 'Kickoff deposit', icon: 'receipt', priority: 'low' }],
      },
    ],
  },
  {
    slug: 'product-roadmap',
    name: 'Product roadmap',
    description: 'Now, next and later. The three columns that survive every reprioritisation.',
    icon: 'Compass',
    use: 'team',
    area: 'Product',
    audience: 'A product team that wants one shared view of priority without a roadmap tool nobody opens.',
    prompts: ['add a card for a launch candidate under Next', 'add a card for an idea to park under Later'],
    proNote: FREE_PRO_NOTE,
    columnNotes: [
      'Committed, being worked this quarter.',
      'The strongest candidates for after that.',
      'Ideas worth keeping, not yet promised.',
      'Live.',
    ],
    columns: [
      {
        title: 'Now',
        cards: [{ title: 'This quarter’s bet', icon: 'flag', priority: 'high' }],
      },
      {
        title: 'Next',
        cards: [{ title: 'Next release candidates', icon: 'stack', priority: 'medium' }],
      },
      {
        title: 'Later',
        cards: [{ title: 'Ideas parking lot', icon: 'lightbulb', priority: 'low' }],
      },
      { title: 'Shipped', cards: [] },
    ],
  },
  {
    slug: 'household-chores',
    name: 'Household chores',
    description: 'Split the house’s recurring jobs and see at a glance whose turn it is.',
    icon: 'House',
    use: 'personal',
    area: 'Life',
    audience: 'A household splitting recurring jobs who wants a shared list instead of a running argument.',
    prompts: ['add a card for taking the bins out on Tuesday', 'add a card for the grocery run'],
    proNote: FREE_PRO_NOTE,
    columnNotes: [
      'What needs doing this week.',
      'Someone has started it.',
      'Finished.',
      'Not urgent — whenever.',
    ],
    columns: [
      {
        title: 'This week',
        cards: [
          { title: 'Bins out — Tuesday', icon: 'trash', priority: 'medium' },
          {
            title: 'Groceries',
            icon: 'shopping-cart',
            priority: 'medium',
            checklist: [
              { text: 'Fruit', done: false },
              { text: 'Milk', done: false },
              { text: 'Coffee', done: false },
            ],
          },
        ],
      },
      {
        title: 'Doing',
        cards: [{ title: 'Fix the leaky tap', icon: 'wrench', priority: 'low' }],
      },
      { title: 'Done', cards: [] },
      {
        title: 'Someday',
        cards: [{ title: 'Sort the garage', icon: 'package', priority: 'low' }],
      },
    ],
  },
]

export function getTemplate(slug) {
  return TEMPLATES.find((t) => t.slug === slug) || null
}

export function relatedTemplates(template, count = 3) {
  if (!template) return []
  const sameArea = TEMPLATES.filter((t) => t.slug !== template.slug && t.area === template.area)
  if (sameArea.length >= count) return sameArea.slice(0, count)
  const sameUse = TEMPLATES.filter(
    (t) => t.slug !== template.slug && t.use === template.use && !sameArea.includes(t),
  )
  return [...sameArea, ...sameUse].slice(0, count)
}

export function templateCardCount(template) {
  return template.columns.reduce((sum, col) => sum + col.cards.length, 0)
}
