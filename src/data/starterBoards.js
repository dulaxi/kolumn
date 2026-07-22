// Starter-board templates behind the onboarding role step. Keyed
// `${role}/${starterId}` to match STARTER_PROMPTS. Instantiated by
// src/lib/seedStarterBoard.js. Card shape mirrors onboardingBoard.js.

export const STARTER_BOARDS = {
  'engineering/sprint': {
    name: 'Sprint board', icon: 'lightning',
    columns: [
      { title: 'Backlog', cards: [
        { title: 'Define the sprint goal', icon: 'target', priority: 'high',
          checklist: [{ text: 'Write one sentence', done: false }, { text: 'Share with the team', done: false }] },
        { title: 'Groom the backlog', icon: 'list-checks', priority: 'medium' },
      ]},
      { title: 'In progress', cards: [
        { title: 'Your first sprint task goes here', icon: 'circle-dashed', priority: 'medium' },
      ]},
      { title: 'Review', cards: [] },
      { title: 'Done', cards: [] },
    ],
  },
  'engineering/bug-triage': {
    name: 'Bug triage', icon: 'bug',
    columns: [
      { title: 'Reported', cards: [
        { title: 'Example: login button unresponsive', icon: 'bug', priority: 'high',
          description: 'Capture repro steps, expected vs actual, and environment.' },
        { title: 'Set up severity labels', icon: 'tag', priority: 'medium',
          checklist: [{ text: 'critical / major / minor', done: false }] },
      ]},
      { title: 'Triaged', cards: [] },
      { title: 'Fixing', cards: [] },
      { title: 'Resolved', cards: [] },
    ],
  },
  'engineering/roadmap': {
    name: 'Release roadmap', icon: 'rocket-launch',
    columns: [
      { title: 'Now', cards: [
        { title: 'Current release theme', icon: 'flag', priority: 'high' },
      ]},
      { title: 'Next', cards: [
        { title: 'Next release candidates', icon: 'stack', priority: 'medium' },
      ]},
      { title: 'Later', cards: [
        { title: 'Ideas parking lot', icon: 'lightbulb', priority: 'low' },
      ]},
      { title: 'Shipped', cards: [] },
    ],
  },
  'design/reviews': {
    name: 'Design reviews', icon: 'pen-nib',
    columns: [
      { title: 'Queued', cards: [
        { title: 'Add a design for review', icon: 'plus-circle', priority: 'medium',
          description: 'Link the file, name the reviewer, set a due date.' },
      ]},
      { title: 'In review', cards: [] },
      { title: 'Changes requested', cards: [] },
      { title: 'Approved', cards: [] },
    ],
  },
  'design/library': {
    name: 'Component library', icon: 'squares-four',
    columns: [
      { title: 'To spec', cards: [
        { title: 'Button', icon: 'cursor-click', priority: 'high',
          checklist: [{ text: 'Variants', done: false }, { text: 'States', done: false }, { text: 'Tokens', done: false }] },
        { title: 'Input', icon: 'textbox', priority: 'medium' },
      ]},
      { title: 'Building', cards: [] },
      { title: 'In review', cards: [] },
      { title: 'Shipped', cards: [] },
    ],
  },
  'design/research': {
    name: 'Research pipeline', icon: 'users',
    columns: [
      { title: 'Questions', cards: [
        { title: 'What do we need to learn?', icon: 'question', priority: 'high' },
      ]},
      { title: 'Recruiting', cards: [
        { title: 'Draft the screener', icon: 'funnel', priority: 'medium' },
      ]},
      { title: 'In session', cards: [] },
      { title: 'Synthesized', cards: [] },
    ],
  },
  'product/roadmap': {
    name: 'Product roadmap', icon: 'compass',
    columns: [
      { title: 'Now', cards: [
        { title: 'This quarter\'s bet', icon: 'flag', priority: 'high' },
      ]},
      { title: 'Next', cards: [] },
      { title: 'Later', cards: [
        { title: 'Ideas parking lot', icon: 'lightbulb', priority: 'low' },
      ]},
      { title: 'Shipped', cards: [] },
    ],
  },
  'product/backlog': {
    name: 'Feature backlog', icon: 'list-checks',
    columns: [
      { title: 'Inbox', cards: [
        { title: 'Capture every request here first', icon: 'tray', priority: 'medium',
          description: 'One card per request. Triage weekly into Prioritized.' },
      ]},
      { title: 'Prioritized', cards: [] },
      { title: 'In progress', cards: [] },
      { title: 'Done', cards: [] },
    ],
  },
  'product/launch': {
    name: 'Launch checklist', icon: 'check-square',
    columns: [
      { title: 'Pre-launch', cards: [
        { title: 'Write the announcement', icon: 'megaphone', priority: 'high',
          checklist: [{ text: 'Draft', done: false }, { text: 'Review', done: false }, { text: 'Schedule', done: false }] },
        { title: 'QA pass on the release', icon: 'magnifying-glass', priority: 'high' },
      ]},
      { title: 'Launch week', cards: [] },
      { title: 'Post-launch', cards: [
        { title: 'Collect first-week feedback', icon: 'chat-circle-dots', priority: 'medium' },
      ]},
      { title: 'Done', cards: [] },
    ],
  },
  'marketing/campaign': {
    name: 'Campaign tracker', icon: 'megaphone',
    columns: [
      { title: 'Ideas', cards: [
        { title: 'Campaign concept', icon: 'lightbulb', priority: 'medium',
          checklist: [{ text: 'Audience', done: false }, { text: 'Channel', done: false }, { text: 'Budget', done: false }] },
      ]},
      { title: 'Planning', cards: [] },
      { title: 'Live', cards: [] },
      { title: 'Wrapped', cards: [] },
    ],
  },
  'marketing/content': {
    name: 'Content calendar', icon: 'calendar-blank',
    columns: [
      { title: 'Ideas', cards: [
        { title: 'Brainstorm this month\'s topics', icon: 'lightbulb', priority: 'medium' },
      ]},
      { title: 'Drafting', cards: [] },
      { title: 'Editing', cards: [] },
      { title: 'Published', cards: [] },
    ],
  },
  'marketing/launch-comms': {
    name: 'Launch comms', icon: 'paper-plane-tilt',
    columns: [
      { title: 'Drafts', cards: [
        { title: 'Announcement email', icon: 'envelope', priority: 'high' },
        { title: 'Social posts', icon: 'megaphone', priority: 'medium' },
      ]},
      { title: 'Scheduled', cards: [] },
      { title: 'Sent', cards: [] },
      { title: 'Follow-up', cards: [] },
    ],
  },
  'operations/vendors': {
    name: 'Vendor pipeline', icon: 'handshake',
    columns: [
      { title: 'Prospects', cards: [
        { title: 'Add a vendor to evaluate', icon: 'plus-circle', priority: 'medium',
          checklist: [{ text: 'Pricing', done: false }, { text: 'References', done: false }, { text: 'Security review', done: false }] },
      ]},
      { title: 'In talks', cards: [] },
      { title: 'Contracting', cards: [] },
      { title: 'Active', cards: [] },
    ],
  },
  'operations/incidents': {
    name: 'Incident retro', icon: 'warning-circle',
    columns: [
      { title: 'Timeline', cards: [
        { title: 'Reconstruct what happened', icon: 'clock', priority: 'high' },
      ]},
      { title: 'What went well', cards: [] },
      { title: 'What hurt', cards: [] },
      { title: 'Action items', cards: [
        { title: 'Assign owners and due dates', icon: 'user-check', priority: 'high' },
      ]},
    ],
  },
  'operations/okrs': {
    name: 'Quarterly OKRs', icon: 'target',
    columns: [
      { title: 'Objectives', cards: [
        { title: 'Objective 1', icon: 'target', priority: 'high',
          checklist: [{ text: 'Key result 1', done: false }, { text: 'Key result 2', done: false }] },
      ]},
      { title: 'On track', cards: [] },
      { title: 'At risk', cards: [] },
      { title: 'Done', cards: [] },
    ],
  },
  'sales/pipeline': {
    name: 'Deal pipeline', icon: 'funnel',
    columns: [
      { title: 'Leads', cards: [
        { title: 'Example: Acme Corp', icon: 'buildings', priority: 'medium',
          description: 'Contact, deal size, next step — keep it on the card.' },
      ]},
      { title: 'Qualified', cards: [] },
      { title: 'Proposal', cards: [] },
      { title: 'Closed', cards: [] },
    ],
  },
  'sales/outreach': {
    name: 'Outreach queue', icon: 'paper-plane-tilt',
    columns: [
      { title: 'To contact', cards: [
        { title: 'Build this week\'s list', icon: 'list-plus', priority: 'high' },
      ]},
      { title: 'Contacted', cards: [] },
      { title: 'Replied', cards: [] },
      { title: 'Meeting booked', cards: [] },
    ],
  },
  'sales/discovery': {
    name: 'Discovery call prep', icon: 'magnifying-glass',
    columns: [
      { title: 'Research', cards: [
        { title: 'Company background', icon: 'buildings', priority: 'high',
          checklist: [{ text: 'Size + funding', done: false }, { text: 'Current tooling', done: false }] },
      ]},
      { title: 'Questions', cards: [
        { title: 'Top 5 discovery questions', icon: 'question', priority: 'high' },
      ]},
      { title: 'Call notes', cards: [] },
      { title: 'Next steps', cards: [] },
    ],
  },
  'founder/investors': {
    name: 'Investor pipeline', icon: 'bank',
    columns: [
      { title: 'Targets', cards: [
        { title: 'Build the target list', icon: 'list-plus', priority: 'high',
          checklist: [{ text: 'Stage fit', done: false }, { text: 'Check size', done: false }, { text: 'Warm paths', done: false }] },
      ]},
      { title: 'Intro made', cards: [] },
      { title: 'In diligence', cards: [] },
      { title: 'Committed', cards: [] },
    ],
  },
  'founder/hiring': {
    name: 'Hiring funnel', icon: 'user-plus',
    columns: [
      { title: 'Sourcing', cards: [
        { title: 'Write the job post', icon: 'note-pencil', priority: 'high' },
      ]},
      { title: 'Screening', cards: [] },
      { title: 'Interviewing', cards: [] },
      { title: 'Offer', cards: [] },
    ],
  },
  'founder/bets': {
    name: 'Strategic bets', icon: 'compass',
    columns: [
      { title: 'Ideas', cards: [
        { title: 'What could 10x the business?', icon: 'lightbulb', priority: 'medium' },
      ]},
      { title: 'Validating', cards: [] },
      { title: 'Betting', cards: [] },
      { title: 'Review', cards: [] },
    ],
  },
  'student/coursework': {
    name: 'Coursework', icon: 'books',
    columns: [
      { title: 'This week', cards: [
        { title: 'Add each assignment as a card', icon: 'plus-circle', priority: 'medium',
          description: 'Set due dates — overdue work turns copper so nothing slips.' },
      ]},
      { title: 'In progress', cards: [] },
      { title: 'Submitted', cards: [] },
      { title: 'Graded', cards: [] },
    ],
  },
  'student/thesis': {
    name: 'Thesis project', icon: 'graduation-cap',
    columns: [
      { title: 'Reading', cards: [
        { title: 'Literature review list', icon: 'book-open', priority: 'high' },
      ]},
      { title: 'Writing', cards: [
        { title: 'Chapter outline', icon: 'list-bullets', priority: 'high',
          checklist: [{ text: 'Intro', done: false }, { text: 'Method', done: false }, { text: 'Results', done: false }] },
      ]},
      { title: 'Review', cards: [] },
      { title: 'Done', cards: [] },
    ],
  },
  'student/reading': {
    name: 'Reading list', icon: 'book-open',
    columns: [
      { title: 'To read', cards: [
        { title: 'Add a book or paper', icon: 'plus-circle', priority: 'low' },
      ]},
      { title: 'Reading', cards: [] },
      { title: 'Notes', cards: [] },
      { title: 'Finished', cards: [] },
    ],
  },
  'other/todos': {
    name: 'Personal todos', icon: 'check-circle',
    columns: [
      { title: 'Today', cards: [
        { title: 'Your most important task', icon: 'star', priority: 'high' },
      ]},
      { title: 'This week', cards: [] },
      { title: 'Someday', cards: [] },
      { title: 'Done', cards: [] },
    ],
  },
  'other/reading': {
    name: 'Reading queue', icon: 'book-bookmark',
    columns: [
      { title: 'To read', cards: [
        { title: 'Add an article or book', icon: 'plus-circle', priority: 'low' },
      ]},
      { title: 'Reading', cards: [] },
      { title: 'Finished', cards: [] },
    ],
  },
  'other/review': {
    name: 'Weekly review', icon: 'list-bullets',
    columns: [
      { title: 'Inbox', cards: [
        { title: 'Everything on your mind — one card each', icon: 'tray', priority: 'medium' },
      ]},
      { title: 'This week', cards: [] },
      { title: 'Next week', cards: [] },
      { title: 'Done', cards: [] },
    ],
  },
}

export function getStarterBoard(role, starterId) {
  return STARTER_BOARDS[`${role}/${starterId}`] || null
}
