// Copy source: docs/superpowers/specs/marketing/solutions.md § "students".
// Schema: solution-page.md §4.
import { PRICING } from '../pricing'

export default {
  slug: 'students',
  name: 'Students & educators',
  icon: 'GraduationCap',
  group: 'team',
  blurb: 'Paste the syllabus, get the semester as cards. Share a board with your group; free to start.',
  seo: {
    title: 'Kolumn for students and educators — a free kanban',
    description:
      `Paste a syllabus and get every assignment as a card with its due date. Share a board with your group; educators can template a board per course.`,
  },
  hero: {
    eyebrow: 'Kolumn for students and educators',
    h1: 'Assignments, group projects, one board',
    subhead: 'Kolumn is free to start and takes a minute to learn. Paste the syllabus and the semester becomes cards. Share a board with your group and watch it update while they work.',
  },
  testimonials: [],
  pains: [
    {
      icon: 'FilePdf',
      title: 'The syllabus is a PDF and the deadlines are in your head',
      body: `Every course has its own schedule in its own format. Nobody merges them until midterms.`,
    },
    {
      icon: 'Users',
      title: 'Group projects with no owner',
      body: `Four people, one doc, and a chat where "who's doing the intro?" gets asked three times.`,
    },
    {
      icon: 'Buildings',
      title: 'Project tools designed for offices',
      body: 'Sprints, story points, a billing page. Students need a list with dates.',
    },
  ],
  helpIntro: 'For students, for group work, and for the person running the course.',
  helps: [
    {
      tab: 'Syllabus',
      icon: 'Notepad',
      kind: 'pill',
      prompt: 'paste the schedule section — make a card per assignment with its due date',
      title: 'Syllabus in, semester out',
      body: 'Paste the schedule into the pill. Each reading response, lab and exam becomes a card with its date. Do it for every course; search (⌘K) finds anything.',
      result: [
        { title: 'Reading response 3 — ch. 5', due: 'thu' },
        { title: 'Midterm study plan', priority: 'medium' },
        { title: 'Lab report — data section' },
      ],
    },
    {
      tab: 'Group',
      icon: 'UsersThree',
      kind: 'pill',
      pro: true,
      prompt: 'split the lit review into four cards, one per source, and assign them round-robin',
      title: 'Split the work in one line',
      body: `Share the board with the group, then divide the work by sentence. Everyone sees their card; nobody asks who has the intro.`,
      result: [
        { title: 'Lit review — source 1', assignee: 'Maya' },
        { title: 'Lit review — source 2' },
      ],
    },
    {
      tab: 'Course',
      icon: 'Copy',
      kind: 'info',
      title: 'For educators: a template per course',
      body: 'Build the course board once, save it as a template, and duplicate it for each section. Students share boards per group; you keep the master.',
    },
  ],
  board: {
    name: 'PSYC 201 — Fall',
    columns: [
      {
        title: 'Upcoming',
        cards: [{ icon: 'Brain', title: 'Midterm study plan', priority: 'medium', due: '+9d' }],
      },
      {
        title: 'This week',
        cards: [
          { icon: 'BookOpen', title: 'Reading response 3 — ch. 5', due: 'thu', labels: [{ text: 'reading', color: 'blue' }] },
          { icon: 'Presentation', title: 'Group presentation slides', checklist: { done: 1, total: 4 }, assignee: 'Maya' },
        ],
      },
      {
        title: 'Submitted',
        cards: [{ icon: 'Flask', title: 'Lab report — data section', labels: [{ text: 'lab', color: 'green' }], priority: 'low' }],
      },
      { title: 'Graded', cards: [] },
    ],
  },
  faq: [
    {
      q: 'Is there a student plan?',
      a: `Free is the student plan: boards, sharing and 20 AI messages a day. Pro is $${PRICING.limits.proMonthlyUsd}/month if you want the AI to move and assign cards for you.`,
    },
  ],
  cta: { heading: 'Put the semester on a board before week two.' },
}
