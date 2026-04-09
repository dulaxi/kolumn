import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import '@fontsource-variable/plus-jakarta-sans'
import {
  ArrowRight, Columns3, Users, Zap, Calendar, StickyNote,
  Share2, BarChart3, GripVertical, Tag, CheckSquare, Clock,
  Shield, Sparkles, MousePointerClick, ArrowUpRight,
  Check, Square, AlignLeft, User, Plus, FileText, CheckCircle2,
  LayoutDashboard, Settings, ChevronsRight, SquareKanban, Kanban as LucideKanban,
  ChevronLeft, ChevronRight, Hash,
} from 'lucide-react'
import { SiGmail } from 'react-icons/si'
import { BsSlack, BsMicrosoftTeams } from 'react-icons/bs'
import {
  Kanban, Browser, Tag as PhosphorTag, CreditCard,
  ShoppingCart, ShieldCheck, Gauge,
  TrendUp, ChartPie, Target,
} from '@phosphor-icons/react'
import {
  DndContext, DragOverlay, pointerWithin, rectIntersection,
  PointerSensor, useSensor, useSensors, useDroppable,
} from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import SortableCard from '../components/board/SortableCard'
import Card from '../components/board/Card'
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
        <h3 className="text-sm font-bold text-[#1B1B18] leading-snug" style={{ fontFamily: 'var(--font-logo)' }}>{card.title}</h3>
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

/* ── "Every detail" section: Granola-style two-window animation ──
   Left window types out draft notes. Right window mirrors the text, fades it
   line-by-line bottom-to-top, then reveals AI-generated cards top-to-bottom. */

const DRAFT_TITLE = 'launch landing page'
const DRAFT_STATIC_LINE = 'for next week'
const DRAFT_LINES = [
  'redo hero',
  '3 pricing tiers $9 $29 $99',
  'stripe integration b4 fri',
]

const CHAR_DURATION = 45
const LINE_PAUSE = 380
const ANIM_START = 600

function computeLineStarts() {
  const starts = []
  let cursor = ANIM_START
  for (const line of DRAFT_LINES) {
    starts.push(cursor)
    cursor += line.length * CHAR_DURATION + LINE_PAUSE
  }
  const lastLine = DRAFT_LINES[DRAFT_LINES.length - 1]
  const typingEnd = starts[starts.length - 1] + lastLine.length * CHAR_DURATION
  return { starts, typingEnd }
}
const { starts: LINE_STARTS, typingEnd: LEFT_TYPING_END } = computeLineStarts()

// Real LABEL_BG colors from src/utils/formatting.js
const LANDING_LABEL_BG = {
  red:    { bg: '#F2D9C7', text: '#8B5A33' },
  blue:   { bg: '#DAE0F0', text: '#4A5578' },
  green:  { bg: '#EEF2D6', text: '#6B7A12' },
  yellow: { bg: '#F5EDCF', text: '#8B7322' },
  purple: { bg: '#E8DDE2', text: '#6E5A65' },
  pink:   { bg: '#F0E0D2', text: '#7A5C44' },
  gray:   { bg: '#E8E2DB', text: '#5C5C57' },
}
const LANDING_PRIORITY_DOT = { high: '#C27A4A', medium: '#D4A843', low: '#A8BA32' }

const AI_CARDS = [
  {
    taskNumber: 24,
    title: 'Redo hero section',
    description: 'Sarah feedback — current hero feels too plain',
    labels: [{ text: 'Frontend', color: 'blue' }],
    priority: 'high',
    dueDate: null,
    checklist: null,
    assignee: 'A',
    icon: 'browser',
  },
  {
    taskNumber: 25,
    title: 'Build pricing page',
    description: 'Three-tier plan with monthly/annual toggle',
    labels: [{ text: 'Frontend', color: 'blue' }],
    priority: 'medium',
    dueDate: null,
    checklist: { done: 0, total: 3 },
    assignee: null,
    icon: 'tag',
  },
  {
    taskNumber: 26,
    title: 'Stripe integration',
    description: 'Checkout, webhooks, customer portal',
    labels: [{ text: 'Backend', color: 'green' }],
    priority: 'high',
    dueDate: 'Fri',
    checklist: null,
    assignee: 'M',
    icon: 'credit-card',
  },
]

// Slack thread demo — mirrors slack-thread-demo.html exactly.
const SLACK_MESSAGES = [
  {
    sender: 'Dula',
    timestamp: '2:14 PM',
    text: '@rhea hero section feels plain — sarah flagged it on the call, can you redo it? high prio',
    mentions: ['@rhea'],
  },
  {
    sender: 'Dula',
    timestamp: '2:15 PM',
    text: "also pricing page needs building — 3 tiers with monthly/annual toggle, founder's call",
    mentions: [],
  },
  {
    sender: 'Dula',
    timestamp: '2:16 PM',
    text: '@marcus stripe integration by fri — checkout, webhooks, customer portal. high prio, legal flagged it',
    mentions: ['@marcus'],
  },
]

// Master timeline phases
const TOTAL_MIRROR_LINES = 2 + DRAFT_LINES.length
const MIRROR_GAP = 150
const MIRROR_START = LEFT_TYPING_END + MIRROR_GAP
const MIRROR_FADE_IN_DUR = 250
const MIRROR_FULL = MIRROR_START + MIRROR_FADE_IN_DUR
const MIRROR_HOLD_DUR = 600
const MIRROR_FADE_LINES_START = MIRROR_FULL + MIRROR_HOLD_DUR
const MIRROR_LINE_FADE_DUR = 180
const MIRROR_LINE_STAGGER = 90
const MIRROR_FADE_LINES_END = MIRROR_FADE_LINES_START + (TOTAL_MIRROR_LINES - 1) * MIRROR_LINE_STAGGER + MIRROR_LINE_FADE_DUR
const CARDS_GAP = 250
const CARDS_START = MIRROR_FADE_LINES_END + CARDS_GAP
const CARD_SWEEP = 750
const CARD_STAGGER = 600
const CARDS_END = CARDS_START + (AI_CARDS.length - 1) * CARD_STAGGER + CARD_SWEEP
const FINAL_HOLD = 2200
const TIMELINE_TOTAL = CARDS_END + FINAL_HOLD

// Slack demo timeline — mirrors slack-thread-demo.html exactly.
// Messages pop in with easeOutBack scale, carry-over cards stay visible.
const SLACK_LOOP_CARRY = 300
const SLACK_MSG_LAND_DUR = 220
const SLACK_MSG_GAP = 350
const SLACK_MSG_1_START = SLACK_LOOP_CARRY
const SLACK_MSG_1_END = SLACK_MSG_1_START + SLACK_MSG_LAND_DUR
const SLACK_MSG_2_START = SLACK_MSG_1_END + SLACK_MSG_GAP
const SLACK_MSG_2_END = SLACK_MSG_2_START + SLACK_MSG_LAND_DUR
const SLACK_MSG_3_START = SLACK_MSG_2_END + SLACK_MSG_GAP
const SLACK_MSG_3_END = SLACK_MSG_3_START + SLACK_MSG_LAND_DUR
const SLACK_CARDS_GAP = 400
const SLACK_CARDS_START = SLACK_MSG_3_END + SLACK_CARDS_GAP
const SLACK_CARD_SWEEP = 750
const SLACK_CARD_STAGGER = 600
const SLACK_CARDS_END = SLACK_CARDS_START + (AI_CARDS.length - 1) * SLACK_CARD_STAGGER + SLACK_CARD_SWEEP
const SLACK_HOLD_DUR = 1800
const SLACK_MSG_FADE_OUT_DUR = 400
const SLACK_MSG_FADE_OUT_START = SLACK_CARDS_END + SLACK_HOLD_DUR
const SLACK_FINAL_HOLD = SLACK_HOLD_DUR + SLACK_MSG_FADE_OUT_DUR
const SLACK_TIMELINE_TOTAL = SLACK_CARDS_END + SLACK_FINAL_HOLD

function computeMirrorLayerOpacity(elapsed) {
  if (elapsed < MIRROR_START) return 0
  if (elapsed < MIRROR_FULL) return (elapsed - MIRROR_START) / MIRROR_FADE_IN_DUR
  if (elapsed < MIRROR_FADE_LINES_END) return 1
  return 0
}
function computeMirrorLineOpacity(elapsed, lineIdx) {
  if (elapsed < MIRROR_FADE_LINES_START) return 1
  const fadeOrderIdx = (TOTAL_MIRROR_LINES - 1) - lineIdx
  const lineFadeStart = MIRROR_FADE_LINES_START + fadeOrderIdx * MIRROR_LINE_STAGGER
  if (elapsed < lineFadeStart) return 1
  return Math.max(0, 1 - (elapsed - lineFadeStart) / MIRROR_LINE_FADE_DUR)
}
function computeCardsLayerOpacity(elapsed) {
  if (elapsed < MIRROR_START) return 1
  if (elapsed < CARDS_START) return 0
  return 1
}
function computeCardState(elapsed, cardIdx) {
  const cardShowStart = CARDS_START + cardIdx * CARD_STAGGER
  if (elapsed < MIRROR_START) return { opacity: 1, sweepProgress: 1 }
  if (elapsed < cardShowStart) return { opacity: 0, sweepProgress: 0 }
  const cardElapsed = elapsed - cardShowStart
  return { opacity: 1, sweepProgress: Math.min(1, cardElapsed / CARD_SWEEP) }
}

