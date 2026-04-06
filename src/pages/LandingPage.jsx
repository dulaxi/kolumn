import { Link, Navigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import '@fontsource/crimson-pro/400.css'
import '@fontsource/crimson-pro/600.css'
import '@fontsource/crimson-pro/700.css'
import '@fontsource/crimson-pro/800.css'
import '@fontsource-variable/plus-jakarta-sans'
import {
  ArrowRight, Columns3, Users, Zap, Calendar, StickyNote,
  Share2, BarChart3, GripVertical, Tag, CheckSquare, Clock,
  Shield, Sparkles, MousePointerClick, ArrowUpRight,
  Check, Square, AlignLeft, User,
} from 'lucide-react'
import { Kanban } from '@phosphor-icons/react'
import { useAuthStore } from '../store/authStore'

/* ── Mock board data for hero preview ── */
const mockColumns = [
  {
    title: 'To Do',
    color: '#E8E2DB',
    cards: [
      {
        title: 'Design system tokens',
        desc: 'Define color, spacing, and typography tokens for the component library',
        labels: [{ text: 'Design', bg: 'bg-[#E8DDE2]', fg: 'text-[#6E5A65]' }],
        priority: 'high',
        id: 1,
      },
      {
        title: 'Set up CI pipeline',
        labels: [{ text: 'DevOps', bg: 'bg-[#DAE0F0]', fg: 'text-[#4A5578]' }],
        priority: 'medium',
        dueDate: 'Mar 8',
        id: 2,
      },
      {
        title: 'Write onboarding docs',
        labels: [{ text: 'Docs', bg: 'bg-[#F5EDCF]', fg: 'text-[#8B7322]' }],
        checklist: { done: 1, total: 5 },
        id: 3,
      },
    ],
  },
  {
    title: 'In Progress',
    color: '#DAE0F0',
    cards: [
      {
        title: 'Auth flow redesign',
        desc: 'Migrate from session-based to JWT tokens with refresh flow',
        labels: [{ text: 'Feature', bg: 'bg-[#EEF2D6]', fg: 'text-[#6B7A12]' }],
        priority: 'high',
        assignee: 'A',
        checklist: { done: 3, total: 6 },
        id: 4,
      },
      {
        title: 'API rate limiting',
        labels: [{ text: 'Backend', bg: 'bg-[#F2D9C7]', fg: 'text-[#8B5A33]' }],
        priority: 'medium',
        assignee: 'M',
        dueDate: 'Mar 5',
        id: 5,
      },
    ],
  },
  {
    title: 'Review',
    color: '#F5EDCF',
    cards: [
      {
        title: 'Landing page copy',
        desc: 'Final copy review for hero section and feature descriptions',
        labels: [{ text: 'Content', bg: 'bg-[#E8DDE2]', fg: 'text-[#6E5A65]' }],
        assignee: 'S',
        checklist: { done: 4, total: 4 },
        id: 6,
      },
      {
        title: 'Mobile nav polish',
        labels: [{ text: 'UI', bg: 'bg-[#E8DDE2]', fg: 'text-[#6E5A65]' }],
        priority: 'low',
        assignee: 'J',
        dueDate: 'Mar 10',
        id: 7,
      },
    ],
  },
  {
    title: 'Done',
    color: '#EEF2D6',
    cards: [
      {
        title: 'User signup flow',
        labels: [{ text: 'Feature', bg: 'bg-[#EEF2D6]', fg: 'text-[#6B7A12]' }],
        assignee: 'A',
        id: 8,
        done: true,
      },
      {
        title: 'Database schema v2',
        labels: [{ text: 'Backend', bg: 'bg-[#F2D9C7]', fg: 'text-[#8B5A33]' }],
        assignee: 'M',
        id: 9,
        done: true,
        checklist: { done: 8, total: 8 },
      },
    ],
  },
]

/* ── Mock card detail panel data ── */
const mockDetailCard = {
  title: 'Auth flow redesign',
  taskNumber: 'GB-24',
  desc: 'Migrate the authentication system from session-based cookies to JWT tokens with a refresh token rotation strategy. This includes updating all protected API endpoints and the client-side token management.',
  labels: [
    { text: 'Feature', bg: 'bg-[#EEF2D6]', fg: 'text-[#6B7A12]' },
    { text: 'Backend', bg: 'bg-[#F2D9C7]', fg: 'text-[#8B5A33]' },
  ],
  priority: 'high',
  assignee: { name: 'Alex Chen', initial: 'A' },
  dueDate: 'Mar 12, 2026',
  checklist: [
    { text: 'Research JWT libraries', done: true },
    { text: 'Design token refresh flow', done: true },
    { text: 'Implement auth middleware', done: true },
    { text: 'Update protected routes', done: false },
    { text: 'Add token rotation', done: false },
    { text: 'Write integration tests', done: false },
  ],
}

const stats = [
  { value: '10x', label: 'Faster planning' },
  { value: '100%', label: 'Real-time sync' },
  { value: '0', label: 'Config needed' },
  { value: '∞', label: 'Boards & cards' },
]

const features = [
  {
    icon: Columns3,
    title: 'Kanban Boards',
    desc: 'Organize work into columns that match your workflow. Drag cards between stages with buttery-smooth interactions.',
  },
  {
    icon: Users,
    title: 'Real-Time Collaboration',
    desc: 'Share boards with your team. Every change syncs instantly across all connected users — no refresh needed.',
  },
  {
    icon: Zap,
    title: 'Smart Organization',
    desc: 'Priorities, color-coded labels, checklists, and due dates. Everything you need to stay on top of your work.',
  },
  {
    icon: Shield,
    title: 'Secure by Default',
    desc: 'Row-level security on every table. Your data is private to your team with zero configuration.',
  },
  {
    icon: MousePointerClick,
    title: 'Drag & Drop Everything',
    desc: 'Reorder cards, move between columns, rearrange your entire board — all with natural drag interactions.',
  },
  {
    icon: Sparkles,
    title: 'Clean Interface',
    desc: 'No bloat, no clutter. A focused workspace that gets out of your way so you can focus on shipping.',
  },
]

const tools = [
  { icon: Calendar, title: 'Calendar', desc: 'Timeline view for all tasks' },
  { icon: StickyNote, title: 'Notes', desc: 'Capture ideas and context' },
  { icon: Share2, title: 'Sharing', desc: 'One-click team invites' },
  { icon: Tag, title: 'Labels', desc: 'Color-coded categorization' },
  { icon: CheckSquare, title: 'Checklists', desc: 'Subtask tracking' },
  { icon: BarChart3, title: 'Dashboard', desc: 'Progress at a glance' },
  { icon: GripVertical, title: 'Drag & Drop', desc: 'Fluid card management' },
  { icon: Clock, title: 'Due Dates', desc: 'Never miss a deadline' },
]

/* ── Priority dot ── */
function PriorityDot({ priority }) {
  if (!priority) return null
  const colors = { high: 'bg-[#C27A4A]', medium: 'bg-[#D4A843]', low: 'bg-[#A8BA32]' }
  return <span className={`w-1.5 h-1.5 rounded-full ${colors[priority]}`} />
}

/* ── Mock card component (enriched) ── */
function MockCard({ card }) {
  return (
    <div className="bg-white rounded-lg p-2.5 shadow-sm border border-[#E8E2DB] hover:shadow-md transition-all duration-200">
      <div className="flex items-start justify-between gap-2">
        <p className={`text-[11px] font-medium leading-snug ${card.done ? 'text-[#8E8E89] line-through' : 'text-[#1B1B18]'}`}>
          {card.title}
        </p>
        <PriorityDot priority={card.priority} />
      </div>
      {card.desc && (
        <p className="text-[9px] text-[#8E8E89] leading-snug mt-1 line-clamp-1">{card.desc}</p>
      )}
      <div className="flex items-center justify-between mt-2 gap-2">
        <div className="flex items-center gap-1 flex-wrap min-w-0">
          {card.labels?.map((l) => (
            <span key={l.text} className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full ${l.bg} ${l.fg}`}>
              {l.text}
            </span>
          ))}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {card.dueDate && (
            <span className="text-[8px] text-[#8E8E89] font-medium flex items-center gap-0.5">
              <Clock className="w-2.5 h-2.5" />
              {card.dueDate}
            </span>
          )}
          {card.assignee && (
            <span className="w-5 h-5 rounded-full bg-[#1B1B18] text-white text-[9px] font-bold flex items-center justify-center">
              {card.assignee}
            </span>
          )}
        </div>
      </div>
      {card.checklist && (
        <div className="mt-2 flex items-center gap-1.5">
          <div className="flex-1 h-1 bg-[#E8E2DB] rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${card.checklist.done === card.checklist.total ? 'bg-[#A8BA32]' : 'bg-[#A8BA32]'}`}
              style={{ width: `${(card.checklist.done / card.checklist.total) * 100}%` }}
            />
          </div>
          <span className={`text-[8px] font-semibold ${card.checklist.done === card.checklist.total ? 'text-[#A8BA32]' : 'text-[#8E8E89]'}`}>
            {card.checklist.done}/{card.checklist.total}
          </span>
        </div>
      )}
    </div>
  )
}

/* ── Mock column component ── */
function MockColumn({ column }) {
  return (
    <div className="min-w-[195px] flex-1">
      <div className="flex items-center gap-2 mb-2.5 px-1">
        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: column.color }} />
        <span className="text-[11px] font-bold text-[#5C5C57] uppercase tracking-wider">{column.title}</span>
        <span className="text-[10px] text-[#8E8E89] font-medium ml-auto">{column.cards.length}</span>
      </div>
      <div className="space-y-2">
        {column.cards.map((card) => (
          <MockCard key={card.id} card={card} />
        ))}
      </div>
    </div>
  )
}

