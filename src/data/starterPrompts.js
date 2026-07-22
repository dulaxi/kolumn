import {
  Lightning,
  Bug,
  RocketLaunch,
  PenNib,
  SquaresFour,
  Users,
  Compass,
  ListChecks,
  CheckSquare,
  Megaphone,
  CalendarBlank,
  PaperPlaneTilt,
  Handshake,
  WarningCircle,
  Target,
  Funnel,
  MagnifyingGlass,
  Bank,
  UserPlus,
  Books,
  GraduationCap,
  BookOpen,
  CheckCircle,
  BookBookmark,
  ListBullets,
} from '@phosphor-icons/react'

export const ROLES = [
  { id: 'engineering', label: 'Engineering' },
  { id: 'design', label: 'Design' },
  { id: 'product', label: 'Product management' },
  { id: 'marketing', label: 'Marketing' },
  { id: 'operations', label: 'Operations' },
  { id: 'sales', label: 'Sales' },
  { id: 'founder', label: 'Founder / leadership' },
  { id: 'student', label: 'Student' },
  { id: 'other', label: 'Something else' },
]

// Starter prompts per role. Each one becomes a clickable card under the
// role dropdown — selecting one routes to /dashboard with state so the
// dashboard knows what kind of board to seed first.
export const STARTER_PROMPTS = {
  engineering: [
    { id: 'sprint',       title: 'Plan a sprint board',        Icon: Lightning },
    { id: 'bug-triage',   title: 'Set up a bug triage flow',   Icon: Bug },
    { id: 'roadmap',      title: 'Map a release roadmap',      Icon: RocketLaunch },
  ],
  design: [
    { id: 'reviews',      title: 'Track design reviews',       Icon: PenNib },
    { id: 'library',      title: 'Build a component library',  Icon: SquaresFour },
    { id: 'research',     title: 'Run a research pipeline',    Icon: Users },
  ],
  product: [
    { id: 'roadmap',      title: 'Draft a product roadmap',    Icon: Compass },
    { id: 'backlog',      title: 'Organize a feature backlog', Icon: ListChecks },
    { id: 'launch',       title: 'Plan a launch checklist',    Icon: CheckSquare },
  ],
  marketing: [
    { id: 'campaign',     title: 'Build a campaign tracker',   Icon: Megaphone },
    { id: 'content',      title: 'Plan a content calendar',    Icon: CalendarBlank },
    { id: 'launch-comms', title: 'Coordinate launch comms',    Icon: PaperPlaneTilt },
  ],
  operations: [
    { id: 'vendors',      title: 'Track a vendor pipeline',    Icon: Handshake },
    { id: 'incidents',    title: 'Run an incident retro',      Icon: WarningCircle },
    { id: 'okrs',         title: 'Set up quarterly OKRs',      Icon: Target },
  ],
  sales: [
    { id: 'pipeline',     title: 'Build a deal pipeline',      Icon: Funnel },
    { id: 'outreach',     title: 'Plan an outreach queue',     Icon: PaperPlaneTilt },
    { id: 'discovery',    title: 'Prep for a discovery call',  Icon: MagnifyingGlass },
  ],
  founder: [
    { id: 'investors',    title: 'Track an investor pipeline', Icon: Bank },
    { id: 'hiring',       title: 'Build a hiring funnel',      Icon: UserPlus },
    { id: 'bets',         title: 'Plan your strategic bets',   Icon: Compass },
  ],
  student: [
    { id: 'coursework',   title: 'Organize coursework',        Icon: Books },
    { id: 'thesis',       title: 'Plan a thesis project',      Icon: GraduationCap },
    { id: 'reading',      title: 'Track a reading list',       Icon: BookOpen },
  ],
  other: [
    { id: 'todos',        title: 'Set up personal todos',      Icon: CheckCircle },
    { id: 'reading',      title: 'Track a reading queue',      Icon: BookBookmark },
    { id: 'review',       title: 'Plan a weekly review',       Icon: ListBullets },
  ],
}