// easeOutBack — overshoots 1.0 slightly then settles (chat bubble pop)
function easeOutBack(t) {
  const c1 = 1.70158
  const c3 = c1 + 1
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2)
}

function computeSlackMessageState(elapsed, msgIdx) {
  const starts = [SLACK_MSG_1_START, SLACK_MSG_2_START, SLACK_MSG_3_START]
  const msgStart = starts[msgIdx]

  // Fade-out phase near end of timeline
  if (elapsed >= SLACK_MSG_FADE_OUT_START) {
    const fadeElapsed = elapsed - SLACK_MSG_FADE_OUT_START
    const t = Math.min(1, fadeElapsed / SLACK_MSG_FADE_OUT_DUR)
    return { opacity: 1 - t, scale: 1 }
  }

  // Hidden before this message's turn
  if (elapsed < msgStart) return { opacity: 0, scale: 0.75 }

  // Landing phase: easeOutBack scale pop
  const msgElapsed = elapsed - msgStart
  if (msgElapsed < SLACK_MSG_LAND_DUR) {
    const linearT = msgElapsed / SLACK_MSG_LAND_DUR
    const opacity = Math.min(1, linearT * 4)
    const scale = 0.75 + (easeOutBack(linearT) * 0.25)
    return { opacity, scale }
  }

  return { opacity: 1, scale: 1 }
}

function computeSlackCardsLayerOpacity() {
  return 1
}

// Carry-over: previous cycle's cards stay visible through message phase
function computeSlackCardState(elapsed, cardIdx) {
  if (elapsed < SLACK_MSG_3_END) return { opacity: 1, sweepProgress: 1 }
  const cardShowStart = SLACK_CARDS_START + cardIdx * SLACK_CARD_STAGGER
  if (elapsed < cardShowStart) return { opacity: 0, sweepProgress: 0 }
  const cardElapsed = elapsed - cardShowStart
  return { opacity: 1, sweepProgress: Math.min(1, cardElapsed / SLACK_CARD_SWEEP) }
}

const PHOSPHOR_ICON_MAP = { 'browser': Browser, 'tag': PhosphorTag, 'credit-card': CreditCard }
const TEAMS_PHOSPHOR_ICON_MAP = { 'shopping-cart': ShoppingCart, 'shield-check': ShieldCheck, 'gauge': Gauge }
const GMAIL_PHOSPHOR_ICON_MAP = { 'trend-up': TrendUp, 'chart-pie': ChartPie, 'target': Target }

/* ── Teams Thread Demo data ── */
const TEAMS_MESSAGES = [
  {
    sender: 'Dula',
    initial: 'D',
    avatarBg: '#4B53BF',
    timestamp: '9:12 AM',
    text: 'Standup update — checkout redesign is in good shape. Cart drawer and order summary shipped to preview. Working on the payment step now, should have a full preview link by EOD.',
    mentions: [],
  },
  {
    sender: 'Jamie',
    initial: 'J',
    avatarBg: '#038387',
    timestamp: '9:14 AM',
    text: "On my side — auth service JWT migration is roughly 70% there. Refresh token rotation is working locally, sessions holding across reloads. Just need to swap the mobile endpoints and we're done.",
    mentions: [],
  },
  {
    sender: 'Aaron',
    initial: 'A',
    avatarBg: '#CA5010',
    timestamp: '9:16 AM',
    text: 'Search performance work is paying off — P99 dropped from 800ms to 220ms after the index rebuild. Pushing to staging tomorrow to verify before prod.',
    mentions: [],
  },
]

const TEAMS_AI_CARDS = [
  {
    taskNumber: 42,
    title: 'Checkout redesign',
    description: 'Cart + summary shipped, payment step in progress',
    labels: [{ text: 'Frontend', color: 'blue' }],
    priority: 'high',
    dueDate: 'EOD',
    checklist: { done: 2, total: 3 },
    assignee: 'D',
    icon: 'shopping-cart',
  },
  {
    taskNumber: 43,
    title: 'Auth JWT migration',
    description: 'Refresh rotation working, mobile swap pending',
    labels: [{ text: 'Backend', color: 'green' }],
    priority: 'high',
    dueDate: null,
    checklist: { done: 3, total: 4 },
    assignee: 'J',
    icon: 'shield-check',
  },
  {
    taskNumber: 44,
    title: 'Search performance',
    description: 'P99 800ms → 220ms after index rebuild',
    labels: [{ text: 'Perf', color: 'purple' }],
    priority: 'medium',
    dueDate: null,
    checklist: null,
    assignee: 'A',
    icon: 'gauge',
  },
]

// Teams timeline — shake variant
const TEAMS_SHAKE_START = 300
const TEAMS_SHAKE_STAGGER = 550
const TEAMS_SHAKE_DUR = 450
const TEAMS_SHAKE_LAST_END = TEAMS_SHAKE_START + (TEAMS_MESSAGES.length - 1) * TEAMS_SHAKE_STAGGER + TEAMS_SHAKE_DUR
const TEAMS_CARDS_GAP = 400
const TEAMS_CARDS_START = TEAMS_SHAKE_LAST_END + TEAMS_CARDS_GAP
const TEAMS_CARD_SWEEP = 750
const TEAMS_CARD_STAGGER = 600
const TEAMS_CARDS_END = TEAMS_CARDS_START + (TEAMS_AI_CARDS.length - 1) * TEAMS_CARD_STAGGER + TEAMS_CARD_SWEEP
const TEAMS_HOLD_DUR = 2000
const TEAMS_TIMELINE_TOTAL = TEAMS_CARDS_END + TEAMS_HOLD_DUR

function computeTeamsMessageShake(elapsed, msgIdx) {
  const shakeStart = TEAMS_SHAKE_START + msgIdx * TEAMS_SHAKE_STAGGER
  if (elapsed < shakeStart) return 0
  const t = elapsed - shakeStart
  if (t >= TEAMS_SHAKE_DUR) return 0
  const progress = t / TEAMS_SHAKE_DUR
  const amplitude = 4 * (1 - progress)
  return amplitude * Math.sin(progress * Math.PI * 4)
}

function computeTeamsCardState(elapsed, cardIdx) {
  if (elapsed < TEAMS_CARDS_START) return { opacity: 1, sweepProgress: 1 }
  const cardShowStart = TEAMS_CARDS_START + cardIdx * TEAMS_CARD_STAGGER
  if (elapsed < cardShowStart) return { opacity: 0, sweepProgress: 0 }
  const cardElapsed = elapsed - cardShowStart
  return { opacity: 1, sweepProgress: Math.min(1, cardElapsed / TEAMS_CARD_SWEEP) }
}

/* ── Gmail Thread Demo data ── */
const GMAIL_PARAGRAPH = {
  text: "Board meeting tomorrow AM and the deck is missing a few things. Can @jamie pull the MRR chart for the last 6 months, stacked by segment? @aaron — draft the churn analysis slide. And we still need a competitive landscape section: 3 logos and positioning bullets. All by tonight, high prio.",
  mentions: ['@jamie', '@aaron'],
  highlights: [
    '@jamie pull the MRR chart',
    '@aaron — draft the churn analysis slide',
    'competitive landscape section',
  ],
}

const GMAIL_AI_CARDS = [
  {
    taskNumber: 27,
    title: 'Pull MRR chart',
    description: '6 months, stacked by segment',
    labels: [{ text: 'Analytics', color: 'blue' }],
    priority: 'high',
    dueDate: 'Tonight',
    checklist: null,
    assignee: 'J',
    icon: 'trend-up',
  },
  {
    taskNumber: 28,
    title: 'Draft churn slide',
    description: 'For tomorrow\u2019s board deck',
    labels: [{ text: 'Analytics', color: 'blue' }],
    priority: 'high',
    dueDate: 'Tonight',
    checklist: null,
    assignee: 'A',
    icon: 'chart-pie',
  },
  {
    taskNumber: 29,
    title: 'Competitive landscape',
    description: '3 logos + positioning bullets',
    labels: [{ text: 'Strategy', color: 'purple' }],
    priority: 'medium',
    dueDate: 'Tonight',
    checklist: null,
    assignee: null,
    icon: 'target',
  },
]

