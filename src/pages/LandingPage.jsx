import { Link, Navigate } from 'react-router-dom'
import { useEffect, useState, useRef } from 'react'
import '@fontsource/google-sans/latin-400.css'
import '@fontsource/google-sans/latin-500.css'
import '@fontsource/google-sans/latin-700.css'
import {
  ArrowRight, Columns3, Users, Zap, Calendar, StickyNote,
  Share2, BarChart3, GripVertical, Tag, CheckSquare, Clock,
  Shield, Sparkles, MousePointerClick, ArrowUpRight,
  Check, Square, AlignLeft, User,
} from 'lucide-react'
import { useAuthStore } from '../store/authStore'

/* ── Mock board data for hero preview ── */
const mockColumns = [
  {
    title: 'To Do',
    color: '#E4EBE6',
    cards: [
      {
        title: 'Design system tokens',
        desc: 'Define color, spacing, and typography tokens for the component library',
        labels: [{ text: 'Design', bg: 'bg-[#EDD8FD]', fg: 'text-[#8534F3]' }],
        priority: 'high',
        id: 1,
      },
      {
        title: 'Set up CI pipeline',
        labels: [{ text: 'DevOps', bg: 'bg-[#DAF0FF]', fg: 'text-[#3094FF]' }],
        priority: 'medium',
        dueDate: 'Mar 8',
        id: 2,
      },
      {
        title: 'Write onboarding docs',
        labels: [{ text: 'Docs', bg: 'bg-[#FFF4D4]', fg: 'text-[#9A6700]' }],
        checklist: { done: 1, total: 5 },
        id: 3,
      },
    ],
  },
  {
    title: 'In Progress',
    color: '#DAF0FF',
    cards: [
      {
        title: 'Auth flow redesign',
        desc: 'Migrate from session-based to JWT tokens with refresh flow',
        labels: [{ text: 'Feature', bg: 'bg-[#D1FDE0]', fg: 'text-[#08872B]' }],
        priority: 'high',
        assignee: 'A',
        checklist: { done: 3, total: 6 },
        id: 4,
      },
      {
        title: 'API rate limiting',
        labels: [{ text: 'Backend', bg: 'bg-[#FFE0DB]', fg: 'text-[#CF222E]' }],
        priority: 'medium',
        assignee: 'M',
        dueDate: 'Mar 5',
        id: 5,
      },
    ],
  },
  {
    title: 'Review',
    color: '#FFF4D4',
    cards: [
      {
        title: 'Landing page copy',
        desc: 'Final copy review for hero section and feature descriptions',
        labels: [{ text: 'Content', bg: 'bg-[#FFD6EA]', fg: 'text-[#BF3989]' }],
        assignee: 'S',
        checklist: { done: 4, total: 4 },
        id: 6,
      },
      {
        title: 'Mobile nav polish',
        labels: [{ text: 'UI', bg: 'bg-[#EDD8FD]', fg: 'text-[#8534F3]' }],
        priority: 'low',
        assignee: 'J',
        dueDate: 'Mar 10',
        id: 7,
      },
    ],
  },
  {
    title: 'Done',
    color: '#D1FDE0',
    cards: [
      {
        title: 'User signup flow',
        labels: [{ text: 'Feature', bg: 'bg-[#D1FDE0]', fg: 'text-[#08872B]' }],
        assignee: 'A',
        id: 8,
        done: true,
      },
      {
        title: 'Database schema v2',
        labels: [{ text: 'Backend', bg: 'bg-[#FFE0DB]', fg: 'text-[#CF222E]' }],
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
    { text: 'Feature', bg: 'bg-[#D1FDE0]', fg: 'text-[#08872B]' },
    { text: 'Backend', bg: 'bg-[#FFE0DB]', fg: 'text-[#CF222E]' },
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
  const colors = { high: 'bg-rose-400', medium: 'bg-amber-400', low: 'bg-emerald-400' }
  return <span className={`w-1.5 h-1.5 rounded-full ${colors[priority]}`} />
}

/* ── Mock card component (enriched) ── */
function MockCard({ card }) {
  return (
    <div className="bg-white rounded-lg p-2.5 shadow-sm border border-gray-100 hover:shadow-md transition-all duration-200">
      <div className="flex items-start justify-between gap-2">
        <p className={`text-[11px] font-medium leading-snug ${card.done ? 'text-gray-500 line-through' : 'text-gray-800'}`}>
          {card.title}
        </p>
        <PriorityDot priority={card.priority} />
      </div>
      {card.desc && (
        <p className="text-[9px] text-gray-500 leading-snug mt-1 line-clamp-1">{card.desc}</p>
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
            <span className="text-[8px] text-gray-500 font-medium flex items-center gap-0.5">
              <Clock className="w-2.5 h-2.5" />
              {card.dueDate}
            </span>
          )}
          {card.assignee && (
            <span className="w-5 h-5 rounded-full bg-gray-900 text-white text-[9px] font-bold flex items-center justify-center">
              {card.assignee}
            </span>
          )}
        </div>
      </div>
      {card.checklist && (
        <div className="mt-2 flex items-center gap-1.5">
          <div className="flex-1 h-1 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${card.checklist.done === card.checklist.total ? 'bg-emerald-400' : 'bg-blue-400'}`}
              style={{ width: `${(card.checklist.done / card.checklist.total) * 100}%` }}
            />
          </div>
          <span className={`text-[8px] font-semibold ${card.checklist.done === card.checklist.total ? 'text-emerald-500' : 'text-gray-500'}`}>
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
        <span className="text-[11px] font-bold text-gray-600 uppercase tracking-wider">{column.title}</span>
        <span className="text-[10px] text-gray-500 font-medium ml-auto">{column.cards.length}</span>
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
    <div className="rounded-2xl border border-gray-200/80 bg-white shadow-2xl shadow-gray-200/60 overflow-hidden w-full max-w-sm" style={{ fontFamily: "'Mona Sans Variable', 'Mona Sans', sans-serif" }}>
      {/* Header */}
      <div className="px-5 pt-5 pb-3 border-b border-gray-100">
        <div className="text-[10px] text-gray-500 font-medium mb-1">{card.taskNumber}</div>
        <h3 className="text-sm font-bold text-gray-900 leading-snug">{card.title}</h3>
      </div>

      {/* Body */}
      <div className="px-5 py-4 space-y-4">
        {/* Meta row */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="text-[9px] text-gray-500 font-medium uppercase tracking-wider mb-1">Assignee</div>
            <div className="flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-gray-900 text-white text-[9px] font-bold flex items-center justify-center">{card.assignee.initial}</span>
              <span className="text-[11px] text-gray-700 font-medium">{card.assignee.name}</span>
            </div>
          </div>
          <div>
            <div className="text-[9px] text-gray-500 font-medium uppercase tracking-wider mb-1">Due Date</div>
            <div className="flex items-center gap-1">
              <Calendar className="w-3 h-3 text-gray-500" />
              <span className="text-[11px] text-gray-700 font-medium">{card.dueDate}</span>
            </div>
          </div>
          <div>
            <div className="text-[9px] text-gray-500 font-medium uppercase tracking-wider mb-1">Priority</div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-rose-400" />
              <span className="text-[11px] text-gray-700 font-medium capitalize">{card.priority}</span>
            </div>
          </div>
          <div>
            <div className="text-[9px] text-gray-500 font-medium uppercase tracking-wider mb-1">Labels</div>
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
            <AlignLeft className="w-3 h-3 text-gray-500" />
            <span className="text-[9px] text-gray-500 font-medium uppercase tracking-wider">Description</span>
          </div>
          <p className="text-[11px] text-gray-600 leading-relaxed">{card.desc}</p>
        </div>

        {/* Checklist */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <CheckSquare className="w-3 h-3 text-gray-500" />
              <span className="text-[9px] text-gray-500 font-medium uppercase tracking-wider">Checklist</span>
            </div>
            <span className="text-[9px] font-semibold text-gray-600">{checkDone}/{card.checklist.length}</span>
          </div>
          <div className="h-1 bg-gray-100 rounded-full overflow-hidden mb-2.5">
            <div
              className="h-full bg-blue-400 rounded-full"
              style={{ width: `${(checkDone / card.checklist.length) * 100}%` }}
            />
          </div>
          <div className="space-y-1">
            {card.checklist.map((item) => (
              <div key={item.text} className="flex items-center gap-2 py-0.5">
                {item.done ? (
                  <div className="w-3.5 h-3.5 rounded bg-blue-500 flex items-center justify-center shrink-0">
                    <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />
                  </div>
                ) : (
                  <Square className="w-3.5 h-3.5 text-gray-500 shrink-0" />
                )}
                <span className={`text-[11px] ${item.done ? 'text-gray-500 line-through' : 'text-gray-700'}`}>
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
  const pageRef = useRef(null)

  // Create cursor circle via DOM + attach listeners
  useEffect(() => {
    // Cursor circle
    const circle = document.createElement('div')
    Object.assign(circle.style, {
      position: 'fixed',
      top: '0',
      left: '0',
      width: '32px',
      height: '32px',
      borderRadius: '50%',
      backdropFilter: 'invert(1) contrast(2)',
      WebkitBackdropFilter: 'invert(1) contrast(2)',
      pointerEvents: 'none',
      zIndex: '99999',
      opacity: '0',
      transform: 'translate3d(-100px, -100px, 0)',
    })
    document.body.appendChild(circle)

    const handleMove = (e) => {
      circle.style.transform = `translate3d(${e.clientX - 16}px, ${e.clientY - 16}px, 0)`
      const hit = e.target.closest('a, button')
      circle.style.opacity = hit ? '0' : '1'
    }

    const handleLeave = () => {
      circle.style.opacity = '0'
    }

    window.addEventListener('mousemove', handleMove)
    document.addEventListener('mouseleave', handleLeave)

    return () => {
      window.removeEventListener('mousemove', handleMove)
      document.removeEventListener('mouseleave', handleLeave)
      document.body.removeChild(circle)
    }
  }, [])

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 50)
    return () => clearTimeout(t)
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-sm text-gray-500">Loading...</div>
      </div>
    )
  }

  if (user) {
    return <Navigate to="/dashboard" replace />
  }

  return (
    <div ref={pageRef} className={`landing-no-cursor min-h-screen bg-[#FAFAFA] transition-opacity duration-500 ${visible ? 'opacity-100' : 'opacity-0'}`}>

      {/* ─── Nav ─── */}
      <nav className="sticky top-0 z-50 bg-[#FAFAFA]/80 backdrop-blur-xl border-b border-gray-200/50">
        <div className="flex items-center justify-between px-6 sm:px-10 py-3.5 max-w-6xl mx-auto">
          <div className="flex items-center gap-2.5">
            <span
              className="material-symbols-outlined text-gray-900"
              style={{ fontSize: '26px', lineHeight: '26px', fontVariationSettings: "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24" }}
            >owl</span>
            <span className="text-lg font-bold text-gray-900 tracking-tight">Gambit</span>
          </div>
          <div className="flex items-center gap-2">
            <Link
              to="/login"
              className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors px-3 py-2 rounded-lg hover:bg-gray-100"
            >
              Sign in
            </Link>
            <Link
              to="/signup"
              className="text-sm font-medium bg-gray-900 text-white px-4 py-2 rounded-xl hover:bg-gray-800 transition-colors"
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
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-gray-200 text-xs font-medium text-gray-600 mb-6 shadow-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Real-time collaboration, built in
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-gray-900 tracking-tight leading-[1.08] mb-5">
              Project management
              <br />
              that feels{' '}
              <span className="bg-gradient-to-r from-[#103783] to-[#9BAFD9] bg-clip-text text-transparent">effortless</span>
            </h1>
            <p className="text-base sm:text-lg text-gray-600 max-w-lg mx-auto mb-8 leading-relaxed">
              A clean Kanban workspace for teams that value focus over features.
              Organize, collaborate, and ship — without the clutter.
            </p>
            <div className="flex items-center justify-center gap-3">
              <Link
                to="/signup"
                className="inline-flex items-center gap-2 px-6 py-3 bg-gray-900 text-white text-sm font-semibold rounded-xl hover:bg-gray-800 transition-all shadow-sm hover:shadow-md"
              >
                Start for free
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                to="/login"
                className="inline-flex items-center gap-2 px-6 py-3 bg-white text-gray-600 text-sm font-semibold rounded-xl border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-all shadow-sm"
              >
                Sign in
              </Link>
            </div>
          </div>

          {/* ─── Mock Board Preview ─── */}
          <div className="relative max-w-5xl mx-auto">
            <div className="rounded-2xl border border-gray-200/80 bg-white shadow-2xl shadow-gray-200/60 overflow-hidden" style={{ fontFamily: "'Mona Sans Variable', 'Mona Sans', sans-serif" }}>
              {/* Browser title bar */}
              <div className="flex items-center gap-2 px-4 py-2.5 bg-gray-50 border-b border-gray-100">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-[#FF5F57]" />
                  <span className="w-3 h-3 rounded-full bg-[#FEBC2E]" />
                  <span className="w-3 h-3 rounded-full bg-[#28C840]" />
                </div>
                <div className="flex-1 flex justify-center">
                  <div className="px-4 py-1 rounded-md bg-white border border-gray-200 text-[10px] text-gray-500 font-medium">
                    gambit.app/boards/product-launch
                  </div>
                </div>
                <div className="w-12" />
              </div>

              {/* Board content */}
              <div className="flex items-start">
                {/* Mini sidebar */}
                <div className="hidden sm:flex w-12 bg-gray-50 border-r border-gray-100 py-4 flex-col items-center gap-3 shrink-0 min-h-[380px]">
                  <span
                    className="material-symbols-outlined text-gray-500"
                    style={{ fontSize: '18px', lineHeight: '18px', fontVariationSettings: "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24" }}
                  >owl</span>
                  <div className="w-5 h-[1px] bg-gray-200 my-1" />
                  <div className="w-6 h-6 rounded-md bg-blue-50 flex items-center justify-center">
                    <Columns3 className="w-3.5 h-3.5 text-gray-600" />
                  </div>
                  <div className="w-6 h-6 rounded-md flex items-center justify-center">
                    <Calendar className="w-3.5 h-3.5 text-gray-500" />
                  </div>
                  <div className="w-6 h-6 rounded-md flex items-center justify-center">
                    <StickyNote className="w-3.5 h-3.5 text-gray-500" />
                  </div>
                  <div className="w-6 h-6 rounded-md flex items-center justify-center">
                    <BarChart3 className="w-3.5 h-3.5 text-gray-500" />
                  </div>
                  <div className="mt-auto w-6 h-6 rounded-md flex items-center justify-center">
                    <User className="w-3.5 h-3.5 text-gray-500" />
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
              <div className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight">{s.value}</div>
              <div className="text-xs text-gray-500 font-medium mt-1 uppercase tracking-wider">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Card Detail Showcase ─── */}
      <section className="px-6 sm:px-10 py-14 max-w-5xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
          {/* Left — text */}
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight mb-3">
              Every detail,{' '}
              <span className="bg-gradient-to-r from-[#103783] to-[#9BAFD9] bg-clip-text text-transparent">one click away</span>
            </h2>
            <p className="text-sm text-gray-600 leading-relaxed mb-6">
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
                  <div className="w-6 h-6 rounded-lg bg-[#9BAFD9]/20 flex items-center justify-center shrink-0 mt-0.5">
                    <item.icon className="w-3.5 h-3.5 text-[#103783]" />
                  </div>
                  <p className="text-[13px] text-gray-600 leading-relaxed">{item.text}</p>
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
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight mb-2">Built for how teams actually work</h2>
          <p className="text-sm text-gray-600 max-w-md mx-auto">No bloat, no learning curve. Just the tools that matter — designed to feel invisible.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map((f) => (
            <div
              key={f.title}
              className="group bg-white border border-gray-200/80 rounded-2xl p-5 hover:shadow-lg hover:border-gray-300/80 transition-all duration-300"
            >
              <div className="w-9 h-9 rounded-xl bg-[#9BAFD9]/20 group-hover:bg-[#103783] flex items-center justify-center mb-3.5 transition-colors duration-300">
                <f.icon className="w-4.5 h-4.5 text-[#103783] group-hover:text-white transition-colors duration-300" />
              </div>
              <h3 className="text-sm font-bold text-gray-900 mb-1">{f.title}</h3>
              <p className="text-[13px] text-gray-600 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Tools Strip ─── */}
      <section className="px-6 sm:px-10 py-14 max-w-5xl mx-auto">
        <div className="bg-white border border-gray-200/80 rounded-2xl p-6 sm:p-8 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Everything you need</h2>
              <p className="text-xs text-gray-500 mt-0.5">All the tools, none of the complexity.</p>
            </div>
            <Link
              to="/signup"
              className="hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold text-gray-600 hover:text-gray-900 transition-colors"
            >
              Try it free
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {tools.map((t) => (
              <div
                key={t.title}
                className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors group cursor-default"
              >
                <div className="w-8 h-8 rounded-lg bg-[#9BAFD9]/20 flex items-center justify-center shrink-0 transition-colors">
                  <t.icon className="w-4 h-4 text-[#103783]" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-gray-900 truncate">{t.title}</div>
                  <div className="text-[10px] text-gray-500 truncate">{t.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA ─── */}
      <section className="relative px-6 sm:px-10 py-16 max-w-5xl mx-auto text-center">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-gradient-to-r from-[#103783]/25 to-[#9BAFD9]/25 rounded-full blur-3xl pointer-events-none" />
        <div className="relative">
        <div className="w-10 h-[1px] bg-gray-300 mx-auto mb-10" />
        <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight mb-3">
          Your team's next move starts here
        </h2>
        <p className="text-sm text-gray-600 max-w-sm mx-auto mb-8 leading-relaxed">
          Set up your first board in under 60 seconds. No credit card, no setup wizard.
        </p>
        <Link
          to="/signup"
          className="inline-flex items-center gap-2 px-6 py-3 bg-gray-900 text-white text-sm font-semibold rounded-xl hover:bg-gray-800 transition-colors shadow-sm"
        >
          Get started free
          <ArrowRight className="w-4 h-4" />
        </Link>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer className="px-6 sm:px-10 pb-8 pt-4 max-w-5xl mx-auto">
        <div className="border-t border-gray-200 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span
              className="material-symbols-outlined"
              style={{ fontSize: '16px', lineHeight: '16px', fontVariationSettings: "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24" }}
            >owl</span>
            <span className="font-medium">Gambit</span>
            <span className="text-gray-500 mx-1">&middot;</span>
            <span>Built for teams that ship.</span>
          </div>
          <div className="flex items-center gap-4 text-xs text-gray-500">
            <Link to="/login" className="hover:text-gray-600 transition-colors">Sign in</Link>
            <Link to="/signup" className="hover:text-gray-600 transition-colors">Sign up</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
