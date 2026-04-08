import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import '@fontsource-variable/plus-jakarta-sans'
import {
  ArrowRight, Columns3, Users, Zap, Calendar, StickyNote,
  Share2, BarChart3, GripVertical, Tag, CheckSquare, Clock,
  Shield, Sparkles, MousePointerClick, ArrowUpRight,
  Check, Square, AlignLeft, User, Plus, FileText, CheckCircle2,
  LayoutDashboard, Settings, ChevronsRight, SquareKanban, Kanban as LucideKanban,
  AtSign, AlertCircle, Hash,
} from 'lucide-react'
import { Kanban, Browser, Tag as PhosphorTag, CreditCard } from '@phosphor-icons/react'
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

// Slack thread demo — messages reverse-engineered from AI_CARDS above
// so each message's extractable signals map to AI_CARDS[i]'s fields.
const SLACK_MESSAGES = [
  {
    sender: 'Priya',
    avatar: 'P',
    timestamp: '2:14 PM',
    text: '@aisha hero section feels plain — sarah flagged it on the call, can you redo it? high prio',
    mentions: ['@aisha'],
  },
  {
    sender: 'Priya',
    avatar: 'P',
    timestamp: '2:15 PM',
    text: "also pricing page needs building — 3 tiers with monthly/annual toggle, founder's call",
    mentions: [],
  },
  {
    sender: 'Priya',
    avatar: 'P',
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

// Slack demo timeline — independent phases mirroring the existing demo's structure
const SLACK_LOOP_CARRY = 300         // initial "carry-over" showing prev loop's cards
const SLACK_MSG_LAND_DUR = 400       // per-message slide + fade duration
const SLACK_MSG_GAP = 350            // gap between messages landing
const SLACK_MSG_1_START = SLACK_LOOP_CARRY
const SLACK_MSG_1_END = SLACK_MSG_1_START + SLACK_MSG_LAND_DUR
const SLACK_MSG_2_START = SLACK_MSG_1_END + SLACK_MSG_GAP
const SLACK_MSG_2_END = SLACK_MSG_2_START + SLACK_MSG_LAND_DUR
const SLACK_MSG_3_START = SLACK_MSG_2_END + SLACK_MSG_GAP
const SLACK_MSG_3_END = SLACK_MSG_3_START + SLACK_MSG_LAND_DUR
const SLACK_CARDS_FADE_OUT_DUR = 200 // cards from prev loop fade out as first msg lands
const SLACK_CARDS_GAP = 400          // pause after last message before cards start
const SLACK_CARDS_START = SLACK_MSG_3_END + SLACK_CARDS_GAP
const SLACK_CARD_SWEEP = 750         // intentionally matches existing CARD_SWEEP
const SLACK_CARD_STAGGER = 600       // intentionally matches existing CARD_STAGGER
const SLACK_CARDS_END = SLACK_CARDS_START + (AI_CARDS.length - 1) * SLACK_CARD_STAGGER + SLACK_CARD_SWEEP
const SLACK_HOLD_DUR = 1800          // hold with both panels visible
const SLACK_MSG_FADE_OUT_DUR = 400   // messages fade out near end of timeline
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

function computeSlackMessageState(elapsed, msgIdx) {
  const starts = [SLACK_MSG_1_START, SLACK_MSG_2_START, SLACK_MSG_3_START]
  const msgStart = starts[msgIdx]

  // Fade-out phase near end of timeline (all messages fade together)
  if (elapsed >= SLACK_MSG_FADE_OUT_START) {
    const fadeElapsed = elapsed - SLACK_MSG_FADE_OUT_START
    const t = Math.min(1, fadeElapsed / SLACK_MSG_FADE_OUT_DUR)
    return { opacity: 1 - t, translateY: 0 }
  }

  // Hidden during loop-carry / before this message's turn
  if (elapsed < msgStart) return { opacity: 0, translateY: 20 }

  // Landing phase: slide up + fade in
  const msgElapsed = elapsed - msgStart
  if (msgElapsed < SLACK_MSG_LAND_DUR) {
    const t = msgElapsed / SLACK_MSG_LAND_DUR
    return { opacity: t, translateY: 20 * (1 - t) }
  }

  // Fully landed
  return { opacity: 1, translateY: 0 }
}

function computeSlackCardsLayerOpacity(elapsed) {
  // Loop-carry: cards from previous cycle still visible before messages start
  if (elapsed < SLACK_MSG_1_START) return 1
  // Cards fade out as first message lands
  const fadeElapsed = elapsed - SLACK_MSG_1_START
  if (fadeElapsed < SLACK_CARDS_FADE_OUT_DUR) {
    return 1 - fadeElapsed / SLACK_CARDS_FADE_OUT_DUR
  }
  // Hidden during message phase
  if (elapsed < SLACK_CARDS_START) return 0
  // Visible during card sweep and hold
  return 1
}

function computeSlackCardState(elapsed, cardIdx) {
  // Loop-carry: show cards from prev cycle at full
  if (elapsed < SLACK_MSG_1_START) return { opacity: 1, sweepProgress: 1 }
  // Before this card's sweep start
  const cardShowStart = SLACK_CARDS_START + cardIdx * SLACK_CARD_STAGGER
  if (elapsed < cardShowStart) return { opacity: 0, sweepProgress: 0 }
  // Sweep in progress
  const cardElapsed = elapsed - cardShowStart
  return { opacity: 1, sweepProgress: Math.min(1, cardElapsed / SLACK_CARD_SWEEP) }
}

const PHOSPHOR_ICON_MAP = { 'browser': Browser, 'tag': PhosphorTag, 'credit-card': CreditCard }

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

function AICard({ card, opacity, sweepProgress }) {
  const dotColor = LANDING_PRIORITY_DOT[card.priority]
  const labelStyles = card.labels.map((l) => LANDING_LABEL_BG[l.color])
  const revealVar = `${sweepProgress * 124 - 12}%`
  const PhosphorIcon = PHOSPHOR_ICON_MAP[card.icon]
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

function EveryDetailDemo() {
  const [elapsed, setElapsed] = useState(0)
  useEffect(() => {
    const id = setInterval(() => {
      setElapsed((prev) => (prev + 50 >= TIMELINE_TOTAL ? 0 : prev + 50))
    }, 50)
    return () => clearInterval(id)
  }, [])
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

function SlackThread({ elapsed }) {
  const messageStates = SLACK_MESSAGES.map((_, idx) => computeSlackMessageState(elapsed, idx))
  return (
    <div className="px-5 sm:px-6 pt-4 sm:pt-5 flex flex-col gap-2 select-none h-full">
      {/* Channel header */}
      <div className="flex items-center gap-1.5 pb-2 border-b border-[#E0DBD5]">
        <Hash className="w-3.5 h-3.5 text-[#8E8E89]" />
        <span className="text-[13px] font-semibold text-[#1B1B18]">launch-prep</span>
      </div>

      {/* Messages */}
      <div className="flex flex-col gap-3 pt-1">
        {SLACK_MESSAGES.map((msg, idx) => {
          const state = messageStates[idx]
          return (
            <div
              key={idx}
              className="flex gap-2.5"
              style={{
                opacity: state.opacity,
                transform: `translateY(${state.translateY}px)`,
              }}
            >
              {/* Avatar */}
              <div className="w-7 h-7 rounded-full shrink-0 flex items-center justify-center text-[11px] font-bold text-white bg-[#1B1B18]">
                {msg.avatar}
              </div>
              {/* Message body */}
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2 mb-0.5">
                  <span className="text-[13px] font-semibold text-[#1B1B18]">{msg.sender}</span>
                  <span className="text-[10px] text-[#8E8E89]">{msg.timestamp}</span>
                </div>
                <p className="text-[12px] text-[#5C5C57] leading-relaxed break-words">
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
  const layerOpacity = computeSlackCardsLayerOpacity(elapsed)
  const cardStates = AI_CARDS.map((_, idx) => computeSlackCardState(elapsed, idx))
  return (
    <div
      className="absolute inset-0 pointer-events-none"
      style={{ opacity: layerOpacity }}
    >
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

      {/* ─── AI Card Generation Showcase ─── */}
      <section className="px-6 sm:px-10 py-14 max-w-6xl mx-auto">
        {/* Heading + intro centered */}
        <div className="text-center mb-8 max-w-2xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-normal text-[#1B1B18] tracking-tight mb-3">
            Notes in,{' '}
            <span className="text-[#8BA32E] font-heading">kanban out</span>
          </h2>
          <p className="text-sm text-[#5C5C57] leading-relaxed">
            Type how you think. Bullets, abbreviations, scribbles — Kolumn structures it for you.
            No templates, no setup.
          </p>
        </div>

        {/* Feature bullets — horizontal row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-10 max-w-4xl mx-auto">
          {[
            { icon: Sparkles, text: 'Extracts tasks from rough notes' },
            { icon: Clock, text: 'Catches deadlines from casual phrases' },
            { icon: Tag, text: 'Auto-tags labels and priorities' },
            { icon: CheckSquare, text: 'Builds checklists from inline lists' },
          ].map((item) => (
            <div key={item.text} className="flex items-start gap-2.5">
              <div className="w-6 h-6 rounded-lg bg-[#C2D64A]/20 flex items-center justify-center shrink-0 mt-0.5">
                <item.icon className="w-3.5 h-3.5 text-[#1B1B18]" />
              </div>
              <p className="text-[12px] text-[#5C5C57] leading-relaxed">{item.text}</p>
            </div>
          ))}
        </div>

        {/* Full-width animated app demo */}
        <div className="flex justify-center">
          <EveryDetailDemo />
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

      {/* ─── Tools Strip ─── */}
      <section className="px-6 sm:px-10 py-14 max-w-5xl mx-auto">
        <div className="bg-white border border-[#E0DBD5]/80 rounded-2xl p-6 sm:p-8 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-normal text-[#1B1B18]">Everything you <span className="text-[#8BA32E] font-heading">need</span></h2>
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