// Gmail timeline — highlight-scan variant
const GMAIL_SCAN_START = 300
const GMAIL_SCAN_FADE_IN = 220
const GMAIL_SCAN_STAGGER = 500
const GMAIL_SCAN_ALL_DONE = GMAIL_SCAN_START + 2 * GMAIL_SCAN_STAGGER + GMAIL_SCAN_FADE_IN
const GMAIL_CARDS_GAP = 400
const GMAIL_CARDS_START = GMAIL_SCAN_ALL_DONE + GMAIL_CARDS_GAP
const GMAIL_CARD_SWEEP = 750
const GMAIL_CARD_STAGGER = 600
const GMAIL_CARDS_END = GMAIL_CARDS_START + (GMAIL_AI_CARDS.length - 1) * GMAIL_CARD_STAGGER + GMAIL_CARD_SWEEP
const GMAIL_HOLD_DUR = 2000
const GMAIL_TIMELINE_TOTAL = GMAIL_CARDS_END + GMAIL_HOLD_DUR

function computeGmailScanHighlight(elapsed, idx) {
  const startAt = GMAIL_SCAN_START + idx * GMAIL_SCAN_STAGGER
  if (elapsed < startAt) return 0
  const t = elapsed - startAt
  if (t < GMAIL_SCAN_FADE_IN) return t / GMAIL_SCAN_FADE_IN
  return 1
}

function computeGmailCardState(elapsed, cardIdx) {
  if (elapsed < GMAIL_CARDS_START) return { opacity: 1, sweepProgress: 1 }
  const cardShowStart = GMAIL_CARDS_START + cardIdx * GMAIL_CARD_STAGGER
  if (elapsed < cardShowStart) return { opacity: 0, sweepProgress: 0 }
  const cardElapsed = elapsed - cardShowStart
  return { opacity: 1, sweepProgress: Math.min(1, cardElapsed / GMAIL_CARD_SWEEP) }
}

function BrowserChrome() {
  return (
    <div className="flex items-center gap-1.5 px-3 py-2.5 shrink-0">
      <span className="w-2.5 h-2.5 rounded-full bg-[#FF5F57]" />
      <span className="w-2.5 h-2.5 rounded-full bg-[#FEBC2E]" />
      <span className="w-2.5 h-2.5 rounded-full bg-[#28C840]" />
    </div>
  )
}

function CreamWindow({ className = '', children }) {
  return (
    <div
      className={`flex-1 rounded-lg overflow-hidden flex flex-col bg-[#FAF8F6] border border-[#E0DBD5] ${className}`}
      style={{ boxShadow: '0 8px 24px -8px rgba(27, 27, 24, 0.10)' }}
    >
      <BrowserChrome />
      <div className="flex-1 overflow-hidden relative">{children}</div>
    </div>
  )
}

function DraftNotes({ elapsed }) {
  const typed = (text, startTime) => {
    if (elapsed < startTime) return ''
    const chars = Math.floor((elapsed - startTime) / CHAR_DURATION)
    return text.slice(0, Math.min(chars, text.length))
  }
  const linesTyped = DRAFT_LINES.map((line, i) => typed(line, LINE_STARTS[i]))
  let cursorLineIdx = -1
  const typingDone = elapsed >= LEFT_TYPING_END
  if (!typingDone) {
    for (let i = 0; i < linesTyped.length; i++) {
      if (linesTyped[i].length > 0) cursorLineIdx = i
    }
  }
  return (
    <div className="px-6 sm:px-8 pt-5 sm:pt-6 flex flex-col gap-3 select-none">
      <h3
        className="text-lg sm:text-xl text-[#1B1B18] tracking-tight leading-tight"
        style={{ fontFamily: 'Sentient, Georgia, serif', fontWeight: 400 }}
      >
        {DRAFT_TITLE}
      </h3>
      <div className="flex flex-col gap-1.5 text-xs sm:text-sm text-[#5C5C57] font-sans">
        <p className="leading-snug">{DRAFT_STATIC_LINE}</p>
        {linesTyped.map((text, i) => {
          if (!text) return null
          return (
            <p key={i} className="leading-snug">
              {text}
              {cursorLineIdx === i && (
                <span
                  className="inline-block align-middle ml-px"
                  style={{ width: '2px', height: '1.1em', backgroundColor: '#A8BA32', animation: 'blink 1s steps(2) infinite' }}
                />
              )}
            </p>
          )
        })}
      </div>
    </div>
  )
}

function MirrorNotes({ lineOpacities }) {
  return (
    <div className="px-6 sm:px-8 pt-5 sm:pt-6 flex flex-col gap-3 select-none">
      <h3
        className="text-lg sm:text-xl text-[#1B1B18] tracking-tight leading-tight"
        style={{ fontFamily: 'Sentient, Georgia, serif', fontWeight: 400, opacity: lineOpacities[0] }}
      >
        {DRAFT_TITLE}
      </h3>
      <div className="flex flex-col gap-1.5 text-xs sm:text-sm text-[#5C5C57] font-sans">
        <p className="leading-snug" style={{ opacity: lineOpacities[1] }}>{DRAFT_STATIC_LINE}</p>
        {DRAFT_LINES.map((line, i) => (
          <p key={i} className="leading-snug" style={{ opacity: lineOpacities[2 + i] }}>{line}</p>
        ))}
      </div>
    </div>
  )
}

