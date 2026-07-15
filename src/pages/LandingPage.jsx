import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useEffect, useLayoutEffect, useState, useRef } from 'react'
import '@fontsource-variable/plus-jakarta-sans'

import { ArrowRight, Browser, CalendarDot, CaretLeft, CaretRight, ChartPie, ChatsCircle, CheckCircle, CheckSquare, ClipboardText, CreditCard, Envelope, FileText, Kanban, Megaphone, Microphone, Lightning, List, Notepad, Tag, Plus, Target, TrendUp, VideoCamera, Waveform, X } from '@phosphor-icons/react'

import Avatar from '../components/ui/Avatar'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import InlineNotice from '../components/ui/InlineNotice'
import { useAuthStore } from '../store/authStore'
import { HeroAnimation } from './LandingBoardSandbox'
import PlanCard from '../components/PlanCard'
import { PLANS } from '../data/plans'


// Stats bar removed pre-launch — old values were vanity placeholders
// ("10x", "100%", "∞") that broke the restrained hero voice. Revisit
// post-launch with real metrics (active boards, signup count, avg setup
// time, etc.) and rebuild the section using credible numbers.

// Features grid + standalone CTA were removed in favor of pricing + FAQ.
// If a feature catalog ever comes back, restore from git history of this
// file — it lived here as `const features = [...]`.

// `ghost`       → "ghost" card: page-bg fill + dark ink border. Used on
//                  Free so it visually blends into the page while a sharp
//                  ink outline defines its shape.
// `primaryCta`  → dark ink CTA button. Used on Pro to keep upgrade
//                  visually distinct now that the highlight border moved.
// Plan definitions live in src/data/plans.js — shared with the
// signup plan-picker step. Edits there propagate to both surfaces.

const FAQ = [
  {
    q: 'What should I use Kolumn for?',
    a: 'Anything you used to keep in a notes app, a shared sheet, or a Trello board you abandoned. Personal projects, side hustles, team workstreams, content calendars, recurring chores — anything that benefits from "cards in columns" but where you do not want to set up a workflow tool first. The AI runs the busywork; you stay in the kanban.',
  },
  {
    q: 'How is Kolumn different from Asana, Trello, or Notion?',
    a: "Most PM tools grew into something heavy — workflows, custom fields, sprint planning. Kolumn is a kanban that stayed a kanban. The difference is what's missing: no setup, no rituals, no field discipline. Just boards, cards, and an AI that can run the busywork for you.",
  },
  {
    q: 'Is my data private?',
    a: "Yes. Every table uses row-level security so only you and your team can see your boards. We don't train on your content, and you can export or delete everything at any time.",
  },
]

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