/* ── Mock card detail panel ── */
function MockDetailPanel() {
  const card = mockDetailCard
  const checkDone = card.checklist.filter((c) => c.done).length
  return (
    <div className="rounded-2xl border border-[#E0DBD5]/80 bg-white shadow-2xl shadow-[#E0DBD5]/60 overflow-hidden w-full max-w-sm">
      {/* Header */}
      <div className="px-5 pt-5 pb-3 border-b border-[#E8E2DB]">
        <div className="text-[10px] text-[#8E8E89] font-medium mb-1">{card.taskNumber}</div>
        <h3 className="text-sm font-bold text-[#1B1B18] leading-snug">{card.title}</h3>
      </div>

      {/* Body */}
      <div className="px-5 py-4 space-y-4">
        {/* Meta row */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="text-[9px] text-[#8E8E89] font-medium uppercase tracking-wider mb-1">Assignee</div>
            <div className="flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-[#1B1B18] text-white text-[9px] font-bold flex items-center justify-center">{card.assignee.initial}</span>
              <span className="text-[11px] text-[#5C5C57] font-medium">{card.assignee.name}</span>
            </div>
          </div>
          <div>
            <div className="text-[9px] text-[#8E8E89] font-medium uppercase tracking-wider mb-1">Due Date</div>
            <div className="flex items-center gap-1">
              <Calendar className="w-3 h-3 text-[#8E8E89]" />
              <span className="text-[11px] text-[#5C5C57] font-medium">{card.dueDate}</span>
            </div>
          </div>
          <div>
            <div className="text-[9px] text-[#8E8E89] font-medium uppercase tracking-wider mb-1">Priority</div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#C27A4A]" />
              <span className="text-[11px] text-[#5C5C57] font-medium capitalize">{card.priority}</span>
            </div>
          </div>
          <div>
            <div className="text-[9px] text-[#8E8E89] font-medium uppercase tracking-wider mb-1">Labels</div>
            <div className="flex items-center gap-1">
              {card.labels.map((l) => (
                <span key={l.text} className={`text-[8px] font-semibold px-1.5 py-0.5 rounded-full ${l.bg} ${l.fg}`}>
                  {l.text}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Description */}
        <div>
          <div className="flex items-center gap-1.5 mb-1.5">
            <AlignLeft className="w-3 h-3 text-[#8E8E89]" />
            <span className="text-[9px] text-[#8E8E89] font-medium uppercase tracking-wider">Description</span>
          </div>
          <p className="text-[11px] text-[#5C5C57] leading-relaxed">{card.desc}</p>
        </div>

        {/* Checklist */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <CheckSquare className="w-3 h-3 text-[#8E8E89]" />
              <span className="text-[9px] text-[#8E8E89] font-medium uppercase tracking-wider">Checklist</span>
            </div>
            <span className="text-[9px] font-semibold text-[#5C5C57]">{checkDone}/{card.checklist.length}</span>
          </div>
          <div className="h-1 bg-[#E8E2DB] rounded-full overflow-hidden mb-2.5">
            <div
              className="h-full bg-[#A8BA32] rounded-full"
              style={{ width: `${(checkDone / card.checklist.length) * 100}%` }}
            />
          </div>
          <div className="space-y-1">
            {card.checklist.map((item) => (
              <div key={item.text} className="flex items-center gap-2 py-0.5">
                {item.done ? (
                  <div className="w-3.5 h-3.5 rounded bg-[#A8BA32] flex items-center justify-center shrink-0">
                    <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />
                  </div>
                ) : (
                  <Square className="w-3.5 h-3.5 text-[#8E8E89] shrink-0" />
                )}
                <span className={`text-[11px] ${item.done ? 'text-[#8E8E89] line-through' : 'text-[#5C5C57]'}`}>
                  {item.text}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function LandingPage() {
  const user = useAuthStore((s) => s.user)
  const loading = useAuthStore((s) => s.loading)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 50)
    return () => clearTimeout(t)
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAF8F6] flex items-center justify-center">
        <div className="text-sm text-[#8E8E89]">Loading...</div>
      </div>
    )
  }

  if (user) {
    return <Navigate to="/dashboard" replace />
  }

  return (
    <div className={`landing-font min-h-screen bg-[#FAF8F6] transition-opacity duration-500 ${visible ? 'opacity-100' : 'opacity-0'}`}>

      {/* ─── Nav ─── */}
      <nav className="sticky top-0 z-50 bg-[#FAF8F6]">
        <div className="flex items-center justify-between max-w-[90rem] mx-auto" style={{ width: 'calc(100% - (2 * clamp(2rem, 1.43rem + 2.86vw, 4rem)))' }}>
          <div className="flex items-center">
            <Kanban size={30} weight="fill" className="text-[#8BA32E]" />
            <span className="text-[23px] font-[450] text-[#1B1B18] tracking-tight leading-none ml-2 font-logo">Kolumn</span>
          </div>
          <div className="flex items-center gap-3 py-6">
            <Link
              to="/login"
              className="inline-flex items-center justify-center h-9 px-5 min-w-[5rem] whitespace-nowrap text-[15px] font-normal text-[#5C5C57] hover:text-[#1B1B18] border-[0.5px] border-[#E0DBD5] rounded-lg transition-all duration-200"
            >
              Sign in
            </Link>
            <Link
              to="/signup"
              className="inline-flex items-center justify-center h-9 px-5 min-w-[5rem] whitespace-nowrap text-[15px] font-normal bg-[#1B1B18] text-white rounded-lg overflow-hidden transition-transform will-change-transform ease-[cubic-bezier(0.165,0.85,0.45,1)] duration-150 hover:scale-y-[1.015] hover:scale-x-[1.005]"
            >
              Get started
            </Link>
          </div>
        </div>
      </nav>

      {/* ─── Hero ─── */}
      <section className="relative overflow-hidden">
        <div className="px-6 sm:px-10 pt-16 pb-8 max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EEF2D6] text-[#6B7A12] text-xs font-normal mb-6">
              <Sparkles className="w-3.5 h-3.5" />
              100% free — no credit card required
            </span>
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-normal text-[#1B1B18] tracking-tight leading-[1.08] mb-5">
              Project management
              <br />
              that feels{' '}
              <span className="text-[#8BA32E] font-heading text-[1.09em]">effortless</span>
            </h1>
            <p className="text-base sm:text-lg text-[#5C5C57] max-w-lg mx-auto mb-8 leading-relaxed">
              A clean Kanban workspace for teams that value focus over features.
              Organize, collaborate, and ship — without the clutter.
            </p>
            <div className="flex items-center justify-center gap-3">
              <Link
                to="/signup"
                className="inline-flex items-center gap-2 px-6 py-3 bg-[#1B1B18] text-white text-sm font-normal rounded-lg hover:bg-[#333] transition-all"
              >
                Get started free
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                to="/login"
                className="inline-flex items-center gap-2 px-6 py-3 bg-white text-[#5C5C57] text-sm font-normal rounded-lg border border-[#E0DBD5] hover:border-[#E0DBD5] hover:bg-[#F2EDE8] transition-all"
              >
                Sign in
              </Link>
            </div>
            <p className="mt-6 text-sm text-[#8E8E89]">
              Trusted by early adopters · launching 2026
            </p>
          </div>

          {/* ─── Mock Board Preview ─── */}
          <div className="relative max-w-5xl mx-auto">
            <div className="rounded-2xl border border-[#E0DBD5]/80 bg-white shadow-2xl shadow-[#E0DBD5]/60 overflow-hidden">
              {/* Browser title bar */}
              <div className="flex items-center gap-2 px-4 py-2.5 bg-[#F2EDE8] border-b border-[#E8E2DB]">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-[#FF5F57]" />
                  <span className="w-3 h-3 rounded-full bg-[#FEBC2E]" />
                  <span className="w-3 h-3 rounded-full bg-[#28C840]" />
                </div>
                <div className="flex-1 flex justify-center">
                  <div className="px-4 py-1 rounded-md bg-white border border-[#E0DBD5] text-[10px] text-[#8E8E89] font-medium">
                    kolumn.app/boards/product-launch
                  </div>
                </div>
                <div className="w-12" />
              </div>

              {/* Board content */}
              <div className="flex items-start">
                {/* Mini sidebar */}
                <div className="hidden sm:flex w-12 bg-[#F2EDE8] border-r border-[#E8E2DB] py-4 flex-col items-center gap-3 shrink-0 min-h-[380px]">
                  <Kanban size={18} weight="regular" className="text-[#8E8E89]" />
                  <div className="w-5 h-[1px] bg-[#E0DBD5] my-1" />
                  <div className="w-6 h-6 rounded-md bg-[#C2D64A]/20 flex items-center justify-center">
                    <Columns3 className="w-3.5 h-3.5 text-[#5C5C57]" />
                  </div>
                  <div className="w-6 h-6 rounded-md flex items-center justify-center">
                    <Calendar className="w-3.5 h-3.5 text-[#8E8E89]" />
                  </div>
                  <div className="w-6 h-6 rounded-md flex items-center justify-center">
                    <StickyNote className="w-3.5 h-3.5 text-[#8E8E89]" />
                  </div>
                  <div className="w-6 h-6 rounded-md flex items-center justify-center">
                    <BarChart3 className="w-3.5 h-3.5 text-[#8E8E89]" />
                  </div>
                  <div className="mt-auto w-6 h-6 rounded-md flex items-center justify-center">
                    <User className="w-3.5 h-3.5 text-[#8E8E89]" />
                  </div>
                </div>

                {/* Columns */}
                <div className="flex-1 p-4 overflow-x-auto">
                  <div className="flex gap-3">
                    {mockColumns.map((col) => (
                      <MockColumn key={col.title} column={col} />
                    ))}
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ─── Stats Bar ─── */}
      <section className="px-6 sm:px-10 py-12 max-w-4xl mx-auto">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
          {stats.map((s) => (
            <div key={s.label} className="text-center">
              <div className="text-4xl sm:text-5xl font-normal text-[#8BA32E] tracking-tight font-logo">{s.value}</div>
              <div className="text-xs text-[#8E8E89] font-normal mt-1 uppercase tracking-wider font-logo">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Card Detail Showcase ─── */}
      <section className="px-6 sm:px-10 py-14 max-w-5xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
          {/* Left — text */}
          <div>
            <h2 className="text-3xl sm:text-4xl font-normal text-[#1B1B18] tracking-tight mb-3">
              Every detail,{' '}
              <span className="text-[#8BA32E] font-heading text-[1.09em]">one click away</span>
            </h2>
            <p className="text-sm text-[#5C5C57] leading-relaxed mb-6">
              Click any card to open a rich detail panel. Add descriptions, track progress with checklists,
              assign teammates, set priorities, and manage due dates — all without leaving your board.
            </p>
            <div className="space-y-3">
              {[
                { icon: AlignLeft, text: 'Rich descriptions with full context for every task' },
                { icon: CheckSquare, text: 'Checklists with progress tracking and completion state' },
                { icon: Tag, text: 'Color-coded labels and priority levels at a glance' },
                { icon: Users, text: 'Assign tasks to teammates with one click' },
              ].map((item) => (
                <div key={item.text} className="flex items-start gap-2.5">
                  <div className="w-6 h-6 rounded-lg bg-[#C2D64A]/20 flex items-center justify-center shrink-0 mt-0.5">
                    <item.icon className="w-3.5 h-3.5 text-[#1B1B18]" />
                  </div>
                  <p className="text-[13px] text-[#5C5C57] leading-relaxed">{item.text}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Right — mock detail panel */}
          <div className="flex justify-center lg:justify-end">
            <MockDetailPanel />
          </div>
        </div>
      </section>

      {/* ─── Features Grid ─── */}
      <section className="px-6 sm:px-10 py-16 max-w-5xl mx-auto">
        <div className="text-center mb-10">
          <h2 className="text-3xl sm:text-4xl font-normal text-[#1B1B18] tracking-tight mb-2">Built for how teams <span className="text-[#8BA32E] font-heading text-[1.09em]">actually work</span></h2>
          <p className="text-sm text-[#5C5C57] max-w-md mx-auto">No bloat, no learning curve. Just the tools that matter — designed to feel invisible.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map((f) => (
            <div
              key={f.title}
              className="group bg-white border border-[#E0DBD5]/80 rounded-2xl p-5 hover:shadow-lg hover:border-[#E0DBD5]/80 transition-all duration-300"
            >
              <div className="w-9 h-9 rounded-xl bg-[#C2D64A]/20 group-hover:bg-[#1B1B18] flex items-center justify-center mb-3.5 transition-colors duration-300">
                <f.icon className="w-4.5 h-4.5 text-[#1B1B18] group-hover:text-white transition-colors duration-300" />
              </div>
              <h3 className="text-base font-normal text-[#1B1B18] mb-1">{f.title}</h3>
              <p className="text-[13px] text-[#5C5C57] leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Tools Strip ─── */}
      <section className="px-6 sm:px-10 py-14 max-w-5xl mx-auto">
        <div className="bg-white border border-[#E0DBD5]/80 rounded-2xl p-6 sm:p-8 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-normal text-[#1B1B18]">Everything you <span className="text-[#8BA32E] font-heading text-[1.09em]">need</span></h2>
              <p className="text-xs text-[#8E8E89] mt-0.5">All the tools, none of the complexity.</p>
            </div>
            <Link
              to="/signup"
              className="hidden sm:inline-flex items-center gap-1.5 text-xs font-normal text-[#5C5C57] hover:text-[#1B1B18] transition-colors"
            >
              Try it free
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {tools.map((t) => (
              <div
                key={t.title}
                className="flex items-center gap-3 p-3 rounded-xl bg-[#F2EDE8] hover:bg-[#E8E2DB] transition-colors group"
              >
                <div className="w-8 h-8 rounded-lg bg-[#C2D64A]/20 flex items-center justify-center shrink-0 transition-colors">
                  <t.icon className="w-4 h-4 text-[#1B1B18]" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-normal text-[#1B1B18] truncate">{t.title}</div>
                  <div className="text-[10px] text-[#8E8E89] truncate">{t.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA ─── */}
      <section className="relative px-6 sm:px-10 py-16 max-w-5xl mx-auto text-center">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-gradient-to-r from-[#1B1B18]/25 to-[#C2D64A]/25 rounded-full blur-3xl pointer-events-none" />
        <div className="relative">
        <div className="w-10 h-[1px] bg-[#E0DBD5] mx-auto mb-10" />
        <h2 className="text-3xl sm:text-4xl font-normal text-[#1B1B18] tracking-tight mb-3">
          Your team's <span className="text-[#8BA32E] font-heading text-[1.09em]">next move</span> starts here
        </h2>
        <p className="text-sm text-[#5C5C57] max-w-sm mx-auto mb-8 leading-relaxed">
          Set up your first board in under 60 seconds. No credit card, no setup wizard.
        </p>
        <Link
          to="/signup"
          className="inline-flex items-center gap-2 px-6 py-3 bg-[#1B1B18] text-white text-sm font-normal rounded-lg hover:bg-[#333] transition-colors"
        >
          Get started free
          <ArrowRight className="w-4 h-4" />
        </Link>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer className="px-6 sm:px-10 pb-8 pt-4 max-w-5xl mx-auto">
        <div className="border-t border-[#E0DBD5] pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-[#8E8E89]">
            <Kanban size={16} weight="regular" className="text-[#8E8E89]" />
            <span className="font-bold font-logo">Kolumn</span>
            <span className="text-[#8E8E89] mx-1">&middot;</span>
            <span>Built for teams that ship.</span>
          </div>
          <div className="flex items-center gap-4 text-xs text-[#8E8E89]">
            <a href="mailto:hello@kolumn.app" className="hover:text-[#5C5C57] transition-colors">Contact</a>
            <Link to="/login" className="hover:text-[#5C5C57] transition-colors">Sign in</Link>
            <Link to="/signup" className="hover:text-[#5C5C57] transition-colors">Sign up</Link>
          </div>
        </div>
        <p className="text-center text-xs text-[#C4BFB8] mt-4">&copy; {new Date().getFullYear()} Kolumn. All rights reserved.</p>
      </footer>
    </div>
  )
}