function AICard({ card, opacity, sweepProgress, iconMap }) {
  const dotColor = LANDING_PRIORITY_DOT[card.priority]
  const labelStyles = card.labels.map((l) => LANDING_LABEL_BG[l.color])
  const revealVar = `${sweepProgress * 124 - 12}%`
  const PhosphorIcon = (iconMap || PHOSPHOR_ICON_MAP)[card.icon]
  return (
    <div
      className="relative overflow-hidden w-full rounded-xl border shadow-sm flex bg-white border-[#E0DBD5]"
      style={{ opacity }}
    >
      <div className="flex items-center pl-3 shrink-0">
        <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-[#E8E2DB] text-[#8E8E89]">
          {PhosphorIcon && <PhosphorIcon size={16} weight="regular" />}
        </div>
      </div>
      <div className="flex-1 min-w-0 pl-2.5 pr-3.5 py-3">
        {card.labels.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-2">
            {card.labels.map((label, idx) => (
              <span
                key={label.text}
                className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                style={{ backgroundColor: labelStyles[idx].bg, color: labelStyles[idx].text }}
              >
                {label.text}
              </span>
            ))}
          </div>
        )}
        <div className="flex items-center gap-1.5 mb-0.5">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-[#8E8E89]" />
          <span className="text-[11px] font-medium text-[#5C5C57]">Task #{card.taskNumber}</span>
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: dotColor }} />
        </div>
        <p
          className="text-[13px] font-medium leading-snug ai-shimmer-reveal"
          style={{ '--reveal': revealVar }}
        >
          {card.title}
        </p>
        {card.description && (
          <p
            className="text-[12px] leading-relaxed mt-1 line-clamp-2 ai-shimmer-reveal"
            style={{ '--reveal': revealVar }}
          >
            {card.description}
          </p>
        )}
        <div className="flex items-center justify-between gap-2 mt-2.5">
          <div className="flex flex-wrap items-center gap-1.5 min-w-0">
            {card.dueDate && (
              <span className="text-[10px] font-medium flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#EEF2D6] text-[#A8BA32]">
                <Calendar className="w-3 h-3" />
                {card.dueDate}
              </span>
            )}
            {card.checklist && (
              <span className="text-[10px] font-medium flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#E8E2DB] text-[#8E8E89]">
                <CheckSquare className="w-3 h-3" />
                {card.checklist.done}/{card.checklist.total}
              </span>
            )}
            {card.description && (
              <span className="text-[10px] flex items-center text-[#8E8E89]">
                <AlignLeft className="w-3 h-3" />
              </span>
            )}
          </div>
          {card.assignee && (
            <span className="w-6 h-6 rounded-full shrink-0 flex items-center justify-center text-[10px] font-bold text-white bg-[#1B1B18]">
              {card.assignee}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

function AIGeneratedCards({ cardStates }) {
  return (
    <div className="pt-5 px-4 flex justify-center select-none">
      <div className="flex flex-col w-full max-w-[290px]">
        <div className="flex items-baseline gap-2 px-0.5 pb-3">
          <h3 className="text-sm font-semibold text-[#1B1B18]">to do</h3>
          <span className="text-xs text-[#8E8E89]">{AI_CARDS.length}</span>
        </div>
        <div className="flex flex-col gap-2">
          {AI_CARDS.map((card, idx) => (
            <AICard
              key={card.taskNumber}
              card={card}
              opacity={cardStates[idx].opacity}
              sweepProgress={cardStates[idx].sweepProgress}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

function RightContent({ elapsed }) {
  const mirrorLayerOpacity = computeMirrorLayerOpacity(elapsed)
  const lineOpacities = Array.from({ length: TOTAL_MIRROR_LINES }, (_, idx) => computeMirrorLineOpacity(elapsed, idx))
  const cardsLayerOpacity = computeCardsLayerOpacity(elapsed)
  const cardStates = AI_CARDS.map((_, idx) => computeCardState(elapsed, idx))
  return (
    <>
      <div className="absolute inset-0 pointer-events-none" style={{ opacity: cardsLayerOpacity }}>
        <AIGeneratedCards cardStates={cardStates} />
      </div>
      <div className="absolute inset-0 pointer-events-none" style={{ opacity: mirrorLayerOpacity }}>
        <MirrorNotes lineOpacities={lineOpacities} />
      </div>
    </>
  )
}

function EveryDetailDemo({ active = true }) {
  const [elapsed, setElapsed] = useState(0)
  useEffect(() => {
    if (!active) return
    const id = setInterval(() => {
      setElapsed((prev) => (prev + 50 >= TIMELINE_TOTAL ? 0 : prev + 50))
    }, 50)
    return () => clearInterval(id)
  }, [active])
  return (
    <div className="w-full max-w-5xl">
      <div
        className="relative overflow-hidden w-full rounded-2xl bg-[#E8DDE2]"
        style={{ boxShadow: 'inset 0 0 0 1px #E0DBD5' }}
      >
        <div className="flex flex-col md:flex-row md:items-center gap-4 md:gap-6 p-4 md:p-8">
          <CreamWindow className="aspect-[4/3] md:aspect-[4/4.5]">
            <DraftNotes elapsed={elapsed} />
          </CreamWindow>
          <CreamWindow className="aspect-[4/5]">
            <RightContent elapsed={elapsed} />
          </CreamWindow>
        </div>
      </div>
    </div>
  )
}

/* ── Slack Thread Demo ── */

// Renders message text with @mentions wrapped in an accent-colored span
function renderMessageText(text, mentions) {
  if (!mentions || mentions.length === 0) return text
  // Build a regex that matches any of the mentions literally
  const escaped = mentions.map((m) => m.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
  const regex = new RegExp(`(${escaped.join('|')})`, 'g')
  const parts = text.split(regex)
  return parts.map((part, idx) =>
    mentions.includes(part)
      ? <span key={idx} className="text-[#8BA32E] font-medium">{part}</span>
      : <span key={idx}>{part}</span>
  )
}

// Slack brand mark — 4-color windmill SVG, used as the avatar to make
// the demo feel like a real Slack message rather than a generic chat
function SlackLogo({ className = '' }) {
  return (
    <svg viewBox="0 0 270 270" className={className} xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="m99.4 151.2c0 7.1-5.8 12.9-12.9 12.9-7.1 0-12.9-5.8-12.9-12.9 0-7.1 5.8-12.9 12.9-12.9h12.9zm6.5 0c0-7.1 5.8-12.9 12.9-12.9 7.1 0 12.9 5.8 12.9 12.9v32.3c0 7.1-5.8 12.9-12.9 12.9-7.1 0-12.9-5.8-12.9-12.9z" fill="#E01E5A"/>
      <path d="m118.8 99.4c-7.1 0-12.9-5.8-12.9-12.9 0-7.1 5.8-12.9 12.9-12.9 7.1 0 12.9 5.8 12.9 12.9v12.9zm0 6.5c7.1 0 12.9 5.8 12.9 12.9 0 7.1-5.8 12.9-12.9 12.9h-32.3c-7.1 0-12.9-5.8-12.9-12.9 0-7.1 5.8-12.9 12.9-12.9z" fill="#36C5F0"/>
      <path d="m170.6 118.8c0-7.1 5.8-12.9 12.9-12.9 7.1 0 12.9 5.8 12.9 12.9 0 7.1-5.8 12.9-12.9 12.9h-12.9zm-6.5 0c0 7.1-5.8 12.9-12.9 12.9-7.1 0-12.9-5.8-12.9-12.9v-32.3c0-7.1 5.8-12.9 12.9-12.9 7.1 0 12.9 5.8 12.9 12.9z" fill="#2EB67D"/>
      <path d="m151.2 170.6c7.1 0 12.9 5.8 12.9 12.9 0 7.1-5.8 12.9-12.9 12.9-7.1 0-12.9-5.8-12.9-12.9v-12.9zm0-6.5c-7.1 0-12.9-5.8-12.9-12.9 0-7.1 5.8-12.9 12.9-12.9h32.3c7.1 0 12.9 5.8 12.9 12.9 0 7.1-5.8 12.9-12.9 12.9z" fill="#ECB22E"/>
    </svg>
  )
}

function SlackThread({ elapsed }) {
  const messageStates = SLACK_MESSAGES.map((_, idx) => computeSlackMessageState(elapsed, idx))
  return (
    <div className="px-5 sm:px-6 pt-4 sm:pt-5 flex flex-col gap-2 select-none h-full">
      {/* Channel header — Slack 2024: channel name + topic subtitle */}
      <div className="pb-2 border-b border-[#E8E8E8]">
        <div className="flex items-center gap-1.5">
          <Hash className="w-3.5 h-3.5 text-[#616061]" />
          <span className="text-[13px] font-bold text-[#1D1C1D]">launch-prep</span>
          <svg className="w-2.5 h-2.5 text-[#616061] ml-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="6 9 12 15 18 9"/></svg>
        </div>
        <p className="text-[10px] text-[#616061] ml-[19px] mt-0.5 truncate">Sprint prep, blockers, and launch readiness</p>
      </div>

      {/* Messages — grouped continuation for same sender */}
      <div className="flex flex-col gap-3 pt-1">
        {SLACK_MESSAGES.map((msg, idx) => {
          const state = messageStates[idx]
          const isGrouped = idx > 0 && SLACK_MESSAGES[idx - 1].sender === msg.sender
          return (
            <div
              key={idx}
              className={`flex gap-2.5 ${isGrouped ? '-mt-2' : ''}`}
              style={{
                opacity: state.opacity,
                transform: `scale(${state.scale})`,
                transformOrigin: 'left center',
              }}
            >
              {isGrouped ? (
                <div className="w-7 shrink-0" />
              ) : (
                <div className="w-7 h-7 rounded-md shrink-0 flex items-center justify-center bg-white border border-[#E0DBD5] p-1">
                  <SlackLogo className="w-full h-full" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                {!isGrouped && (
                  <div className="flex items-baseline gap-2 mb-0.5">
                    <span className="text-[13px] font-bold text-[#1D1C1D]">{msg.sender}</span>
                    <span className="text-[10px] text-[#616061]">{msg.timestamp}</span>
                  </div>
                )}
                <p className="text-[12px] text-[#1D1C1D] leading-relaxed break-words">
                  {renderMessageText(msg.text, msg.mentions)}
                </p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function SlackExtractedCards({ elapsed }) {
  const cardStates = AI_CARDS.map((_, idx) => computeSlackCardState(elapsed, idx))
  return (
    <div className="absolute inset-0 pointer-events-none">
      <div className="pt-5 px-4 flex justify-center select-none">
        <div className="flex flex-col w-full max-w-[290px]">
          <div className="flex items-baseline gap-2 px-0.5 pb-3">
            <h3 className="text-sm font-semibold text-[#1B1B18]">to do</h3>
            <span className="text-xs text-[#8E8E89]">{AI_CARDS.length}</span>
          </div>
          <div className="flex flex-col gap-2">
            {AI_CARDS.map((card, idx) => (
              <AICard
                key={card.taskNumber}
                card={card}
                opacity={cardStates[idx].opacity}
                sweepProgress={cardStates[idx].sweepProgress}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function SlackChrome() {
  return (
    <div className="flex items-center gap-1.5 px-3 py-2.5 shrink-0 bg-[#3F0E40]">
      <span className="w-2.5 h-2.5 rounded-full bg-[#FF5F57]" />
      <span className="w-2.5 h-2.5 rounded-full bg-[#FEBC2E]" />
      <span className="w-2.5 h-2.5 rounded-full bg-[#28C840]" />
      <div className="flex items-center gap-1.5 ml-3">
        <SlackLogo className="w-4 h-4" />
        <span className="text-[11px] font-semibold text-white/90 tracking-tight">Slack</span>
      </div>
    </div>
  )
}

function SlackThreadDemo({ active = true }) {
  const [elapsed, setElapsed] = useState(0)
  useEffect(() => {
    if (!active) return
    setElapsed(0)
    const id = setInterval(() => {
      setElapsed((prev) => (prev + 50 >= SLACK_TIMELINE_TOTAL ? 0 : prev + 50))
    }, 50)
    return () => clearInterval(id)
  }, [active])
  return (
    <div className="w-full max-w-5xl">
      <div
        className="relative overflow-hidden w-full rounded-2xl bg-[#E8DDE2]"
        style={{ boxShadow: 'inset 0 0 0 1px #E0DBD5' }}
      >
        <div className="flex flex-col md:flex-row md:items-center gap-4 md:gap-6 p-4 md:p-8">
          <div
            className="flex-1 rounded-lg overflow-hidden flex flex-col bg-[#FAF8F6] border border-[#E0DBD5] aspect-[4/3] md:aspect-[4/4.5]"
            style={{ boxShadow: '0 8px 24px -8px rgba(27, 27, 24, 0.10)' }}
          >
            <SlackChrome />
            <div className="flex-1 overflow-hidden relative">
              <SlackThread elapsed={elapsed} />
            </div>
          </div>
          <CreamWindow className="aspect-[4/5]">
            <SlackExtractedCards elapsed={elapsed} />
          </CreamWindow>
        </div>
      </div>
    </div>
  )
}

/* ── Teams Thread Demo ── */

function TeamsThread({ elapsed }) {
  return (
    <div className="px-5 sm:px-6 pt-4 sm:pt-5 flex flex-col gap-2 select-none h-full">
      {/* Channel header — Teams style: team tile + Posts/Files tabs */}
      <div className="pb-1 border-b border-[#E8E8E8]">
        <div className="flex items-center gap-2">
          <span className="w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold text-white bg-[#6264A7] shrink-0">N</span>
          <span className="text-[13px] font-bold text-[#252423]">Launch prep</span>
        </div>
        <div className="flex items-center gap-4 mt-1.5 ml-[26px]">
          <span className="text-[11px] font-semibold text-[#252423] border-b-2 border-[#5B5FC7] pb-0.5">Posts</span>
          <span className="text-[11px] text-[#616061] pb-0.5">Files</span>
          <span className="text-[11px] text-[#616061] pb-0.5">+</span>
        </div>
      </div>
      {/* Messages */}
      <div className="flex flex-col gap-3 pt-1">
        {TEAMS_MESSAGES.map((msg, idx) => {
          const shakeX = computeTeamsMessageShake(elapsed, idx)
          return (
            <div
              key={idx}
              className="flex gap-2.5"
              style={{ transform: `translateX(${shakeX}px)` }}
            >
              {/* Circular avatar with initial */}
              <div
                className="w-7 h-7 rounded-full shrink-0 flex items-center justify-center text-[11px] font-semibold text-white"
                style={{ backgroundColor: msg.avatarBg }}
              >
                {msg.initial}
              </div>
              {/* Message body */}
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2 mb-0.5">
                  <span className="text-[13px] font-bold text-[#252423]">{msg.sender}</span>
                  <span className="text-[10px] text-[#616061]">{msg.timestamp}</span>
                </div>
                <p className="text-[12px] text-[#252423] leading-relaxed break-words">{msg.text}</p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function TeamsExtractedCards({ elapsed }) {
  const cardStates = TEAMS_AI_CARDS.map((_, idx) => computeTeamsCardState(elapsed, idx))
  return (
    <div className="absolute inset-0 pointer-events-none">
      <div className="pt-5 px-4 flex justify-center select-none">
        <div className="flex flex-col w-full max-w-[290px]">
          <div className="flex items-baseline gap-2 px-0.5 pb-3">
            <h3 className="text-sm font-semibold text-[#1B1B18]">In Progress</h3>
            <span className="text-xs text-[#8E8E89]">{TEAMS_AI_CARDS.length}</span>
          </div>
          <div className="flex flex-col gap-2">
            {TEAMS_AI_CARDS.map((card, idx) => (
              <AICard
                key={card.taskNumber}
                card={card}
                opacity={cardStates[idx].opacity}
                sweepProgress={cardStates[idx].sweepProgress}
                iconMap={TEAMS_PHOSPHOR_ICON_MAP}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function TeamsChrome() {
  return (
    <div className="flex items-center gap-1.5 px-3 py-2.5 shrink-0 bg-[#464775]">
      <span className="w-2.5 h-2.5 rounded-full bg-[#FF5F57]" />
      <span className="w-2.5 h-2.5 rounded-full bg-[#FEBC2E]" />
      <span className="w-2.5 h-2.5 rounded-full bg-[#28C840]" />
      <div className="flex items-center gap-1.5 ml-3">
        <svg className="w-4 h-4" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <path d="M32 14h12a2 2 0 0 1 2 2v10a6 6 0 1 1-12 0V16a2 2 0 0 1 2-2z" fill="#5059C9"/>
          <circle cx="38" cy="8" r="4" fill="#5059C9"/>
          <path d="M22 14H4a2 2 0 0 0-2 2v16a10 10 0 1 0 20 0V16a2 2 0 0 0-2-2z" fill="#7B83EB"/>
          <circle cx="13" cy="8" r="4" fill="#7B83EB"/>
          <path d="M17 20H6v2.5h4.25v10h2.5v-10H17z" fill="#FFFFFF"/>
        </svg>
        <span className="text-[11px] font-semibold text-white/90 tracking-tight">Teams</span>
      </div>
    </div>
  )
}

function TeamsThreadDemo({ active = true }) {
  const [elapsed, setElapsed] = useState(0)
  useEffect(() => {
    if (!active) return
    setElapsed(0)
    const id = setInterval(() => {
      setElapsed((prev) => (prev + 50 >= TEAMS_TIMELINE_TOTAL ? 0 : prev + 50))
    }, 50)
    return () => clearInterval(id)
  }, [active])
  return (
    <div className="w-full max-w-5xl">
      <div
        className="relative overflow-hidden w-full rounded-2xl bg-[#E8DDE2]"
        style={{ boxShadow: 'inset 0 0 0 1px #E0DBD5' }}
      >
        <div className="flex flex-col md:flex-row md:items-center gap-4 md:gap-6 p-4 md:p-8">
          <div
            className="flex-1 rounded-lg overflow-hidden flex flex-col bg-[#FAF8F6] border border-[#E0DBD5] aspect-[4/3] md:aspect-[4/4.5]"
            style={{ boxShadow: '0 8px 24px -8px rgba(27, 27, 24, 0.10)' }}
          >
            <TeamsChrome />
            <div className="flex-1 overflow-hidden relative">
              <TeamsThread elapsed={elapsed} />
            </div>
          </div>
          <CreamWindow className="aspect-[4/5]">
            <TeamsExtractedCards elapsed={elapsed} />
          </CreamWindow>
        </div>
      </div>
    </div>
  )
}

/* ── Gmail Thread Demo ── */

function GmailEmailBody({ elapsed }) {
  const highlightAlphas = GMAIL_PARAGRAPH.highlights.map((_, idx) =>
    computeGmailScanHighlight(elapsed, idx)
  )

  // Build the paragraph with highlight spans and @mention styling
  const { text, mentions, highlights } = GMAIL_PARAGRAPH
  const escaped = highlights.map((s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
  const regex = new RegExp(`(${escaped.join('|')})`, 'g')
  const parts = text.split(regex)

  const renderedParts = parts.map((part, partIdx) => {
    const highlightIdx = highlights.indexOf(part)
    if (highlightIdx >= 0) {
      const alpha = highlightAlphas[highlightIdx]
      // Render mentions inside highlight spans
      const mentionEscaped = mentions.map((m) => m.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
      const mentionRegex = new RegExp(`(${mentionEscaped.join('|')})`, 'g')
      const innerParts = part.split(mentionRegex)
      return (
        <span
          key={partIdx}
          className="rounded-[3px] px-[2px]"
          style={{ backgroundColor: `rgba(200, 160, 200, ${alpha * 0.4})`, transition: 'background-color 30ms linear' }}
        >
          {innerParts.map((inner, iIdx) =>
            mentions.includes(inner)
              ? <span key={iIdx} className="text-[#8BA32E] font-medium">{inner}</span>
              : <span key={iIdx}>{inner}</span>
          )}
        </span>
      )
    }
    // Non-highlighted text — still render mentions
    if (!mentions.length) return <span key={partIdx}>{part}</span>
    const mentionEscaped = mentions.map((m) => m.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    const mentionRegex = new RegExp(`(${mentionEscaped.join('|')})`, 'g')
    const innerParts = part.split(mentionRegex)
    return (
      <span key={partIdx}>
        {innerParts.map((inner, iIdx) =>
          mentions.includes(inner)
            ? <span key={iIdx} className="text-[#8BA32E] font-medium">{inner}</span>
            : <span key={iIdx}>{inner}</span>
        )}
      </span>
    )
  })

  return (
    <div className="px-5 sm:px-6 pt-4 sm:pt-5 flex flex-col gap-3 select-none h-full">
      {/* Subject line */}
      <h3 className="text-[15px] font-normal text-[#202124] leading-tight font-logo">Board deck gaps — need tonight</h3>
      {/* Sender row */}
      <div className="flex items-start gap-2.5 pb-2 border-b border-[#E8E8E8]">
        <span className="w-7 h-7 rounded-full bg-[#1A73E8] shrink-0 flex items-center justify-center text-[11px] font-semibold text-white">S</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-1.5 flex-wrap">
            <span className="text-[12px] font-semibold text-[#202124]">Sam Okoye</span>
            <span className="text-[10px] text-[#5F6368]">&lt;sam@northstar.co&gt;</span>
            <span className="ml-auto text-[10px] text-[#5F6368]">4:42 PM</span>
          </div>
          <div className="text-[10px] text-[#5F6368]">to me, jamie, aaron</div>
        </div>
      </div>
      {/* Email body */}
      <div className="flex flex-col gap-2 text-[12px] text-[#202124] leading-relaxed">
        <p>Hey team,</p>
        <p className="leading-relaxed">{renderedParts}</p>
        <p className="text-[#5F6368]">— Sam</p>
      </div>
    </div>
  )
}

function GmailExtractedCards({ elapsed }) {
  const cardStates = GMAIL_AI_CARDS.map((_, idx) => computeGmailCardState(elapsed, idx))
  return (
    <div className="absolute inset-0 pointer-events-none">
      <div className="pt-5 px-4 flex justify-center select-none">
        <div className="flex flex-col w-full max-w-[290px]">
          <div className="flex items-baseline gap-2 px-0.5 pb-3">
            <h3 className="text-sm font-semibold text-[#1B1B18]">to do</h3>
            <span className="text-xs text-[#8E8E89]">{GMAIL_AI_CARDS.length}</span>
          </div>
          <div className="flex flex-col gap-2">
            {GMAIL_AI_CARDS.map((card, idx) => (
              <AICard
                key={card.taskNumber}
                card={card}
                opacity={cardStates[idx].opacity}
                sweepProgress={cardStates[idx].sweepProgress}
                iconMap={GMAIL_PHOSPHOR_ICON_MAP}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function GmailChrome() {
  return (
    <div className="flex items-center gap-1.5 px-3 py-2.5 shrink-0 bg-white border-b border-[#E8E8E8]">
      <span className="w-2.5 h-2.5 rounded-full bg-[#FF5F57]" />
      <span className="w-2.5 h-2.5 rounded-full bg-[#FEBC2E]" />
      <span className="w-2.5 h-2.5 rounded-full bg-[#28C840]" />
      <div className="flex items-center gap-1.5 ml-3">
        <svg className="w-4 h-3" viewBox="0 0 24 18" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <path d="M0 0 L0 18 L10 9 Z" fill="#EA4335"/>
          <path d="M24 0 L24 18 L14 9 Z" fill="#FBBC04"/>
          <path d="M0 18 L12 9 L24 18 Z" fill="#34A853"/>
          <path d="M0 0 L12 9 L24 0 Z" fill="#4285F4"/>
          <path d="M0 0 L12 9 L24 0 L24 2 L12 11 L0 2 Z" fill="#C5221F"/>
        </svg>
        <span className="text-[11px] font-semibold text-[#5F6368] tracking-tight font-logo">Gmail</span>
      </div>
      <div className="flex items-center gap-1.5 ml-auto">
        <span className="text-[10px] text-[#5F6368]">dula@northstar.co</span>
        <span className="w-4 h-4 rounded-full bg-[#EA4335] flex items-center justify-center text-[9px] font-bold text-white">D</span>
      </div>
    </div>
  )
}

function GmailThreadDemo({ active = true }) {
  const [elapsed, setElapsed] = useState(0)
  useEffect(() => {
    if (!active) return
    setElapsed(0)
    const id = setInterval(() => {
      setElapsed((prev) => (prev + 50 >= GMAIL_TIMELINE_TOTAL ? 0 : prev + 50))
    }, 50)
    return () => clearInterval(id)
  }, [active])
  return (
    <div className="w-full max-w-5xl">
      <div
        className="relative overflow-hidden w-full rounded-2xl bg-[#E8DDE2]"
        style={{ boxShadow: 'inset 0 0 0 1px #E0DBD5' }}
      >
        <div className="flex flex-col md:flex-row md:items-center gap-4 md:gap-6 p-4 md:p-8">
          <div
            className="flex-1 rounded-lg overflow-hidden flex flex-col bg-[#FAF8F6] border border-[#E0DBD5] aspect-[4/3] md:aspect-[4/4.5]"
            style={{ boxShadow: '0 8px 24px -8px rgba(27, 27, 24, 0.10)' }}
          >
            <GmailChrome />
            <div className="flex-1 overflow-hidden relative">
              <GmailEmailBody elapsed={elapsed} />
            </div>
          </div>
          <CreamWindow className="aspect-[4/5]">
            <GmailExtractedCards elapsed={elapsed} />
          </CreamWindow>
        </div>
      </div>
    </div>
  )
}

/* ── Demo Slider — cycles through the 4 demo canvases ── */
function AppleNotesIcon({ className = '' }) {
  return (
    <svg className={className} viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      {/* Rounded square body — white notepad */}
      <rect x="10" y="10" width="180" height="180" rx="38" fill="#F5F0E8"/>
      {/* Yellow top band */}
      <clipPath id="notes-clip"><rect x="10" y="10" width="180" height="180" rx="38"/></clipPath>
      <rect x="10" y="10" width="180" height="48" fill="#FDD835" clipPath="url(#notes-clip)"/>
      {/* Subtle yellow bottom edge of band */}
      <rect x="10" y="52" width="180" height="6" fill="#F5E273" clipPath="url(#notes-clip)"/>
      {/* Spiral binding dots along the band bottom */}
      {[40, 56, 72, 88, 104, 120, 136, 152, 168].map((cx) => (
        <circle key={cx} cx={cx} cy="58" r="3" fill="#D4CFC5"/>
      ))}
      {/* Ruled lines */}
      <line x1="36" y1="95" x2="164" y2="95" stroke="#D5D0C8" strokeWidth="1.5"/>
      <line x1="36" y1="125" x2="164" y2="125" stroke="#D5D0C8" strokeWidth="1.5"/>
      <line x1="36" y1="155" x2="164" y2="155" stroke="#D5D0C8" strokeWidth="1.5"/>
    </svg>
  )
}

const SLIDES = [
  { label: 'Notes', Icon: AppleNotesIcon, color: null },
  { label: 'Gmail', Icon: SiGmail, color: '#EA4335' },
  { label: 'Slack', Icon: BsSlack, color: '#4A154B' },
  { label: 'Teams', Icon: BsMicrosoftTeams, color: '#5059C9' },
]

function DemoSlider() {
  const [activeIdx, setActiveIdx] = useState(0)

  const prev = () => setActiveIdx((i) => (i === 0 ? SLIDES.length - 1 : i - 1))
  const next = () => setActiveIdx((i) => (i === SLIDES.length - 1 ? 0 : i + 1))

  return (
    <div className="w-full max-w-5xl mx-auto">
      {/* Brand icon tabs */}
      <div className="flex items-center justify-center gap-6 mb-6">
        {SLIDES.map((slide, idx) => (
          <button
            key={slide.label}
            onClick={() => setActiveIdx(idx)}
            className={`flex flex-col items-center gap-1.5 transition-all duration-200 ${
              idx === activeIdx
                ? 'opacity-100'
                : 'opacity-40 hover:opacity-70'
            }`}
          >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors duration-200 ${
              idx === activeIdx ? 'bg-[#8BA32E]' : 'bg-[#EEF2D6]'
            }`}>
              <slide.Icon
                className="w-5 h-5 transition-colors duration-200"
                style={{ color: idx === activeIdx ? '#fff' : slide.color || '#5C5C57' }}
              />
            </div>
            <span className={`text-[11px] font-medium transition-colors duration-200 ${
              idx === activeIdx ? 'text-[#1B1B18]' : 'text-[#8E8E89]'
            }`}>
              {slide.label}
            </span>
          </button>
        ))}
      </div>

      {/* Slide viewport */}
      <div className="relative overflow-hidden rounded-2xl">
        <div
          className="flex transition-transform duration-500 ease-[cubic-bezier(0.4,0,0.2,1)]"
          style={{ transform: `translateX(-${activeIdx * 100}%)` }}
        >
          <div className="w-full shrink-0"><EveryDetailDemo active={activeIdx === 0} /></div>
          <div className="w-full shrink-0"><GmailThreadDemo active={activeIdx === 1} /></div>
          <div className="w-full shrink-0"><SlackThreadDemo active={activeIdx === 2} /></div>
          <div className="w-full shrink-0"><TeamsThreadDemo active={activeIdx === 3} /></div>
        </div>
      </div>

      {/* Arrow controls */}
      <div className="flex items-center justify-center gap-4 mt-5">
        <button
          onClick={prev}
          className="w-8 h-8 rounded-full border border-[#E0DBD5] flex items-center justify-center text-[#8E8E89] hover:text-[#1B1B18] hover:border-[#1B1B18] transition-colors"
          aria-label="Previous demo"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <button
          onClick={next}
          className="w-8 h-8 rounded-full border border-[#E0DBD5] flex items-center justify-center text-[#8E8E89] hover:text-[#1B1B18] hover:border-[#1B1B18] transition-colors"
          aria-label="Next demo"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

/* ── Demo board data ── */
const DEMO_COLUMNS = [
  { id: 'demo-col-1', title: 'To Do', position: 0 },
  { id: 'demo-col-2', title: 'In Progress', position: 1 },
]

const DEMO_CARDS_INIT = [
  {
    id: 'demo-1', title: 'Design system tokens', description: 'Define color, spacing, and typography tokens for the component library',
    column_id: 'demo-col-1', position: 0, priority: 'high', task_number: 1, completed: false,
    labels: [{ text: 'Design', color: 'purple' }], checklist: null, due_date: null, assignee_name: null, icon: null, board_id: 'demo', archived: false,
  },
  {
    id: 'demo-2', title: 'Set up CI pipeline', description: '',
    column_id: 'demo-col-1', position: 1, priority: 'medium', task_number: 2, completed: false,
    labels: [{ text: 'DevOps', color: 'blue' }], checklist: null, due_date: '2026-04-10', assignee_name: 'Marcus', icon: null, board_id: 'demo', archived: false,
  },
  {
    id: 'demo-3', title: 'Write onboarding docs', description: '',
    column_id: 'demo-col-1', position: 2, priority: 'low', task_number: 3, completed: false,
    labels: [{ text: 'Docs', color: 'yellow' }], checklist: [{ text: 'Intro guide', done: true }, { text: 'API reference', done: false }, { text: 'Tutorials', done: false }], due_date: null, assignee_name: null, icon: null, board_id: 'demo', archived: false,
  },
  {
    id: 'demo-4', title: 'Auth flow redesign', description: 'Migrate from session-based to JWT tokens with refresh flow',
    column_id: 'demo-col-2', position: 0, priority: 'high', task_number: 4, completed: false,
    labels: [{ text: 'Feature', color: 'green' }], checklist: [{ text: 'JWT setup', done: true }, { text: 'Refresh flow', done: true }, { text: 'Session migration', done: false }], due_date: null, assignee_name: 'Aisha', icon: null, board_id: 'demo', archived: false,
  },
  {
    id: 'demo-5', title: 'API rate limiting', description: '',
    column_id: 'demo-col-2', position: 1, priority: 'medium', task_number: 5, completed: false,
    labels: [{ text: 'Backend', color: 'red' }], checklist: null, due_date: '2026-04-08', assignee_name: 'Marcus', icon: null, board_id: 'demo', archived: false,
  },
]

function DemoBoard() {
  const [cards, setCards] = useState(DEMO_CARDS_INIT)
  const [activeCardId, setActiveCardId] = useState(null)
  const cardsRef = useRef(cards)
  cardsRef.current = cards

  const sensor = useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  const sensors = useSensors(sensor)

  const getColumnCards = useCallback((colId) =>
    cards.filter((c) => c.column_id === colId).sort((a, b) => a.position - b.position),
  [cards])

  const collisionDetection = useCallback((args) => {
    const p = pointerWithin(args)
    return p.length > 0 ? p : rectIntersection(args)
  }, [])

  const findTargetColumn = useCallback((overId) => {
    if (DEMO_COLUMNS.find((col) => col.id === overId)) return overId
    const overCard = cardsRef.current.find((c) => c.id === overId)
    return overCard?.column_id || null
  }, [])

  const handleDragStart = useCallback((event) => {
    setActiveCardId(event.active.id)
  }, [])

  const handleDragOver = useCallback((event) => {
    const { active, over } = event
    if (!over) return

    const overColId = findTargetColumn(over.id)
    if (!overColId) return

    setCards((prev) => {
      const activeCard = prev.find((c) => c.id === active.id)
      if (!activeCard || activeCard.column_id === overColId) return prev

      const fromCards = prev.filter((c) => c.column_id === activeCard.column_id && c.id !== active.id)
      const toCards = prev.filter((c) => c.column_id === overColId)
      const overIndex = toCards.findIndex((c) => c.id === over.id)
      const insertAt = overIndex >= 0 ? overIndex : toCards.length
      toCards.splice(insertAt, 0, { ...activeCard, column_id: overColId })

      const updated = {}
      fromCards.forEach((c, i) => { updated[c.id] = { ...c, position: i } })
      toCards.forEach((c, i) => { updated[c.id] = { ...c, position: i } })

      return prev.map((c) => updated[c.id] || c)
    })
  }, [findTargetColumn])

  const handleDragEnd = useCallback((event) => {
    const { active, over } = event
    setActiveCardId(null)
    if (!over) return

    const overColId = findTargetColumn(over.id)
    if (!overColId) return

    setCards((prev) => {
      const activeCard = prev.find((c) => c.id === active.id)
      if (!activeCard) return prev

      const targetColId = activeCard.column_id === overColId ? overColId : overColId

      const colCards = prev
        .filter((c) => c.column_id === targetColId && c.id !== active.id)
        .sort((a, b) => a.position - b.position)

      const overIndex = colCards.findIndex((c) => c.id === over.id)
      const insertIndex = overIndex >= 0 ? overIndex : colCards.length
      colCards.splice(insertIndex, 0, { ...activeCard, column_id: targetColId })

      const updatedIds = new Set(colCards.map((c) => c.id))
      return [
        ...prev.filter((c) => !updatedIds.has(c.id)),
        ...colCards.map((c, i) => ({ ...c, position: i })),
      ]
    })
  }, [findTargetColumn])

  const activeCard = activeCardId ? cards.find((c) => c.id === activeCardId) : null

  function DroppableColumn({ col, colCards }) {
    const { setNodeRef } = useDroppable({ id: col.id })
    return (
      <div ref={setNodeRef} className="flex-1 min-w-0 flex flex-col h-full">
        <div className="flex items-center justify-between px-1 mb-2">
          <span className="text-sm font-semibold text-[#1B1B18] font-logo">{col.title}</span>
          <span className="text-xs text-[#8E8E89]">{colCards.length}</span>
        </div>
        <SortableContext items={colCards.map((c) => c.id)} strategy={verticalListSortingStrategy}>
          <div className="flex flex-col gap-2 flex-1 rounded-xl p-1">
            {colCards.map((card) => (
              <SortableCard key={card.id} card={card} onClick={() => {}} onComplete={() => {}} isSelected={false} />
            ))}
          </div>
        </SortableContext>
      </div>
    )
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collisionDetection}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-3 h-full">
        {DEMO_COLUMNS.map((col) => (
          <DroppableColumn key={col.id} col={col} colCards={getColumnCards(col.id)} />
        ))}
      </div>
      <DragOverlay dropAnimation={null}>
        {activeCard && <Card card={activeCard} onClick={() => {}} onComplete={() => {}} isSelected={false} />}
      </DragOverlay>
    </DndContext>
  )
}

function HeroAuthCard() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [mode, setMode] = useState('email') // 'email' | 'signup' | 'signin'
  const signUp = useAuthStore((s) => s.signUp)
  const signIn = useAuthStore((s) => s.signIn)
  const navigate = useNavigate()

  const handleEmailContinue = (e) => {
    e.preventDefault()
    if (!email) return
    setMode('signup')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      if (mode === 'signup') {
        if (password.length < 6) { setError('Password must be at least 6 characters'); setSubmitting(false); return }
        await signUp(email, password, name || email.split('@')[0])
      } else {
        await signIn(email, password)
      }
      navigate('/dashboard', { replace: true })
    } catch (err) {
      if (mode === 'signup' && err.message?.includes('already')) {
        setMode('signin')
        setError('Account exists — enter your password to sign in')
      } else {
        setError(err.message)
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="max-w-sm">
      <div className="bg-white border border-[#E0DBD5] rounded-2xl p-5 shadow-[0_4px_24px_0_rgba(0,0,0,0.04),0_2px_64px_0_rgba(0,0,0,0.02)] space-y-4">
        {error && (
          <div className="text-sm text-[#7A5C44] bg-[#F0E0D2] rounded-xl px-3 py-2">
            {error}
          </div>
        )}

        {mode === 'email' ? (
          <form onSubmit={handleEmailContinue} className="space-y-3">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              required
              className="w-full text-sm rounded-[0.6rem] px-3 py-2.5 border border-[#E0DBD5] hover:border-[#C2D64A]/50 focus:border-[#C2D64A] focus:outline-none focus:ring-1 focus:ring-[#EEF2D6] transition-colors"
            />
            <button
              type="submit"
              className="w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-[#1B1B18] text-white text-sm font-medium rounded-[0.6rem] transition-transform will-change-transform ease-[cubic-bezier(0.165,0.85,0.45,1)] duration-150 hover:scale-y-[1.015] hover:scale-x-[1.005]"
            >
              Continue with email
              <ArrowRight className="w-4 h-4" />
            </button>
            <p className="text-center text-xs text-[#8E8E89] pt-1">
              Already have an account?{' '}
              <Link to="/login" className="text-[#5C5C57] underline underline-offset-2 decoration-[#E0DBD5] hover:decoration-[#5C5C57] transition-colors">
                Sign in
              </Link>
            </p>
          </form>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="flex items-center gap-2 px-3 py-2 bg-[#F2EDE8] rounded-[0.6rem] text-sm text-[#5C5C57]">
              <span className="truncate flex-1">{email}</span>
              <button type="button" onClick={() => { setMode('email'); setError('') }} className="text-xs text-[#8E8E89] hover:text-[#5C5C57] shrink-0">
                Change
              </button>
            </div>
            {mode === 'signup' && (
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                autoFocus
                className="w-full text-sm rounded-[0.6rem] px-3 py-2.5 border border-[#E0DBD5] hover:border-[#C2D64A]/50 focus:border-[#C2D64A] focus:outline-none focus:ring-1 focus:ring-[#EEF2D6] transition-colors"
              />
            )}
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={mode === 'signup' ? 'Create a password' : 'Enter your password'}
              required
              autoFocus={mode === 'signin'}
              className="w-full text-sm rounded-[0.6rem] px-3 py-2.5 border border-[#E0DBD5] hover:border-[#C2D64A]/50 focus:border-[#C2D64A] focus:outline-none focus:ring-1 focus:ring-[#EEF2D6] transition-colors"
            />
            <button
              type="submit"
              disabled={submitting}
              className="w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-[#1B1B18] text-white text-sm font-medium rounded-[0.6rem] transition-transform will-change-transform ease-[cubic-bezier(0.165,0.85,0.45,1)] duration-150 hover:scale-y-[1.015] hover:scale-x-[1.005] disabled:opacity-50 disabled:pointer-events-none"
            >
              {submitting ? 'Please wait…' : mode === 'signup' ? 'Create account' : 'Sign in'}
            </button>
            <p className="text-center text-xs text-[#8E8E89] pt-1">
              {mode === 'signup' ? 'Already have an account?' : "Don't have an account?"}{' '}
              <button type="button" onClick={() => { setMode(mode === 'signup' ? 'signin' : 'signup'); setError('') }} className="text-[#5C5C57] underline underline-offset-2 decoration-[#E0DBD5] hover:decoration-[#5C5C57] transition-colors">
                {mode === 'signup' ? 'Sign in' : 'Sign up'}
              </button>
            </p>
          </form>
        )}
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
        <div className="px-6 sm:px-10 pb-8 max-w-[90rem] mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Left — Copy (center-aligned) */}
            <div className="flex w-full min-h-[85vh] items-center">
            <div className="text-center flex flex-col items-center w-full">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EEF2D6] text-[#6B7A12] text-xs font-normal mb-6">
                <Sparkles className="w-3.5 h-3.5" />
                100% free — no credit card required
              </span>
              <h1 className="text-5xl sm:text-6xl lg:text-[3.5rem] xl:text-6xl font-light text-[#1B1B18] tracking-tight leading-[1.08] mb-5">
                Project management
                <br />
                that feels{' '}
                <span className="text-[#8BA32E] font-heading">effortless</span>
              </h1>
              <p className="text-base sm:text-lg text-[#5C5C57] max-w-lg mb-8 leading-relaxed">
                A clean Kanban workspace for teams that value focus over features.
                Organize, collaborate, and ship — without the clutter.
              </p>
              <HeroAuthCard />
              <p className="mt-6 text-sm text-[#8E8E89]">
                Trusted by early adopters · launching 2026
              </p>
            </div>
            </div>

            {/* Right — Live Demo Board */}
            <div className="hidden lg:flex justify-center items-center w-full">
              <div className="rounded-2xl w-full h-[85vh] min-h-[500px] overflow-hidden border border-[#E0DBD5]/80 bg-[#FEFDFD] shadow-[0_4px_20px_0_rgba(0,0,0,0.04)]">
              <div className="relative w-full h-full flex flex-col">
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
                <div className="flex flex-1 overflow-hidden">
                  {/* Mini sidebar — matches real collapsed Sidebar.jsx */}
                  <div className="flex w-16 bg-[#FAF8F6] border-r border-[#E0DBD5] flex-col shrink-0 h-full">
                    <div className="flex items-center justify-center h-16 border-b border-[#E0DBD5]">
                      <Kanban size={26} weight="fill" className="text-[#8BA32E]" />
                    </div>
                    <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
                      <div className="flex items-center justify-center px-3 py-2.5 rounded-lg text-sm font-medium text-[#5C5C57]">
                        <LayoutDashboard className="w-5 h-5 shrink-0" />
                      </div>
                      <div className="flex items-center justify-center px-3 py-2.5 rounded-lg text-sm font-medium bg-[#EEF2D6] text-[#1B1B18]">
                        <LucideKanban className="w-5 h-5 shrink-0" />
                      </div>
                      <div className="flex items-center justify-center px-3 py-2.5 rounded-lg text-sm font-medium text-[#5C5C57]">
                        <Calendar className="w-5 h-5 shrink-0" />
                      </div>
                      <div className="flex items-center justify-center px-3 py-2.5 rounded-lg text-sm font-medium text-[#5C5C57]">
                        <StickyNote className="w-5 h-5 shrink-0" />
                      </div>
                    </nav>
                    <div className="border-t border-[#E0DBD5] py-4 px-2 space-y-1">
                      <div className="flex items-center justify-center px-3 py-2.5 rounded-lg text-sm font-medium text-[#5C5C57]">
                        <Settings className="w-5 h-5 shrink-0" />
                      </div>
                      <div className="flex items-center justify-center px-3 py-2.5 rounded-lg text-sm font-medium text-[#5C5C57]">
                        <ChevronsRight className="w-5 h-5" />
                      </div>
                    </div>
                  </div>

                  {/* Live columns */}
                  <div className="flex-1 p-4 overflow-x-auto overflow-y-auto h-full font-sans">
                    <DemoBoard />
                  </div>
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

      {/* ─── AI Demo Slider (Notes + Slack + Teams + Gmail) ─── */}
      <section className="px-6 sm:px-10 py-14 max-w-6xl mx-auto">
        {/* Heading + intro centered */}
        <div className="text-center mb-8 max-w-2xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-normal text-[#1B1B18] tracking-tight mb-3">
            Chaos in,{' '}
            <span className="text-[#8BA32E] font-heading">kanban out</span>
          </h2>
          <p className="text-sm text-[#5C5C57] leading-relaxed">
            Notes, Slack threads, emails, standup updates — Kolumn reads the mess and drops
            structured tasks on the board.
          </p>
        </div>

        {/* Slider with all 4 demo canvases */}
        <div className="flex justify-center">
          <DemoSlider />
        </div>
      </section>

      {/* ─── Features Grid ─── */}
      <section className="px-6 sm:px-10 py-16 max-w-5xl mx-auto">
        <div className="text-center mb-10">
          <h2 className="text-3xl sm:text-4xl font-normal text-[#1B1B18] tracking-tight mb-2">Built for how teams <span className="text-[#8BA32E] font-heading">actually work</span></h2>
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

      {/* ─── CTA ─── */}
      <section className="relative px-6 sm:px-10 py-16 max-w-5xl mx-auto text-center">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-gradient-to-r from-[#1B1B18]/25 to-[#C2D64A]/25 rounded-full blur-3xl pointer-events-none" />
        <div className="relative">
        <div className="w-10 h-[1px] bg-[#E0DBD5] mx-auto mb-10" />
        <h2 className="text-3xl sm:text-4xl font-normal text-[#1B1B18] tracking-tight mb-3">
          Your team's <span className="text-[#8BA32E] font-heading">next move</span> starts here
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