const AI_CARDS = [
  {
    taskNumber: 24,
    title: 'Redo hero section',
    description: 'Sarah feedback — current hero feels too plain',
    labels: [{ text: 'Frontend', color: 'blue' }],
    priority: 'high',
    dueDate: null,
    checklist: null,
    // Message @-mentions @rhea, so the assignee initial must be 'R'.
    assignee: 'R',
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

// Chat thread demo — production-incident scenario. Deliberately distinct
// from Notes (launch-planning, hero/pricing/stripe) and Email (board deck,
// MRR/churn/competitive). Multi-sender chat with three @-mentions, each
// resulting in a separate task on the right.
const CHAT_MESSAGES = [
  {
    sender: 'Sarah',
    timestamp: '11:02 AM',
    text: '@theo can you rollback the new deploy? checkout 500ing for 3 users in the last 10 min, rate limiter looks suspect',
    mentions: ['@theo'],
  },
  {
    sender: 'Theo',
    timestamp: '11:03 AM',
    text: 'on it. @paige pls draft a customer status post while i patch',
    mentions: ['@paige'],
  },
  {
    sender: 'Sarah',
    timestamp: '11:05 AM',
    text: '@anna start the postmortem doc — need it before standup tmrw',
    mentions: ['@anna'],
  },
]

// Cards extracted from CHAT_MESSAGES — three actions, three assignees,
// three icons/labels distinct from the Notes/Email decks.
const CHAT_AI_CARDS = [
  {
    taskNumber: 24,
    title: 'Roll back rate-limiter deploy',
    description: 'Checkout returning 500s — rollback first, debug after',
    labels: [{ text: 'Backend', color: 'red' }],
    priority: 'high',
    dueDate: 'Today',
    checklist: null,
    assignee: 'T',
    icon: 'lightning',
  },
  {
    taskNumber: 25,
    title: 'Draft customer status post',
    description: 'Acknowledge outage, ETA, status-page link',
    labels: [{ text: 'Comms', color: 'purple' }],
    priority: 'high',
    dueDate: 'Today',
    checklist: null,
    assignee: 'P',
    icon: 'chats',
  },
  {
    taskNumber: 26,
    title: 'Start postmortem doc',
    description: 'Root cause + timeline, ready before standup',
    labels: [{ text: 'Docs', color: 'yellow' }],
    priority: 'medium',
    dueDate: 'Tmrw',
    checklist: null,
    assignee: 'A',
    icon: 'notepad',
  },
]

const CHAT_PHOSPHOR_ICON_MAP = { 'lightning': Lightning, 'chats': ChatsCircle, 'notepad': Notepad }

// Meeting-transcript demo — deliberately non-tech to broaden the page's
// audience (marketing/agency/ops teams, not just devs). Three speakers in
// a Q2 campaign kickoff, three action items extracted. Distinct from the
// other three demos:
//   Notes → solo bullet writing (launch planning)
//   Email → single-author block (board deck prep)
//   Chat  → real-time bubbles (production incident)
//   Transcript → paragraph speaker turns (planning meeting)
const TRANSCRIPT_PARAGRAPHS = [
  {
    speaker: 'Emma',
    timestamp: '0:14',
    text: "Alright, so for the Q2 campaign we’ve got three things landing by next Friday — refreshed press kit, the 60-second brand video, and influencer outreach. I’ll grab the press kit since I’ve already got the file open from last week.",
    mentions: [],
  },
  {
    speaker: 'Ben',
    timestamp: '1:32',
    text: "Yeah, I’ll take the brand video. I’m thinking we cut it in two passes — rough by Wednesday so we’ve got time to iterate, then final by end of Thursday.",
    mentions: [],
  },
  {
    speaker: 'Claire',
    timestamp: '2:05',
    text: "And I’ll run point on the influencer side. The list’s already in HubSpot from last quarter — I’ll refresh the pitch this morning and we should be good to go.",
    mentions: [],
  },
]

const TRANSCRIPT_AI_CARDS = [
  {
    taskNumber: 31,
    title: 'Refresh press kit',
    description: 'Update existing kit for Q2 campaign rollout',
    labels: [{ text: 'Marketing', color: 'pink' }],
    priority: 'medium',
    dueDate: 'Fri',
    checklist: null,
    assignee: 'E',
    icon: 'file-text',
  },
  {
    taskNumber: 32,
    title: 'Brand video — first cut',
    description: '60-second cut ready for review by Wednesday',
    labels: [{ text: 'Design', color: 'purple' }],
    priority: 'high',
    dueDate: 'Wed',
    checklist: null,
    assignee: 'B',
    icon: 'video',
  },
  {
    taskNumber: 33,
    title: 'Influencer outreach',
    description: 'Top-50 list from HubSpot, updated pitch',
    labels: [{ text: 'PR', color: 'green' }],
    priority: 'medium',
    dueDate: 'Fri',
    checklist: null,
    assignee: 'C',
    icon: 'megaphone',
  },
]

const TRANSCRIPT_PHOSPHOR_ICON_MAP = { 'file-text': FileText, 'video': VideoCamera, 'megaphone': Megaphone }

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
const SLACK_CARDS_END = SLACK_CARDS_START + (CHAT_AI_CARDS.length - 1) * SLACK_CARD_STAGGER + SLACK_CARD_SWEEP
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

// Carry-over: previous cycle's cards stay visible through message phase
function computeSlackCardState(elapsed, cardIdx) {
  if (elapsed < SLACK_MSG_3_END) return { opacity: 1, sweepProgress: 1 }
  const cardShowStart = SLACK_CARDS_START + cardIdx * SLACK_CARD_STAGGER
  if (elapsed < cardShowStart) return { opacity: 0, sweepProgress: 0 }
  const cardElapsed = elapsed - cardShowStart
  return { opacity: 1, sweepProgress: Math.min(1, cardElapsed / SLACK_CARD_SWEEP) }
}

const PHOSPHOR_ICON_MAP = { 'browser': Browser, 'tag': Tag, 'credit-card': CreditCard }
const GMAIL_PHOSPHOR_ICON_MAP = { 'trend-up': TrendUp, 'chart-pie': ChartPie, 'target': Target }

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
  const revealVar = `${sweepProgress * 124 - 12}%`
  const PhosphorIcon = (iconMap || PHOSPHOR_ICON_MAP)[card.icon]
  const checklistComplete = card.checklist && card.checklist.done === card.checklist.total
  const checkColor = card.priority === 'high'
    ? 'text-[var(--color-copper)]'
    : card.priority === 'low'
    ? 'text-[var(--color-lime-dark)]'
    : 'text-[var(--color-honey)]'

  return (
    <div
      className="w-full flex flex-col gap-3 rounded-2xl border bg-[var(--surface-card)] border-[var(--color-mist)] p-4 shadow-sm"
      style={{ opacity }}
    >
      {/* Top row: icon + title + check */}
      <div className="flex items-center gap-3">
        <div className="flex w-10 h-10 shrink-0 items-center justify-center rounded-lg border-0.5 border-[var(--border-default)] bg-[var(--surface-raised)]">
          <div className="w-5 h-5 flex items-center justify-center text-[var(--text-primary)]">
            {PhosphorIcon && <PhosphorIcon size={20} weight="regular" />}
          </div>
        </div>
        <div className="flex min-w-0 grow flex-col gap-0.5">
          <div className="flex min-w-0 items-center gap-1.5">
            <span
              className="text-sm font-medium flex-1 ai-shimmer-reveal"
              style={{ '--reveal': revealVar }}
            >
              {card.title}
            </span>
            <CheckCircle className={`w-4 h-4 shrink-0 ${checkColor}`} />
          </div>
          <div className="flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
            {card.labels?.length > 0 && card.labels.map((label) => (
              <span key={label.text} className="font-medium text-[var(--text-secondary)] lowercase">
                /{label.text}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Description */}
      {card.description && (
        <p
          className="line-clamp-2 text-xs leading-relaxed ai-shimmer-reveal"
          style={{ '--reveal': revealVar }}
        >
          {card.description}
        </p>
      )}

      {/* Bottom metadata row */}
      {(card.dueDate || card.checklist || card.assignee) && (
        <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
          <div className="flex items-center gap-2">
            {card.dueDate && (
              <span className="font-semibold flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] bg-[var(--color-lime-wash)] text-[var(--color-lime-dark)]">
                <CalendarDot size={12} weight="bold" />
                {card.dueDate}
              </span>
            )}
            {card.checklist && (
              <span className={`font-semibold flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] ${
                checklistComplete
                  ? 'bg-[var(--color-lime-wash)] text-[var(--color-lime-dark)]'
                  : 'bg-[var(--surface-hover)] text-[var(--text-muted)]'
              }`}>
                <CheckSquare size={12} weight="bold" />
                {card.checklist.done}/{card.checklist.total}
              </span>
            )}
          </div>
          {card.assignee && (
            <Avatar name={card.assignee} size="sm" ringed className="text-[10px]" />
          )}
        </div>
      )}
    </div>
  )
}

function AIGeneratedCards({ cardStates }) {
  return (
    <div className="pt-5 px-4 flex justify-center select-none">
      <div className="flex flex-col w-full max-w-[290px]">
        <div className="flex items-baseline gap-2 px-0.5 pb-3">
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">to do</h3>
          <span className="text-xs text-[var(--text-muted)]">{AI_CARDS.length}</span>
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
        className="relative overflow-hidden w-full rounded-[2rem] bg-[#E8DDE2]"
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
  const messageStates = CHAT_MESSAGES.map((_, idx) => computeSlackMessageState(elapsed, idx))
  return (
    <div className="px-5 sm:px-6 pt-4 sm:pt-5 flex flex-col gap-2 select-none h-full">
      {/* Header — generic team-chat framing matched to the new incident
          scenario (replaces the old Slack #launch-prep channel header). */}
      <div className="pb-2 border-b border-[#E8E8E8]">
        <div className="flex items-center gap-1.5">
          <ChatsCircle className="w-3.5 h-3.5 text-[#616061]" weight="regular" />
          <span className="text-[13px] font-semibold text-[#1D1C1D]">Team chat — prod incident</span>
        </div>
      </div>

      {/* Messages — grouped continuation for same sender */}
      <div className="flex flex-col gap-3 pt-1">
        {CHAT_MESSAGES.map((msg, idx) => {
          const state = messageStates[idx]
          const isGrouped = idx > 0 && CHAT_MESSAGES[idx - 1].sender === msg.sender
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
                /* Circular letter avatar — chat-app convention (vs Notes's
                   square documents). Mauve-wash bg + ink letter, sender's
                   first character. */
                <div className="w-7 h-7 rounded-full shrink-0 flex items-center justify-center bg-[var(--color-mauve-wash)] text-[var(--text-primary)] text-[11px] font-semibold border border-[#E0DBD5]">
                  {msg.sender.charAt(0)}
                </div>
              )}
              <div className="flex-1 min-w-0 flex flex-col items-start">
                {!isGrouped && (
                  <div className="flex items-baseline gap-2 mb-1">
                    <span className="text-[12px] font-semibold text-[#1D1C1D]">{msg.sender}</span>
                    <span className="text-[10px] text-[#616061]">{msg.timestamp}</span>
                  </div>
                )}
                {/* Chat bubble — rounded rect with sharper top-left corner
                    (tail-style toward the avatar). Light sand fill makes
                    the panel feel like a chat app, not a notes/email feed. */}
                <div className="inline-block max-w-full bg-white border border-[#E8E4DD] rounded-2xl rounded-tl-md px-3 py-2 shadow-[0_1px_2px_rgba(27,27,24,0.04)]">
                  <p className="text-[12px] text-[#1D1C1D] leading-relaxed break-words">
                    {renderMessageText(msg.text, msg.mentions)}
                  </p>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function SlackExtractedCards({ elapsed }) {
  const cardStates = CHAT_AI_CARDS.map((_, idx) => computeSlackCardState(elapsed, idx))
  return (
    <div className="absolute inset-0 pointer-events-none">
      <div className="pt-5 px-4 flex justify-center select-none">
        <div className="flex flex-col w-full max-w-[290px]">
          <div className="flex items-baseline gap-2 px-0.5 pb-3">
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">to do</h3>
            <span className="text-xs text-[var(--text-muted)]">{CHAT_AI_CARDS.length}</span>
          </div>
          <div className="flex flex-col gap-2">
            {CHAT_AI_CARDS.map((card, idx) => (
              <AICard
                key={card.taskNumber}
                card={card}
                opacity={cardStates[idx].opacity}
                sweepProgress={cardStates[idx].sweepProgress}
                iconMap={CHAT_PHOSPHOR_ICON_MAP}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// Reframed: was Slack chrome (purple bg + Slack logo + "Slack" label),
// now neutral "Pasted chat" chrome — same paste-into-Kolumn framing as
// the email demo. Function name kept (SlackChrome) so the Slack* helpers
// in this file stay self-consistent; only the rendered output changed.
function SlackChrome() {
  return (
    <div className="flex items-center gap-1.5 px-3 py-2.5 shrink-0 bg-white border-b border-[#E8E8E8]">
      <span className="w-2.5 h-2.5 rounded-full bg-[#FF5F57]" />
      <span className="w-2.5 h-2.5 rounded-full bg-[#FEBC2E]" />
      <span className="w-2.5 h-2.5 rounded-full bg-[#28C840]" />
      <div className="flex items-center gap-1.5 ml-3">
        <ClipboardText size={14} weight="regular" className="text-[#5F6368]" />
        <span className="text-[11px] font-semibold text-[#5F6368] tracking-tight">Pasted chat</span>
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
        className="relative overflow-hidden w-full rounded-[2rem] bg-[#E8DDE2]"
        style={{ boxShadow: 'inset 0 0 0 1px #E0DBD5' }}
      >
        <div className="flex flex-col md:flex-row md:items-center gap-4 md:gap-6 p-4 md:p-8">
          {/* Left panel bg = cool gray (#F2F4F7) — distinct from Notes/Email
              cream (#FAF8F6) so the chat demo reads visually differently. */}
          <div
            className="flex-1 rounded-lg overflow-hidden flex flex-col bg-[#F2F4F7] border border-[#E0DBD5] aspect-[4/3] md:aspect-[4/4.5]"
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

/* ── Meeting Transcript Demo ──
   Renders all three speaker paragraphs static from frame 1 (live
   transcription tools never animate already-placed text — only the
   leading edge moves). "Live" motion lives entirely in indicators:
     • LiveAudioBars in chrome + header (three async bars, like a mic
       level meter)
     • Pulsing red REC dot
     • Blinking caret at end of last paragraph
   Cards on the right still extract progressively over time, reusing
   SLACK_CARDS_* timing. */

/* Three vertical bars that rise/fall asynchronously like an audio level
   meter. The bars are HTML <span>s (not SVG <rect>s) so transform-origin
   works portably across browsers. Three different durations + negative
   delays keep them out of phase. Inherits color from currentColor. */
function LiveAudioBars({ className = '', size = 14 }) {
  const barW = Math.max(2, Math.round(size / 7))
  const barGap = Math.max(1, Math.round(size / 14))
  return (
    <span
      className={`inline-flex items-end ${className}`}
      style={{ height: size, gap: barGap }}
      aria-hidden="true"
    >
      <span
        className="audio-bar bg-current rounded-[1px] block"
        style={{ width: barW, height: size, animationDuration: '0.9s', animationDelay: '0s' }}
      />
      <span
        className="audio-bar bg-current rounded-[1px] block"
        style={{ width: barW, height: size, animationDuration: '1.1s', animationDelay: '-0.25s' }}
      />
      <span
        className="audio-bar bg-current rounded-[1px] block"
        style={{ width: barW, height: size, animationDuration: '0.7s', animationDelay: '-0.45s' }}
      />
    </span>
  )
}

function TranscriptChrome() {
  return (
    <div className="flex items-center gap-1.5 px-3 py-2.5 shrink-0 bg-white border-b border-[#E8E8E8]">
      <span className="w-2.5 h-2.5 rounded-full bg-[#FF5F57]" />
      <span className="w-2.5 h-2.5 rounded-full bg-[#FEBC2E]" />
      <span className="w-2.5 h-2.5 rounded-full bg-[#28C840]" />
      <div className="flex items-center gap-1.5 ml-3 text-[#5F6368]">
        <LiveAudioBars size={11} />
        <span className="text-[11px] font-semibold tracking-tight">Live transcript</span>
        <span className="w-1.5 h-1.5 rounded-full bg-[#E03B3B] animate-pulse ml-1" />
      </div>
    </div>
  )
}

function TranscriptThread() {
  return (
    <div className="px-5 sm:px-6 pt-4 sm:pt-5 flex flex-col gap-2 select-none h-full">
      <div className="pb-2 border-b border-[#E8E8E8]">
        <div className="flex items-center gap-1.5">
          <Microphone className="w-3.5 h-3.5 text-[#616061]" weight="regular" />
          <span className="text-[13px] font-semibold text-[#1D1C1D]">Marketing meeting · Q2 campaign</span>
          <span className="w-1.5 h-1.5 rounded-full bg-[#E03B3B] animate-pulse ml-1.5" />
          <span className="text-[10px] font-semibold text-[#E03B3B] tracking-wide">REC</span>
        </div>
      </div>
      <div className="flex flex-col gap-3 pt-1">
        {TRANSCRIPT_PARAGRAPHS.map((para, idx) => {
          const isLast = idx === TRANSCRIPT_PARAGRAPHS.length - 1
          return (
            <div key={idx} className="flex flex-col">
              <div className="flex items-baseline gap-2 mb-1">
                <span className="text-[12px] font-semibold text-[#1D1C1D]">{para.speaker}</span>
                <span className="text-[10px] text-[#616061] font-mono">{para.timestamp}</span>
              </div>
              <p className="text-[12px] text-[#1D1C1D] leading-relaxed break-words">
                {renderMessageText(para.text, para.mentions)}
                {isLast && (
                  /* Live-transcription caret — sits at the end of the last
                     paragraph, blinks like the cursor of an active recording. */
                  <span className="inline-block w-[2px] h-[1em] -mb-[2px] ml-[1px] align-middle bg-[#1D1C1D] animate-pulse" />
                )}
              </p>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function TranscriptExtractedCards({ elapsed }) {
  const cardStates = TRANSCRIPT_AI_CARDS.map((_, idx) => computeSlackCardState(elapsed, idx))
  return (
    <div className="absolute inset-0 pointer-events-none">
      <div className="pt-5 px-4 flex justify-center select-none">
        <div className="flex flex-col w-full max-w-[290px]">
          <div className="flex items-baseline gap-2 px-0.5 pb-3">
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">to do</h3>
            <span className="text-xs text-[var(--text-muted)]">{TRANSCRIPT_AI_CARDS.length}</span>
          </div>
          <div className="flex flex-col gap-2">
            {TRANSCRIPT_AI_CARDS.map((card, idx) => (
              <AICard
                key={card.taskNumber}
                card={card}
                opacity={cardStates[idx].opacity}
                sweepProgress={cardStates[idx].sweepProgress}
                iconMap={TRANSCRIPT_PHOSPHOR_ICON_MAP}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function TranscriptDemo({ active = true }) {
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
        className="relative overflow-hidden w-full rounded-[2rem] bg-[#E8DDE2]"
        style={{ boxShadow: 'inset 0 0 0 1px #E0DBD5' }}
      >
        <div className="flex flex-col md:flex-row md:items-center gap-4 md:gap-6 p-4 md:p-8">
          {/* Cream panel bg (#FAF8F6) — matches Notes/Email so the four
              demos read as a coherent set. Distinctness for transcript
              comes from layout (paragraph speaker turns), Waveform icon,
              live REC indicator, and blinking caret — not bg color. */}
          <div
            className="flex-1 rounded-lg overflow-hidden flex flex-col bg-[#FAF8F6] border border-[#E0DBD5] aspect-[4/3] md:aspect-[4/4.5]"
            style={{ boxShadow: '0 8px 24px -8px rgba(27, 27, 24, 0.10)' }}
          >
            <TranscriptChrome />
            <div className="flex-1 overflow-hidden relative">
              <TranscriptThread />
            </div>
          </div>
          <CreamWindow className="aspect-[4/5]">
            <TranscriptExtractedCards elapsed={elapsed} />
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
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">to do</h3>
            <span className="text-xs text-[var(--text-muted)]">{GMAIL_AI_CARDS.length}</span>
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

// Reframed from Gmail chrome → "Pasted email" chrome. The previous version
// rendered a Gmail logo + account avatar, implying an integration we don't
// ship. This version shows a clipboard glyph + "Pasted email" label so the
// frame reads as "raw email text dropped into Kolumn" instead.
function GmailChrome() {
  return (
    <div className="flex items-center gap-1.5 px-3 py-2.5 shrink-0 bg-white border-b border-[#E8E8E8]">
      <span className="w-2.5 h-2.5 rounded-full bg-[#FF5F57]" />
      <span className="w-2.5 h-2.5 rounded-full bg-[#FEBC2E]" />
      <span className="w-2.5 h-2.5 rounded-full bg-[#28C840]" />
      <div className="flex items-center gap-1.5 ml-3">
        <ClipboardText size={14} weight="regular" className="text-[#5F6368]" />
        <span className="text-[11px] font-semibold text-[#5F6368] tracking-tight">Pasted email</span>
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
        className="relative overflow-hidden w-full rounded-[2rem] bg-[#E8DDE2]"
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
// Three honest input types for "Notes in, Kanban out": free-form notes,
// pasted email, pasted chat thread. Slack + Teams + Gmail brand chrome was
// removed — those implied integrations we don't ship. The underlying
// thread/email demos are reused, but with neutral chrome.
const SLIDES = [
  { label: 'Notes', Icon: Notepad, color: null },
  { label: 'Email', Icon: Envelope, color: null },
  { label: 'Chat', Icon: ChatsCircle, color: null },
  { label: 'Transcript', Icon: Waveform, color: null },
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
          <div className="w-full shrink-0"><TranscriptDemo active={activeIdx === 3} /></div>
        </div>
      </div>

      {/* Arrow controls */}
      <div className="flex items-center justify-center gap-4 mt-5">
        <button
          onClick={prev}
          className="w-8 h-8 rounded-full border border-[#E0DBD5] flex items-center justify-center text-[#8E8E89] hover:text-[#1B1B18] hover:border-[#1B1B18] transition-colors"
          aria-label="Previous demo"
        >
          <CaretLeft className="w-4 h-4" />
        </button>
        <button
          onClick={next}
          className="w-8 h-8 rounded-full border border-[#E0DBD5] flex items-center justify-center text-[#8E8E89] hover:text-[#1B1B18] hover:border-[#1B1B18] transition-colors"
          aria-label="Next demo"
        >
          <CaretRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

// Accordion item for the FAQ section. All items start collapsed; each
// owns its own open/closed state so multiple can be expanded at once.
// Animation uses the CSS Grid 0fr→1fr trick on the content row so the
// transition runs against the content's natural height — no JS height
// measurement, no library, just one transition rule.
function FaqItem({ question, answer, index }) {
  const [open, setOpen] = useState(false)
  const panelId = `faq-panel-${index}`
  const headerId = `faq-header-${index}`
  return (
    <div>
      <button
        type="button"
        id={headerId}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-4 py-2.5 text-left group cursor-pointer"
      >
        <h3 className="text-lg sm:text-xl font-light text-[var(--text-primary)] tracking-tight leading-snug">
          {question}
        </h3>
        <span
          aria-hidden="true"
          className={`shrink-0 w-5 h-5 flex items-center justify-center text-[var(--text-secondary)] transition-transform duration-200 ${open ? 'rotate-45' : ''}`}
        >
          <Plus size={18} weight="light" />
        </span>
      </button>
      <div
        id={panelId}
        role="region"
        aria-labelledby={headerId}
        className={`grid transition-[grid-template-rows] duration-300 ease-out ${open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}
      >
        <div className="overflow-hidden">
          <p className="pb-3 pr-10 text-sm text-[var(--text-secondary)] leading-relaxed">
            {answer}
          </p>
        </div>
      </div>
    </div>
  )
}

function GoogleGlyph() {
  return (
    <svg width="16" height="16" viewBox="0 0 18 18" aria-hidden="true">
      <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615Z"/>
      <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.71H.957v2.332A8.997 8.997 0 0 0 9 18Z"/>
      <path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z"/>
      <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58Z"/>
    </svg>
  )
}

function HeroAuthCard() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [checking, setChecking] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [googleSubmitting, setGoogleSubmitting] = useState(false)
  const [mode, setMode] = useState('email') // 'email' | 'signin'
  // Transient "you clicked Sign in, here's where to look" highlight.
  // Triggered by the URL hash changing to #sign-in; cleared after a
  // short window so the ring is a momentary cue, not a permanent state.
  const [highlighted, setHighlighted] = useState(false)
  const signIn = useAuthStore((s) => s.signIn)
  const signInWithGoogle = useAuthStore((s) => s.signInWithGoogle)
  const checkEmailExists = useAuthStore((s) => s.checkEmailExists)
  const navigate = useNavigate()

  useEffect(() => {
    const trigger = () => {
      if (window.location.hash !== '#sign-in') return
      // Reset to email step so the input is actually visible — if the
      // user had progressed to the password step and clicks Sign in
      // again, we want to send them back to the start.
      setMode('email')
      window.scrollTo({ top: 0, behavior: 'smooth' })
      setHighlighted(true)
      // Clear the hash so re-clicking the same link re-fires
      // hashchange. Without this, the second click is a no-op.
      window.setTimeout(() => {
        window.history.replaceState(null, '', window.location.pathname)
      }, 50)
      window.setTimeout(() => setHighlighted(false), 1800)
    }
    // Handle the case where the page loads with #sign-in already set
    trigger()
    window.addEventListener('hashchange', trigger)
    return () => window.removeEventListener('hashchange', trigger)
  }, [])

  const handleGoogle = async () => {
    setError('')
    setGoogleSubmitting(true)
    try {
      await signInWithGoogle()
      // Supabase performs a full-page redirect to Google — control won't return here.
    } catch (err) {
      setError(err.message)
      setGoogleSubmitting(false)
    }
  }

  const handleEmailContinue = async (e) => {
    e.preventDefault()
    if (!email) return
    setError('')
    setChecking(true)
    try {
      const exists = await checkEmailExists(email)
      if (exists) {
        setMode('signin')
      } else {
        navigate('/onboarding', { state: { email } })
      }
    } catch (err) {
      // If the lookup itself fails (network, RPC missing, etc.) fall back to
      // showing the password input so the user can still attempt to sign in
      // — wrong path beats a dead-end.
      setMode('signin')
      setError(err?.message || 'Could not verify email. Try signing in.')
    } finally {
      setChecking(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      await signIn(email, password)
      navigate('/dashboard', { replace: true })
    } catch (err) {
      setError(err?.message || 'Sign in failed')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-4 sm:mx-auto w-full max-w-md min-w-[20rem]">
      <div className="bg-[var(--surface-card)] border border-[var(--color-sand)] rounded-[2rem] p-7 shadow-[0_4px_24px_0_rgba(0,0,0,0.04),0_2px_64px_0_rgba(0,0,0,0.02)] space-y-5">
        {error && (
          <InlineNotice variant="error">{error}</InlineNotice>
        )}

        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={handleGoogle}
            disabled={googleSubmitting || submitting}
            className="inline-flex items-center justify-center gap-2 h-11 w-full px-5 rounded-[0.6rem] text-base font-medium border border-[var(--color-sand)] bg-[var(--surface-card)] text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <GoogleGlyph />
            {googleSubmitting ? 'Redirecting…' : 'Continue with Google'}
          </button>

          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-[var(--color-sand)]" />
            <span className="text-[11px] tracking-[0.08em] uppercase text-[var(--text-muted)]">or</span>
            <div className="flex-1 h-px bg-[var(--color-sand)]" />
          </div>

          {mode === 'email' ? (
            <form onSubmit={handleEmailContinue} className="space-y-3">
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                required
                disabled={checking}
                className={`!h-11 !rounded-[0.6rem] !text-base transition-shadow duration-300 ${
                  highlighted
                    ? 'ring-2 ring-[var(--color-olive)] ring-offset-2 ring-offset-[var(--surface-card)]'
                    : ''
                }`}
              />
              <Button
                type="submit"
                size="lg"
                loading={checking}
                loadingText="Checking"
                className="w-full !text-base !rounded-[0.6rem]"
              >
                Continue with email
                <ArrowRight className="w-4 h-4" />
              </Button>
            </form>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="flex items-center gap-2 h-11 px-3 bg-[var(--surface-raised)] border border-[var(--border-default)] rounded-[0.6rem] text-base text-[var(--text-secondary)]">
                <span className="truncate flex-1">{email}</span>
                <button
                  type="button"
                  onClick={() => { setMode('email'); setPassword(''); setError('') }}
                  className="text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)] shrink-0"
                >
                  Change
                </button>
              </div>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
                autoFocus
                className="!h-11 !rounded-[0.6rem] !text-base"
              />
              <Button
                type="submit"
                loading={submitting}
                loadingText="Signing in"
                size="lg"
                className="w-full !text-base !rounded-[0.6rem]"
              >
                Sign in
              </Button>
              <p className="text-center text-xs text-[var(--text-muted)] pt-1">
                Don't have an account?{' '}
                <Link
                  to="/onboarding"
                  state={{ email }}
                  className="text-[var(--text-secondary)] underline underline-offset-2 decoration-[var(--color-sand)] hover:decoration-[var(--text-secondary)] transition-colors"
                >
                  Sign up
                </Link>
              </p>
            </form>
          )}
        </div>

        <p className="text-xs text-[var(--text-muted)] leading-relaxed">
          By continuing, you acknowledge Kolumn's{' '}
          <a
            href="/privacy"
            className="underline underline-offset-[3px] decoration-[var(--color-sand)] hover:decoration-[var(--text-secondary)] text-[var(--text-secondary)]"
          >
            Privacy Policy
          </a>{' '}
          and agree to get occasional product emails and notifications.
        </p>
      </div>
    </div>
  )
}

function MobileNav() {
  const [menuOpen, setMenuOpen] = useState(false)
  return (
    <nav className="sticky top-0 z-50 bg-[var(--surface-page)]">
      {/* Desktop nav */}
      <div className="hidden sm:flex items-center justify-between max-w-[90rem] mx-auto" style={{ width: 'calc(100% - (2 * clamp(2rem, 1.43rem + 2.86vw, 4rem)))' }}>
        <Link
          to="/"
          onClick={() => window.scrollTo(0, 0)}
          aria-label="Kolumn — home"
          className="flex items-center hover:opacity-90 transition-opacity"
        >
          <Kanban size={34} weight="fill" className="text-[var(--color-logo)]" />
          <span className="text-[28px] font-[450] text-[var(--text-primary)] tracking-tight leading-none ml-2 font-logo">Kolumn</span>
        </Link>
        <div className="flex items-center gap-3 py-6">
          <a
            href="#sign-in"
            className="inline-flex items-center justify-center h-9 px-5 min-w-[5rem] whitespace-nowrap text-[15px] font-normal text-[var(--text-secondary)] hover:text-[var(--text-primary)] border-[0.5px] border-[var(--color-sand)] rounded-lg transition-all duration-200"
          >
            Sign in
          </a>
          <Link
            to="/onboarding"
            className="inline-flex items-center justify-center h-9 px-5 min-w-[5rem] whitespace-nowrap text-[15px] font-normal bg-[var(--text-primary)] text-white rounded-lg overflow-hidden transition-transform will-change-transform ease-[cubic-bezier(0.165,0.85,0.45,1)] duration-150 hover:scale-y-[1.015] hover:scale-x-[1.005]"
          >
            Get started
          </Link>
        </div>
      </div>

      {/* Mobile nav */}
      <div className="flex sm:hidden items-center justify-between px-5 py-4">
        <Link
          to="/"
          onClick={() => {
            window.scrollTo(0, 0)
            setMenuOpen(false)
          }}
          aria-label="Kolumn — home"
          className="flex items-center hover:opacity-90 transition-opacity"
        >
          <Kanban size={34} weight="fill" className="text-[var(--color-logo)]" />
          <span className="text-[28px] font-[450] text-[var(--text-primary)] tracking-tight leading-none ml-1.5 font-logo">Kolumn</span>
        </Link>
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="w-9 h-9 flex items-center justify-center rounded-lg text-[var(--text-secondary)] hover:bg-[var(--color-cream-dark)] transition-colors"
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
        >
          {menuOpen ? <X className="w-5 h-5" /> : <List className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile dropdown */}
      {menuOpen && (
        <div className="sm:hidden border-t border-[var(--color-cream-dark)] bg-[var(--surface-page)] px-5 pb-4 pt-3 flex flex-col gap-2 animate-dropdown">
          <a
            href="#sign-in"
            onClick={() => setMenuOpen(false)}
            className="flex items-center justify-center h-10 text-[15px] font-normal text-[var(--text-secondary)] border border-[var(--color-sand)] rounded-lg transition-colors hover:text-[var(--text-primary)]"
          >
            Sign in
          </a>
          <Link
            to="/onboarding"
            className="flex items-center justify-center h-10 text-[15px] font-normal bg-[var(--text-primary)] text-white rounded-lg"
          >
            Get started
          </Link>
        </div>
      )}
    </nav>
  )
}

/*
 * Hero container — three nested layers matching the Anthropic Cowork-style
 * pattern (outer flex → middle card with shadow → inner bordered tile that
 * clips the content). The HeroAnimation is rendered at its native 720×680
 * design size and CSS-scaled so it fills the inner tile without distorting
 * cards/cursor/camera math.
 *
 *   Layer 1  outer flex centered, aspect-ratio 720/680
 *              defines the outer footprint (max-w 720px, height = w * 680/720)
 *   Layer 2  outer card — rounded-[28px] + soft shadow + cream bg
 *              the "frame" you'd see if you took a screenshot of the unit
 *   Layer 3  inner tile — rounded-[24px] + sand border + mauve bg + clip
 *              this is the actual "screen" surface; ref lives here, the
 *              ResizeObserver measures its content-box width to drive scale
 *   Content  scaled HeroAnimation pinned to top-left of the inner tile
 *              transform: scale(min(1, contentW / 720)) — never upscales,
 *              shrinks proportionally on narrower containers down to phone
 *              widths so cards never get clipped on the edges
 */
const HERO_DESIGN_WIDTH = 720
// 830 (portrait, ~0.87:1) — matches Anthropic's hero video aspect of
// 1080/1238 (= 0.872). The taller frame gives the captions, animation
// stage, and cards more vertical breathing room than the prior square.
const HERO_DESIGN_HEIGHT = 830

function ScaledHero() {
  const ref = useRef(null)
  const [scale, setScale] = useState(1)

  useLayoutEffect(() => {
    if (!ref.current) return
    const node = ref.current
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const width = entry.contentRect.width
        setScale(Math.min(1, width / HERO_DESIGN_WIDTH))
      }
    })
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  return (
    <div
      /* max-w 684 = 720 × 0.95 — shrinks the hero 5% on both axes while
         keeping the 720/830 design aspect-ratio. The inner scale math
         picks up automatically (scale = min(1, 684/720) = 0.95). */
      className="relative w-full max-w-[684px] flex items-center justify-center"
      style={{ aspectRatio: `${HERO_DESIGN_WIDTH} / ${HERO_DESIGN_HEIGHT}` }}
    >
      {/* Layer 2 — outer card (frame + shadow). Cream bg is barely visible
          (the inner tile fills it entirely) but the rounded clip + shadow
          live on this layer so the inner border can sit cleanly inside. */}
      <div className="relative w-full h-full rounded-[2rem] bg-[var(--surface-card)] shadow-[0_4px_20px_0_rgba(27,27,24,0.04)] flex justify-center items-center">
        {/* Layer 3 — inner bordered tile (the "screen"). Mauve bg preserves
            the existing brand vibe for captions/brand lockup that sit
            directly on this layer during phases 0-8. */}
        <div
          ref={ref}
          className="relative w-full h-full overflow-hidden rounded-[2rem] border border-[var(--color-sand)] bg-[var(--color-mauve-wash)] font-sans"
        >
          <div
            className="absolute top-0 left-0 origin-top-left"
            style={{
              width: HERO_DESIGN_WIDTH,
              height: HERO_DESIGN_HEIGHT,
              transform: `scale(${scale})`,
            }}
          >
            {/* parentScale lets HeroAnimation convert getBoundingClientRect
                screen-space coords back into design-space — without it the
                drag/cursor/camera math would land 5% short of targets. */}
            <HeroAnimation parentScale={scale} />
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
      <div className="min-h-screen bg-[var(--surface-page)] flex items-center justify-center">
        <div className="text-sm text-[var(--text-muted)]">Loading...</div>
      </div>
    )
  }

  if (user) {
    return <Navigate to="/dashboard" replace />
  }

  return (
    <div className={`landing-font min-h-screen bg-[var(--surface-page)] transition-opacity duration-500 ${visible ? 'opacity-100' : 'opacity-0'}`}>

      {/* ─── Nav ─── */}
      <MobileNav />

      {/* ─── Hero ─── */}
      <section className="relative overflow-hidden">
        <div className="px-6 sm:px-10 pb-8 max-w-[90rem] mx-auto">
          <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_720px] gap-4">
            {/* Left — Copy (center-aligned) */}
            <div className="flex w-full min-h-[85vh] items-center">
            <div className="text-center flex flex-col items-center w-full">
              <h1 className="text-5xl sm:text-6xl lg:text-[3.5rem] xl:text-6xl font-light text-[#1B1B18] tracking-tight leading-[1.08] mb-5">
                Kanban,<br />
                <span className="text-[#8BA32E] font-heading">restored</span>.
              </h1>
              <p className="text-base sm:text-lg text-[#5C5C57] max-w-lg mb-8 leading-relaxed">
                The kanban you talk to.
              </p>
              <HeroAuthCard />
            </div>
            </div>

            {/* Right — Animated hero sequence (sandbox parity).
                ScaledHero renders the animation at its native 720×680 design
                size and CSS-scales it to fit any container width — so it stays
                visible on phones/tablets without cards getting cut on the
                edges. font-sans is set inside ScaledHero to escape the page's
                landing-font (Plus Jakarta Sans) and restore Mona Sans. */}
            <div className="flex justify-center items-center w-full mt-8 xl:mt-0">
              <ScaledHero />
            </div>
          </div>
        </div>
      </section>

      {/* Stats Bar — removed pre-launch (see `stats` removal note near the
          top of this file). Re-add once we have real numbers worth quoting. */}

      {/* ─── AI Demo Slider (Notes + Slack + Teams + Gmail) ─── */}
      <section className="px-6 sm:px-10 py-14 max-w-6xl mx-auto">
        {/* Heading + intro centered */}
        <div className="text-center mb-8 max-w-2xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-light text-[#1B1B18] tracking-tight mb-3">
            Notes in,{' '}
            <span className="text-[#8BA32E] font-heading">Kanban out</span>
          </h2>
          <p className="text-sm text-[#5C5C57] leading-relaxed">
            Type how you think. Kolumn reads notes, threads, and emails — then drops
            structured tasks on the board.
          </p>
        </div>

        {/* Slider with all 4 demo canvases */}
        <div className="flex justify-center">
          <DemoSlider />
        </div>
      </section>

      {/* ─── Pricing ─── */}
      <section className="px-6 sm:px-10 py-20 max-w-[90rem] mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-light text-[var(--text-primary)] tracking-tight mb-2">
            Compare <span className="font-heading">plans</span>
          </h2>
          <p className="text-sm text-[var(--text-secondary)] max-w-md mx-auto">
            Free for solo and small teams. Pro when you want unlimited AI.
          </p>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 max-w-[90rem] mx-auto">
          {PLANS.map((plan) => (
            <PlanCard key={plan.id} plan={plan} mode="landing" />
          ))}
        </div>
      </section>

      {/* ─── FAQ ─── */}
      <section className="px-6 sm:px-10 py-20 max-w-3xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-light text-[var(--text-primary)] tracking-tight mb-2">
            Frequently asked <span className="font-heading">questions</span>
          </h2>
        </div>
        <div className="flex flex-col gap-2">
          {FAQ.map((item, i) => (
            <FaqItem key={item.q} question={item.q} answer={item.a} index={i} />
          ))}
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer className="px-6 sm:px-10 pb-8 pt-4 max-w-5xl mx-auto">
        <div className="border-t border-[var(--color-sand)] pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
            <Kanban size={16} weight="regular" className="text-[var(--text-muted)]" />
            <span className="font-bold font-logo">Kolumn</span>
            <span className="text-[var(--text-muted)] mx-1">&middot;</span>
            <span>Built for teams that ship.</span>
          </div>
          <div className="flex items-center gap-4 text-xs text-[var(--text-muted)]">
            <a href="mailto:hello@kolumn.app" className="hover:text-[var(--text-secondary)] transition-colors">Contact</a>
            <a href="#sign-in" className="hover:text-[var(--text-secondary)] transition-colors">Sign in</a>
            <Link to="/onboarding" className="hover:text-[var(--text-secondary)] transition-colors">Sign up</Link>
          </div>
        </div>
        <p className="text-center text-xs text-[var(--text-faint)] mt-4">&copy; {new Date().getFullYear()} Kolumn. All rights reserved.</p>
      </footer>
    </div>
  )
}
