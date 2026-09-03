// Copy source: docs/superpowers/specs/marketing/solutions.md § "healthcare".
// Schema: solution-page.md §4.
export default {
  slug: 'healthcare',
  name: 'Healthcare',
  icon: 'FirstAid',
  group: 'work',
  blurb: 'Credentialing, equipment, onboarding and audit prep on a board the whole practice can see.',
  seo: {
    title: 'Kolumn for healthcare teams — a kanban for clinic ops',
    description:
      'Operational work for clinics and practices on one realtime board: checklists on cards, templates for recurring audits, members-only access. Free to start; Pro is $8/month.',
  },
  hero: {
    eyebrow: 'Kolumn for healthcare teams',
    h1: 'Clinic operations, one board at a time',
    subhead: `Credentialing, equipment service, staff onboarding, the audit prep nobody volunteered for. Kolumn keeps operational work on a kanban the whole team can see, and the AI keeps it current. Clinical records stay in your clinical system.`,
  },
  testimonials: [],
  pains: [
    {
      icon: 'Stack',
      title: 'Operational work falls between systems',
      body: 'The EHR holds patients. Practice management holds billing. The autoclave service visit is on a whiteboard.',
    },
    {
      icon: 'ChatCircleDots',
      title: 'Every handoff is a message',
      body: `Shift changes pass work along by text. What wasn't mentioned wasn't done.`,
    },
    {
      icon: 'UserPlus',
      title: 'New staff need the board on day one',
      body: 'Onboarding a locum to a heavy tool takes longer than their contract.',
    },
  ],
  helpIntro: 'Recurring, checklist-shaped work is what a kanban is for.',
  helps: [
    {
      tab: 'Checklists',
      icon: 'CheckSquare',
      kind: 'pill',
      prompt: `add a card for the new locum's credentialing packet with a checklist: licence copy, DEA, malpractice certificate, references`,
      title: 'Checklists that live on the card',
      body: 'Say the steps; they become a checklist on the card. Progress shows on the board without opening anything.',
      result: [{ title: `Credentialing packet — new locum`, checklist: { done: 0, total: 4 } }],
    },
    {
      tab: 'Shifts',
      icon: 'ArrowsClockwise',
      kind: 'info',
      title: 'Realtime for shift changes',
      body: `A card moved at 7am is moved on everyone's screen at 7am. The handoff is the board, not a text.`,
    },
    {
      tab: 'Audits',
      icon: 'Copy',
      kind: 'info',
      pro: true,
      title: 'Templates for recurring work',
      body: 'Save the monthly audit board as a template. Duplicate it on the first of the month; assign in the pill.',
    },
  ],
  board: {
    name: 'Practice ops — March',
    columns: [
      {
        title: 'Requests',
        cards: [
          { icon: 'UserPlus', title: 'Front-desk onboarding checklist', checklist: { done: 0, total: 6 } },
          { icon: 'Thermometer', title: 'Vaccine fridge log audit', priority: 'high', due: 'fri' },
        ],
      },
      {
        title: 'In progress',
        cards: [
          { icon: 'IdentificationCard', title: 'Credentialing packet — new locum', checklist: { done: 2, total: 4 }, assignee: 'Rosa' },
        ],
      },
      {
        title: 'Blocked',
        cards: [{ icon: 'Wrench', title: 'Autoclave service visit', labels: ['equipment'], due: '+3d' }],
      },
      { title: 'Done', cards: [] },
    ],
  },
  faq: [
    {
      q: 'Can we put patient information on cards?',
      a: 'Kolumn is for operational work, not clinical records. Keep patient data in your clinical system.',
    },
  ],
  cta: { heading: 'Give the practice one board for the month.' },
}
