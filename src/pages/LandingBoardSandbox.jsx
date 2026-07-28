/**
 * Landing — mock board redesign sandbox.
 *
 * Animated hero sequence:
 *   1. QuickAdd pill sits centered on the mauve bg
 *   2. Mouse cursor slides in and hovers the pill
 *   3. Click → pill morphs into the expanded composer (matches QuickAddBar.jsx)
 *   4. Text types out in the textarea
 *   5. Cards stagger in below the composer
 *   6. Hold, then loop
 *
 * Open at /sandbox/landing-board.
 */
import { useEffect, useLayoutEffect, useRef, useState, forwardRef } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { ArrowUp, CalendarDot, CheckCircle, CheckSquare, FileText, Kanban, Plus, Sparkle, Waveform } from '@phosphor-icons/react'
import Avatar from '../components/ui/Avatar'

const DEMO_COLUMNS = [
  { id: 'demo-col-1', title: 'To Do' },
  { id: 'demo-col-2', title: 'In Progress' },
]

// Each card matches one of the comma-separated tasks in TYPED_TEXT
// ("Build pricing page, Stripe integration, Update landing copy") so
// the cards-appear phase reads as "the thing I just typed got sorted
// into a board." All three live in To Do; In Progress stays empty.
const DEMO_CARDS = [
  {
    id: 'demo-1', title: 'Build pricing page',
    description: 'Three tiers: Free, Pro, Team. Monthly + annual toggle.',
    column_id: 'demo-col-1', position: 0, priority: 'high', task_number: 1, completed: false,
    labels: [{ text: 'Frontend', color: 'green' }],
    checklist: [
      { text: 'Plan layout', done: false },
      { text: 'Build cards', done: false },
      { text: 'Add toggle', done: false },
    ],
    due_date: null, assignee_name: 'Aisha', icon: null, board_id: 'demo', archived: false,
  },
  {
    id: 'demo-2', title: 'Stripe integration',
    description: 'Checkout, webhooks, customer portal.',
    column_id: 'demo-col-1', position: 1, priority: 'high', task_number: 2, completed: false,
    labels: [{ text: 'Backend', color: 'red' }],
    checklist: null, due_date: '2026-04-12', assignee_name: 'Marcus',
    icon: null, board_id: 'demo', archived: false,
  },
  {
    id: 'demo-3', title: 'Update landing copy',
    description: 'Sarah feedback — current hero feels too plain.',
    column_id: 'demo-col-1', position: 2, priority: 'medium', task_number: 3, completed: false,
    labels: [{ text: 'Content', color: 'purple' }],
    checklist: null, due_date: null, assignee_name: 'Sarah',
    icon: null, board_id: 'demo', archived: false,
  },
]

const TYPED_TEXT = 'Build pricing page, Stripe integration, Update landing copy'

/**
 * Phase storyboard. Each "caption" phase is a full-page title card
 * with nothing else on screen — the demo elements fade out around it.
 *
 *   0   caption 1 — fullscreen
 *   1   pill visible, cursor enters from off-screen left
 *   2   cursor clicks pill
 *   3   pill morphs to expanded composer
 *   4   caption 2 — fullscreen
 *   5   composer back; typing
 *   6   cursor moves to Send button
 *   7   cursor clicks Send
 *   8   caption 3 — fullscreen
 *   9   cards appear (token-stream reveal)
 *  10   inner cursor enters cards panel, slides to card #2
 *  11   cursor clicks card #2 (lift)
 *  12   stage zooms IN on card #2 (close-up)
 *  13   card #2 drags to In Progress; camera pans to follow
 *  14   stage zooms OUT, hold final state
 *  15   outro fades in (brand + caption + CTA); cursor returns to card 1
 *  16   cursor lands on card 1 — click pulse + lift (rotate 2° + shadow)
 *  17   card 1 drags to In Progress slot 1, cursor follows (1.4s DRAG_EASE)
 *  18   card 1 dropped, lift releases; cursor slides over to card 3
 *  19   cursor lands on card 3 — click pulse + lift
 *  20   card 3 drags to In Progress slot 2, cursor follows
 *  21   card 3 dropped, lift releases; 3s hold, then restart
 */
const CAPTIONS = {
  0: 'Capture every task.',
  4: 'Type how you’d say it.',
  8: 'Live on your board.',
}

const OUTRO_TEXT = 'A kanban that’s still actually a kanban.'

/* macOS-style arrow cursor — original SVG, single drop-shadow. */
function Cursor() {
  return (
    <svg width="22" height="26" viewBox="0 0 22 26" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.25))' }}>
      <path
        d="M3 2.5 L3 21 L7.5 17 L10 23.5 L13 22.5 L10.5 16 L17 16 Z"
        fill="white"
        stroke="rgba(27,27,24,0.9)"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/* Collapsed pill — mirrors QuickAddBar.jsx collapsed state */
function CollapsedPill() {
  return (
    <div className="flex items-center gap-1 h-12 px-2 rounded-[14px] bg-[var(--surface-card)] border border-[var(--color-mist)]">
      <div className="flex items-center justify-center w-9 h-9 rounded-full">
        <Sparkle size={20} weight="fill" className="text-[#D4B8C8]" />
      </div>
      <div className="w-px h-5 bg-[var(--border-default)]" />
      <div className="flex items-center justify-center w-9 h-9 rounded-full">
        <Waveform size={20} weight="regular" className="text-[var(--text-secondary)]" />
      </div>
    </div>
  )
}

/* Expanded composer — exact size + chrome of QuickAddBar.jsx.
   Real: outer wrapper `w-full max-w-2xl px-4` ⇒ inner composer width
   tops out at 672 − 32 = 640px. Shadow values copied verbatim from
   the source so it reads identical. */
function ExpandedComposer({ typed, showCaret }) {
  return (
    <div
      className="flex flex-col bg-[var(--surface-card)] rounded-[20px] border border-transparent w-[640px]"
      style={{ boxShadow: '0 0.25rem 1.25rem rgba(0,0,0,0.035), 0 0 0 0.5px rgba(224,219,213,0.6)' }}
    >
      <div className="flex flex-col m-3.5 gap-3">
        {/* Single-line: long typed strings never wrap to a second row;
            text grows to the right and any overflow is clipped. */}
        <div className="text-[15px] text-[var(--text-primary)] min-h-[1.5rem] pl-1.5 pt-1 leading-snug whitespace-nowrap overflow-hidden">
          {typed.length === 0 ? (
            <span className="text-[var(--text-muted)]">Type a task or paste notes…</span>
          ) : (
            <>
              {typed}
              {showCaret && (
                <span className="inline-block w-[2px] h-[1.05em] -mb-[2px] ml-[1px] align-middle bg-[var(--color-lime-dark)] animate-pulse" />
              )}
            </>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg flex items-center justify-center text-[var(--text-secondary)]">
            <Plus className="w-5 h-5" />
          </div>
          <div className="flex-1" />
          <div className="h-8 w-8 rounded-lg flex items-center justify-center bg-[var(--text-primary)] text-[var(--surface-card)]">
            <ArrowUp className="w-4 h-4" strokeWidth={2.5} />
          </div>
        </div>
      </div>
    </div>
  )
}

/*
 * DemoCard — runs a sequenced reveal per card:
 *   1. Bubble pop (scale + fade in)
 *   2. Title reveals word-by-word (token-stream style, like GPT/Claude)
 *   3. Description reveals word-by-word
 *
 * Cards FIRE rapidly (PER_CARD_MS = stagger between *card starts*),
 * but each card's pop animation still runs at its full POP_MS duration.
 * Result: cards overlap in flight — a snappy chained reveal.
 *
 *   POP_MS       — bubble-pop duration
 *   WORD_DELAY_MS — stagger between consecutive words within a line
 *   WORD_FADE_MS  — each word's own fade-in duration
 *   PER_CARD_MS   — delay from one card's pop start to the next card's pop start
 */
const POP_MS = 350
const WORD_DELAY_MS = 35
const WORD_FADE_MS = 180
const PER_CARD_MS = 700

// Cubic-bezier with steep initial slope (fast first ~40% of duration)
// and a gentle landing (matches the existing easing's settling). Used
// for the drag motion so the card *snaps off* the source slot, then
// glides into the drop slot — feels less linear, more like a real
// pointer drag where the user moves quickly then slows to aim.
const DRAG_EASE = [0.1, 0.55, 0.32, 1]

/* Splits a string into words and renders each word as its own
   motion.span that fades in on a stagger. Whitespace is preserved
   inline by leading-spacing each word after the first. When
   `instant` is true (used by ghost copies), renders the full text
   with no motion. */
function TokenReveal({ text, startSec, instant = false, className, style }) {
  if (instant) {
    return <span className={className} style={style}>{text}</span>
  }
  const words = text.split(' ')
  return (
    <span className={className} style={style}>
      {words.map((word, i) => (
        <motion.span
          key={`${i}-${word}`}
          initial={{ opacity: 0, y: 3 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            delay: startSec + (i * WORD_DELAY_MS) / 1000,
            duration: WORD_FADE_MS / 1000,
            ease: 'easeOut',
          }}
          style={{ display: 'inline-block', whiteSpace: 'pre' }}
        >
          {(i > 0 ? ' ' : '') + word}
        </motion.span>
      ))}
    </span>
  )
}

const DemoCard = forwardRef(function DemoCard({
  card,
  index,
  dragX = 0,
  dragY = 0,
  isLifted = false,
  isStatic = false,
  ghost = false,
  dragDuration = 1.4,
}, ref) {
  const checkColor = card.priority === 'high'
    ? 'text-[var(--color-copper)]'
    : card.priority === 'low'
    ? 'text-[var(--color-lime-dark)]'
    : 'text-[var(--color-honey)]'

  const hasChecklist = Array.isArray(card.checklist) && card.checklist.length > 0
  const checked = hasChecklist ? card.checklist.filter((i) => i.done).length : 0
  const total = hasChecklist ? card.checklist.length : 0
  const checklistComplete = hasChecklist && checked === total

  // Per-card sequence: pop starts at cardStart, title starts streaming
  // immediately after the pop, description starts ~150ms after the title
  // begins (overlap is fine — both are token-streaming, distinct lines).
  const titleWordCount = card.title.split(' ').length
  const cardStart = (index * PER_CARD_MS) / 1000
  const titleStart = cardStart + POP_MS / 1000
  const descStart = titleStart + (titleWordCount * WORD_DELAY_MS + 80) / 1000

  // Ghost copies (used for the "where it'll land" placeholder) skip
  // the entrance animation and render at 0.4 opacity.
  const baseOpacity = ghost ? 0.4 : 1
  const lifted = isLifted && !ghost

  return (
    <motion.div
      ref={ref}
      className="w-full flex flex-col gap-3 rounded-2xl border bg-[var(--surface-card)] border-[var(--color-mist)] p-4 shadow-sm origin-center"
      initial={isStatic
        ? { opacity: baseOpacity, scale: 1, x: dragX, y: dragY, rotate: 0 }
        : { opacity: 0, scale: 0.3 }
      }
      animate={{
        opacity: baseOpacity,
        scale: 1,
        x: dragX,
        y: dragY,
        rotate: lifted ? 2 : 0,
      }}
      style={{
        zIndex: lifted ? 30 : 1,
        position: 'relative',
        boxShadow: lifted
          ? '0 12px 32px -8px rgba(27,27,24,0.22)'
          : undefined,
      }}
      transition={{
        opacity: isStatic
          ? { duration: 0.3, ease: 'easeOut' }
          : { delay: cardStart, duration: POP_MS / 1000, ease: 'easeOut' },
        // Scale uses the entrance bounce on mount; once mounted the
        // value never changes, so motion never tweens it post-mount.
        scale: isStatic
          ? { duration: 0.25, ease: 'easeOut' }
          : { delay: cardStart, duration: POP_MS / 1000, ease: [0.34, 1.56, 0.64, 1] },
        // Drag x and y share duration so the card moves in a straight
        // diagonal line — matches camera pan duration to stay synced.
        // DRAG_EASE makes the first ~40% swift, then settles. Outro
        // drags pass a shorter dragDuration to move 2× faster.
        x: { duration: dragDuration, ease: DRAG_EASE },
        y: { duration: dragDuration, ease: DRAG_EASE },
        rotate: { duration: 0.25, ease: 'easeOut' },
      }}
    >
      {/* Top row: icon + title + check */}
      <div className="flex items-center gap-3">
        <div className="flex w-10 h-10 shrink-0 items-center justify-center rounded-lg border-0.5 border-[var(--border-default)] bg-[var(--surface-raised)]">
          <FileText size={20} weight="regular" className="text-[var(--text-muted)]" />
        </div>
        <div className="flex min-w-0 grow flex-col gap-0.5">
          <div className="flex min-w-0 items-center gap-1.5">
            <TokenReveal
              text={card.title}
              startSec={titleStart}
              instant={isStatic}
              className="text-sm font-medium flex-1 text-[var(--text-primary)]"
            />
            <CheckCircle className={`w-4 h-4 shrink-0 ${checkColor}`} />
          </div>
          <div className="flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
            {card.labels?.length > 0 && card.labels.map((label) => (
              <span key={`${label.text}-${label.color}`} className="font-medium text-[var(--text-secondary)] lowercase">
                /{label.text}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Description — token-streams in AFTER the title finishes */}
      {card.description && (
        <p className="line-clamp-2 text-xs leading-relaxed text-[var(--text-muted)]">
          <TokenReveal text={card.description} startSec={descStart} instant={isStatic} />
        </p>
      )}

      {/* Bottom metadata row */}
      {(card.due_date || hasChecklist || card.assignee_name) && (
        <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
          <div className="flex items-center gap-2">
            {card.due_date && (
              <span className="font-semibold flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] bg-[var(--surface-hover)] text-[var(--text-muted)]">
                <CalendarDot size={12} weight="bold" />
                {new Date(card.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </span>
            )}
            {hasChecklist && (
              <span className={`font-semibold flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] ${
                checklistComplete
                  ? 'bg-[var(--color-lime-wash)] text-[var(--accent-lime-text)]'
                  : 'bg-[var(--surface-hover)] text-[var(--text-muted)]'
              }`}>
                <CheckSquare size={12} weight="bold" />
                {checked}/{total}
              </span>
            )}
          </div>
          {card.assignee_name && (
            <Avatar name={card.assignee_name} size="sm" ringed className="text-[10px]" />
          )}
        </div>
      )}
    </motion.div>
  )
})

/* Mini column — used in phases 9-14. Per-card overrides (drag, lift,
   slide-up offsets) are threaded via the cardOverrides map keyed by
   card id; refs by the cardRefs map. Keeps prop signatures clean as
   the drag choreography grows. */
function MiniColumn({ col, cards, indexOffset = 0, cardOverrides = {}, cardRefs = {} }) {
  return (
    <div className="flex flex-col w-[290px] shrink-0">
      <div className="flex items-center justify-between px-0.5 pb-3">
        <h3
          className="text-sm font-semibold text-[var(--text-primary)]"
          style={{ fontFamily: 'var(--font-sans)' }}
        >
          {col.title}
        </h3>
        <span className="text-xs text-[var(--text-muted)]">{cards.length}</span>
      </div>
      <div className="flex flex-col gap-2 flex-1">
        {cards.map((card, i) => {
          const override = cardOverrides[card.id] || {}
          return (
            <DemoCard
              key={card.id}
              ref={cardRefs[card.id]}
              card={card}
              index={indexOffset + i}
              {...override}
            />
          )
        })}
      </div>
    </div>
  )
}

/* Hero animation orchestrator.
 *
 * parentScale (default 1) lets a transform: scale(...) wrapper above us
 * report its scale factor. getBoundingClientRect() returns post-transform
 * (screen-space) coords, but the card / cursor / camera transforms inside
 * this component apply in pre-transform (design-space) CSS pixels. When
 * the parent shrinks us (e.g., landing's ScaledHero at 0.95×), we have
 * to divide measurements by parentScale so the two coordinate systems
 * agree. With parentScale = 1 this is a no-op (sandbox case).
 */
export function HeroAnimation({ parentScale = 1 } = {}) {
  // See CAPTIONS / storyboard comment above for phase semantics.
  const [phase, setPhase] = useState(0)
  const [typed, setTyped] = useState('')
  const [cycle, setCycle] = useState(0)
  // Independent of phase: flips false BEFORE the next phase begins so
  // the slide-up exit completes within the caption's allotted seconds
  // rather than overflowing into the demo segment.
  const [captionShown, setCaptionShown] = useState(true)

  // Refs + measured stage geometry for the zoom/drag phases.
  const stageRef = useRef(null)
  const card1Ref = useRef(null)
  const card2Ref = useRef(null)
  const card3Ref = useRef(null)
  // Stage geometry — measured at phase 11 entry from refs.
  // We use transformOrigin: 0 0 (top-left) and explicitly translate the
  // stage so the *moving card* sits at the viewport center the entire
  // time the camera is engaged. For any panel point (px, py) and scale S,
  // the pan that brings (px, py) to viewport center (W/2, H/2) is
  //   pan.x = W/2 - px*S
  //   pan.y = H/2 - py*S
  // At zoom-in we use card-2's center; at drag-end we use the drop slot.
  const ZOOM_SCALE = 2
  const [stage, setStage] = useState({
    card1Center: { x: 200, y: 90 },
    card2Center: { x: 200, y: 220 },
    card3Center: { x: 200, y: 350 },
    dropCenter: { x: 510, y: 90 },
    slotDistance: 130,
    dragPx: 310,
    dragYPx: -130,
    zoomedPan: { x: 0, y: 0 },
    dropPan: { x: 0, y: 0 },
  })

  useEffect(() => {
    setPhase(0)
    setTyped('')
    setCaptionShown(true)
    const t = [
      setTimeout(() => setCaptionShown(false), 1800),
      setTimeout(() => setPhase(1),            2300),
      setTimeout(() => setPhase(2),            3700),
      setTimeout(() => setPhase(3),            4050),
      setTimeout(() => setPhase(5),            4550),
      setTimeout(() => setPhase(6),            5850),
      setTimeout(() => setPhase(7),            6650),
      setTimeout(() => { setPhase(8); setCaptionShown(true) }, 7550),
      setTimeout(() => setCaptionShown(false), 9350),
      setTimeout(() => setPhase(9),            9850),
      // Cards finish revealing around 12500ms. Cursor returns at 13000.
      setTimeout(() => setPhase(10),           13000),  // inner cursor enters cards panel
      setTimeout(() => setPhase(11),           13800),  // click card #2 + animated zoom-in (650ms) + lift
      setTimeout(() => setPhase(12),           14550),  // zoom-in done, brief hold (300ms)
      setTimeout(() => setPhase(13),           14850),  // drag + camera pan (1400ms)
      setTimeout(() => setPhase(14),           16250),  // zoom out + hold
      setTimeout(() => setPhase(15),           17050),  // outro fades in; cursor moves to card 1
      setTimeout(() => setPhase(16),           17600),  // cursor on card 1, click + lift
      setTimeout(() => setPhase(17),           17850),  // drag card 1 (0.7s — 2× speed)
      setTimeout(() => setPhase(18),           18550),  // card 1 dropped, cursor → card 3
      setTimeout(() => setPhase(19),           19000),  // cursor on card 3, click + lift
      setTimeout(() => setPhase(20),           19250),  // drag card 3 (0.7s — 2× speed)
      setTimeout(() => setPhase(21),           19950),  // card 3 dropped, hold
      setTimeout(() => setCycle((c) => c + 1), 22950),  // restart (3s hold)
    ]
    return () => t.forEach(clearTimeout)
  }, [cycle])

  // Measure all three To Do cards at phase 10 entry — *before* the
  // cursor starts heading for card #2 — so both its initial-enter
  // position and its animate target use the real measured coords.
  // (Cards finish popping by ~12500ms; phase 10 fires at 13000ms, so
  // the rects are stable.) We need card-1 for slot-1's vertical level
  // (= In Progress slot-1's level, since columns line up), card-2 for
  // zoom focus + drop translation, card-3 for slide-up distance.
  useLayoutEffect(() => {
    if (phase !== 10) return
    if (!card1Ref.current || !card2Ref.current || !card3Ref.current || !stageRef.current) return

    const stageRect = stageRef.current.getBoundingClientRect()
    const c1 = card1Ref.current.getBoundingClientRect()
    const c2 = card2Ref.current.getBoundingClientRect()
    const c3 = card3Ref.current.getBoundingClientRect()

    // Convert screen-space rect coords to design-space by dividing by
    // parentScale (1 in sandbox; <1 when ScaledHero shrinks the wrapper).
    const s = parentScale || 1
    const card1Center = {
      x: ((c1.left + c1.width / 2) - stageRect.left) / s,
      y: ((c1.top + c1.height / 2) - stageRect.top) / s,
    }
    const card2Center = {
      x: ((c2.left + c2.width / 2) - stageRect.left) / s,
      y: ((c2.top + c2.height / 2) - stageRect.top) / s,
    }
    const card3Center = {
      x: ((c3.left + c3.width / 2) - stageRect.left) / s,
      y: ((c3.top + c3.height / 2) - stageRect.top) / s,
    }

    // Slot distance = vertical px between consecutive card centers (design space).
    const slotDistance = card3Center.y - card2Center.y
    // Drop center: TOP-aligned with card 1 (so the dropped card's top
    // edge matches slot 1's top edge regardless of card height
    // differences). x is one column over from card-2's column.
    const card1TopY = (c1.top - stageRect.top) / s
    const c2Height = c2.height / s
    const dropCenter = {
      x: card2Center.x + 310,
      y: card1TopY + c2Height / 2,
    }
    const dragPx = dropCenter.x - card2Center.x
    const dragYPx = dropCenter.y - card2Center.y

    // Camera pans (origin = 0 0): bring focal point to viewport center.
    const viewportW = stageRect.width / s
    const viewportH = stageRect.height / s
    const zoomedPan = {
      x: viewportW / 2 - card2Center.x * ZOOM_SCALE,
      y: viewportH / 2 - card2Center.y * ZOOM_SCALE,
    }
    const dropPan = {
      x: viewportW / 2 - dropCenter.x * ZOOM_SCALE,
      y: viewportH / 2 - dropCenter.y * ZOOM_SCALE,
    }

    setStage({
      card1Center,
      card2Center,
      card3Center,
      dropCenter,
      slotDistance,
      dragPx,
      dragYPx,
      zoomedPan,
      dropPan,
    })
  }, [phase, parentScale])

  // Type-out during phase 5 — 20ms per char (~50 chars/s, brisk).
  useEffect(() => {
    if (phase !== 5) return
    let i = 0
    const interval = setInterval(() => {
      i += 1
      setTyped(TYPED_TEXT.slice(0, i))
      if (i >= TYPED_TEXT.length) clearInterval(interval)
    }, 20)
    return () => clearInterval(interval)
  }, [phase])

  // phase semantics (see storyboard comment at top of file):
  //   0 / 4 / 8  → caption-only (everything else hidden)
  //   1, 2       → pill + cursor
  //   3          → pill morphs to expanded composer
  //   5, 6, 7    → expanded composer + typing/cursor
  //   9-14       → cards (with optional zoom/drag in 10-14)
  const captionPhases = phase === 0 || phase === 4 || phase === 8
  const captionText = CAPTIONS[phase]
  const composerVisible = !captionPhases && phase >= 1 && phase <= 7
  const expanded = phase === 3 || (phase >= 5 && phase <= 7)
  const cardsVisible = phase >= 9 && phase <= 21
  const outroVisible = phase >= 15 && phase <= 21
  const cursorVisible = !captionPhases && phase >= 1 && phase <= 7
  const showCaret = phase === 5

  // Inner cursor — lives inside the stage so it scales with the zoom.
  // Tracks the active card across three drag sequences:
  //   10-12  approach + click card 2 (zoomed in)
  //   13-14  follow card 2 to its drop, sit on it (zoomed out)
  //   15-16  slide left to card 1, click + lift
  //   17     follow card 1 to its drop in IP slot 1
  //   18-19  slide left to card 3 (slid-up at slot 1 of To Do), click + lift
  //   20     follow card 3 to its drop in IP slot 2
  //   21     hidden (final hold — clean frame)
  const innerCursorVisible = phase >= 10 && phase <= 20
  const innerCursorClick = phase === 11 || phase === 16 || phase === 19
  const { innerCursorX, innerCursorY } = (() => {
    if (phase === 13 || phase === 14) {
      return {
        innerCursorX: stage.card2Center.x + stage.dragPx,
        innerCursorY: stage.card2Center.y + stage.dragYPx,
      }
    }
    if (phase === 15 || phase === 16) {
      return { innerCursorX: stage.card1Center.x, innerCursorY: stage.card1Center.y }
    }
    if (phase === 17) {
      return {
        innerCursorX: stage.card1Center.x + stage.dragPx,
        innerCursorY: stage.card1Center.y + stage.slotDistance,
      }
    }
    if (phase === 18 || phase === 19) {
      // Card 3 visually sits one slot up from natural position during 13-19.
      return {
        innerCursorX: stage.card3Center.x,
        innerCursorY: stage.card3Center.y - stage.slotDistance,
      }
    }
    if (phase === 20) {
      return {
        innerCursorX: stage.card3Center.x + stage.dragPx,
        innerCursorY: stage.card3Center.y,
      }
    }
    // Phases 10-12 (approach + click card 2)
    return { innerCursorX: stage.card2Center.x, innerCursorY: stage.card2Center.y }
  })()
  const cursorIsDragging = phase === 13 || phase === 17 || phase === 20
  const cursorTransitionDuration = (() => {
    if (phase === 13) return 1.4              // card 2 drag (full speed)
    if (phase === 17 || phase === 20) return 0.7  // outro drags (2× speed)
    if (phase === 10) return 0.7              // initial approach to card 2
    if (phase === 15) return 0.55             // slide to card 1
    if (phase === 18) return 0.45             // slide from card 1's drop to card 3
    return 0.3                                 // click pulse + small adjustments
  })()
  const cursorTransitionEase = cursorIsDragging ? DRAG_EASE : [0.32, 0, 0.18, 1]

  // Stage transform — scale + camera pan. transformOrigin stays at
  // top-left so x/y are simple "where the panel's (0,0) lives in the
  // viewport." At unscaled state, x=0 y=0 is the natural position.
  // Zoom snaps in instantly on click (phase 11), pans smoothly during
  // drag (phase 13), and zooms back out smoothly at phase 14.
  const zoomedIn = phase >= 11 && phase <= 13
  const stageScale = zoomedIn ? ZOOM_SCALE : 1
  const stageX = phase === 13
    ? stage.dropPan.x
    : zoomedIn
    ? stage.zoomedPan.x
    : 0
  const stageY = phase === 13
    ? stage.dropPan.y
    : zoomedIn
    ? stage.zoomedPan.y
    : 0
  // Transition duration: smooth zoom-in on click (11), brief hold (12),
  // smooth pan during drag (13), smooth zoom-out at 14.
  const stageTransitionDuration = phase === 13 ? 1.4 : 0.65

  // Per-card overrides for the drag choreography.
  //
  // Card 2 — phases 11-13 lifted; 13-onward translated to IP slot 0.
  // Card 1 — phases 16-17 lifted; 17-onward translated to IP slot 1.
  // Card 3 — slid up to slot 1 of To Do during 13-19 to make room for
  //          card 2's drag-over; phases 19-20 lifted; 20-onward
  //          translated to IP slot 2 (un-slides + shifts right).
  //
  // Sequential during outro: card 1 finishes its drag (phase 17→18)
  // before card 3 starts (phase 19). Same drag-and-drop signature as
  // card 2 — rotate 2° + shadow + 1.4s DRAG_EASE — minus the zoom.
  const card1Lifted = phase === 16 || phase === 17
  const card2Lifted = phase >= 11 && phase <= 13
  const card3Lifted = phase === 19 || phase === 20

  const card1Settled = phase >= 17
  const card1DragX = card1Settled ? stage.dragPx : 0
  const card1DragY = card1Settled ? stage.slotDistance : 0

  const card2InIP = phase >= 13
  const card2DragX = card2InIP ? stage.dragPx : 0
  const card2DragY = card2InIP ? stage.dragYPx : 0

  const card3SlidUp = phase >= 13 && phase <= 19
  const card3Settled = phase >= 20
  const card3DragX = card3Settled ? stage.dragPx : 0
  const card3DragY = card3Settled
    ? 0
    : (card3SlidUp ? -stage.slotDistance : 0)

  const cardOverrides = {
    'demo-1': { isLifted: card1Lifted, dragX: card1DragX, dragY: card1DragY, dragDuration: 0.7 },
    'demo-2': { isLifted: card2Lifted, dragX: card2DragX, dragY: card2DragY },
    'demo-3': { isLifted: card3Lifted, dragX: card3DragX, dragY: card3DragY, dragDuration: 0.7 },
  }
  const cardRefs = {
    'demo-1': card1Ref,
    'demo-2': card2Ref,
    'demo-3': card3Ref,
  }

  // Destination ghost — opacity-0.4 placeholder of card-2 sitting at
  // In Progress slot 1, visible during 11-13 to telegraph "this is
  // where it lands." Fades out at phase 14 once the card has settled.
  const ghostVisible = phase >= 11 && phase <= 13

  // Cursor position (% of frame). Scale is handled separately so the
  // click phases (2 and 7) can keyframe scale [1 → 0.85 → 1] for a
  // visible press-and-release pulse instead of just snapping small.
  const cursorPos = (() => {
    switch (phase) {
      case 1: return { left: '46%',  top: '50%' }
      case 2: return { left: '46%',  top: '50%' }
      case 3: return { left: '46%',  top: '62%' }
      case 5: return { left: '46%',  top: '62%' }
      case 6: return { left: '90%',  top: '53%' }
      case 7: return { left: '90%',  top: '53%' }
      default: return { left: '-8%', top: '64%' }
    }
  })()
  const isClick = phase === 2 || phase === 7

  return (
    <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
      {/*
        ─── CAPTION TITLE CARDS ──────────────────────────────────────
        Each caption phase is a fullscreen "title card" with nothing
        else on screen. Clash Grotesk, oversized, ink, centered. The
        previous demo elements fade out around it; new elements fade
        in when the caption fades out.
      */}
      {/*
        Kolumn brand lockup — sits in the top empty space at 25%
        vertically (the midpoint between the frame top and the
        centered caption). Only shows on phase 0 (the first caption).
      */}
      <AnimatePresence>
        {phase === 0 && captionShown && (
          <motion.div
            key="brand"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -28, transition: { duration: 0.5, ease: [0.7, 0, 0.84, 0] } }}
            transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
            className="absolute left-0 right-0 z-30 flex justify-center pointer-events-none"
            style={{ top: '25%', transform: 'translateY(-50%)' }}
          >
            <div className="flex items-center gap-2">
              <Kanban size={28} weight="fill" className="text-[var(--color-logo)]" />
              <span
                className="text-[26px] tracking-tight leading-none text-[var(--text-primary)]"
                style={{ fontFamily: 'Clash Grotesk, system-ui, sans-serif', fontWeight: 500 }}
              >
                Kolumn
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/*
        Composer label — "Type how you'd say it." Lives exactly as long
        as the chat box itself: from phase 3 (composer expansion)
        through phase 7 (Send click + 500ms hold). No animation.
      */}
      {expanded && (
        <div
          className="absolute left-0 right-0 z-30 flex justify-center pointer-events-none"
          style={{ top: '25%', transform: 'translateY(-50%)' }}
        >
          <span
            className="text-center text-[var(--text-primary)] tracking-tight leading-none"
            style={{ fontFamily: 'Clash Grotesk, system-ui, sans-serif', fontWeight: 400, fontSize: '28px' }}
          >
            Type how you’d say it.
          </span>
        </div>
      )}

      <AnimatePresence>
        {captionText && captionShown && (
          <motion.div
            key={`caption-${phase}`}
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            // Slide-up exit fits within the caption's 2.8s allotment
            // (triggered 0.5s before the next phase by captionShown=false).
            exit={{ opacity: 0, y: -56, transition: { duration: 0.5, ease: [0.7, 0, 0.84, 0] } }}
            transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
            className="absolute inset-0 z-30 flex items-center justify-center px-10 pointer-events-none"
          >
            <h2
              className="text-center text-[var(--text-primary)] tracking-tight leading-[1.05]"
              style={{ fontFamily: 'Clash Grotesk, system-ui, sans-serif', fontWeight: 400, fontSize: 'clamp(40px, 6vw, 72px)' }}
            >
              {captionText}
            </h2>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Cursor — only visible during the demo segments; hidden during
          caption-only phases. key={cycle} resets it cleanly every loop. */}
      <AnimatePresence>
        {cursorVisible && (
          <motion.div
            key={`cursor-${cycle}`}
            className="absolute z-20 pointer-events-none"
            initial={{ left: '-8%', top: '64%', scale: 1, opacity: 0 }}
            // On click phases, scale keyframes through [1 → 0.85 → 1]
            // so the press visibly bounces back to natural size.
            animate={{
              ...cursorPos,
              opacity: 1,
              scale: isClick ? [1, 0.85, 1] : 1,
            }}
            exit={{ opacity: 0, transition: { duration: 0.25 } }}
            transition={{
              duration: isClick ? 0.32 : 1.05,
              ease: [0.32, 0, 0.18, 1],
              scale: isClick
                ? { duration: 0.32, times: [0, 0.5, 1], ease: 'easeInOut' }
                : { duration: 0.2 },
            }}
            style={{ x: '-50%', y: '-50%' }}
          >
            <Cursor />
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {composerVisible && (
          <motion.div
            key="composer"
            className="absolute z-10"
            initial={false}
            animate={{ y: expanded ? 0 : 0, opacity: 1 }}
            exit={{ opacity: 0, y: -8, transition: { duration: 0.25 } }}
          >
            <motion.div
              layout
              transition={{ layout: { duration: 0.4, ease: [0.32, 0, 0.18, 1] } }}
            >
              {expanded ? (
                <ExpandedComposer typed={typed} showCaret={showCaret} />
              ) : (
                <CollapsedPill />
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/*
        Cards — appear after submit, wrapped in the browser-window-style
        surface-page panel (traffic lights + soft shadow) the same shape
        we had before. The panel + cards fade in together.
      */}
      <AnimatePresence>
        {cardsVisible && (
          <motion.div
            key="cards"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, transition: { duration: 0.25 } }}
            transition={{ duration: 0.45, ease: 'easeOut' }}
            className="absolute inset-0 p-10 flex"
          >
            {/*
              STAGE — wraps the browser-window panel. Scale + x animate
              on phases 12-13 to drive the zoom-in + camera pan; pinned
              to card-2 center via transformOrigin (set in style, not
              animated, since transformOrigin tweens are jumpy).
            */}
            <motion.div
              ref={stageRef}
              className="flex flex-col h-full w-full rounded-lg overflow-hidden bg-[#FAF8F6] relative"
              style={{
                boxShadow: '0 1px 0 0 rgba(27,27,24,0.04), 0 12px 32px -10px rgba(27,27,24,0.12)',
                transformOrigin: '0 0',
              }}
              animate={{ scale: stageScale, x: stageX, y: stageY }}
              transition={{
                duration: stageTransitionDuration,
                ease: phase === 13 ? DRAG_EASE : [0.32, 0, 0.18, 1],
              }}
            >
              {/* Browser title bar */}
              <div className="flex items-center gap-1.5 px-3 py-2.5 shrink-0">
                <span className="w-2.5 h-2.5 rounded-full bg-[#FF5F57]" />
                <span className="w-2.5 h-2.5 rounded-full bg-[#FEBC2E]" />
                <span className="w-2.5 h-2.5 rounded-full bg-[#28C840]" />
              </div>

              {/* Card columns */}
              <div className="flex-1 overflow-y-auto overflow-x-hidden flex justify-center px-4 pb-6 relative">
                <div className="flex gap-5">
                  {(() => {
                    let runningIndex = 0
                    return DEMO_COLUMNS.map((col) => {
                      const cardsForCol = DEMO_CARDS.filter((c) => c.column_id === col.id)
                      const node = (
                        <MiniColumn
                          key={col.id}
                          col={col}
                          cards={cardsForCol}
                          indexOffset={runningIndex}
                          cardOverrides={cardOverrides}
                          cardRefs={cardRefs}
                        />
                      )
                      runningIndex += cardsForCol.length
                      return node
                    })
                  })()}
                </div>

                {/*
                  Destination ghost — replica of card-2 at 0.4 opacity,
                  pinned to In Progress slot-1 center. Telegraphs "this
                  is where the card will land." Fades in at phase 11
                  (just after lift) and out at phase 14 once the real
                  card has settled into the slot.
                */}
                <motion.div
                  className="absolute pointer-events-none"
                  style={{
                    top: stage.dropCenter.y,
                    left: stage.dropCenter.x,
                    width: 290,
                    transform: 'translate(-50%, -50%)',
                  }}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: ghostVisible ? 1 : 0 }}
                  transition={{ duration: 0.3, ease: 'easeOut' }}
                >
                  <DemoCard
                    card={DEMO_CARDS[1]}
                    index={0}
                    isStatic
                    ghost
                  />
                </motion.div>
              </div>

              {/*
                INNER CURSOR — lives inside the stage so it scales with
                the zoom (cinematic dolly effect). Phases 10-14 only.
                Position is in stage pixel coords; the wrapper centers
                the SVG via translate(-50%, -50%) on a child div.
              */}
              <AnimatePresence>
                {innerCursorVisible && (
                  <motion.div
                    key={`inner-cursor-${cycle}`}
                    className="absolute pointer-events-none"
                    style={{ top: 0, left: 0, zIndex: 40 }}
                    initial={{
                      x: stage.card2Center.x - 90,
                      y: stage.card2Center.y + 70,
                      opacity: 0,
                      scale: 1,
                    }}
                    animate={{
                      x: innerCursorX,
                      y: innerCursorY,
                      opacity: 1,
                      scale: innerCursorClick ? [1, 0.85, 1] : 1,
                    }}
                    exit={{ opacity: 0, transition: { duration: 0.3 } }}
                    transition={{
                      // x/y share duration so the cursor glides in a
                      // straight line. During card-drag phases (13, 17,
                      // 20) the cursor is glued to its card — matches
                      // the card's 1.4s DRAG_EASE. Other phases are
                      // shorter approach moves between targets.
                      x: {
                        duration: cursorTransitionDuration,
                        ease: cursorTransitionEase,
                      },
                      y: {
                        duration: cursorTransitionDuration,
                        ease: cursorTransitionEase,
                      },
                      scale: innerCursorClick
                        ? { duration: 0.32, times: [0, 0.5, 1], ease: 'easeInOut' }
                        : { duration: 0.2 },
                    }}
                  >
                    <div style={{ transform: 'translate(-50%, -50%)' }}>
                      <Cursor />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/*
        OUTRO — phase 15. Sits over the resolved board with a soft mauve
        scrim for legibility. Closing caption (Clash Grotesk) fades up,
        CTA pill follows ~200ms behind. Pill is non-functional inside the
        sandbox (the loop restarts seconds later); the live landing will
        wire its onClick to /onboarding.
      */}
      <AnimatePresence>
        {outroVisible && (
          <motion.div
            key={`outro-${cycle}`}
            className="absolute inset-0 z-40 pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.3 } }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            // Lighter scrim than a full overlay — cards visibly slide
            // into In Progress behind the text. 0.55 keeps the dark-ink
            // caption legible while letting motion peek through.
            style={{ backgroundColor: 'rgba(244, 234, 240, 0.65)' }}
          >
            {/* Brand lockup — bookends the phase-0 placement (top: 25%) */}
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05, duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
              className="absolute left-0 right-0 flex justify-center"
              style={{ top: '25%', transform: 'translateY(-50%)' }}
            >
              <div className="flex items-center gap-2">
                <Kanban size={28} weight="fill" className="text-[var(--color-logo)]" />
                <span
                  className="text-[26px] tracking-tight leading-none text-[var(--text-primary)]"
                  style={{ fontFamily: 'Clash Grotesk, system-ui, sans-serif', fontWeight: 500 }}
                >
                  Kolumn
                </span>
              </div>
            </motion.div>

            {/* Heading + CTA — vertically centered */}
            <div className="absolute inset-0 flex items-center justify-center px-10">
              <div className="flex flex-col items-center gap-7">
                <motion.h2
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                  className="text-center text-[var(--text-primary)] tracking-tight leading-[1.1]"
                  style={{ fontFamily: 'Clash Grotesk, system-ui, sans-serif', fontWeight: 400, fontSize: 'clamp(32px, 4.6vw, 54px)' }}
                >
                  {OUTRO_TEXT}
                </motion.h2>
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.45, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                  className="inline-flex items-center gap-2 px-5 h-11 rounded-full bg-[var(--text-primary)] text-[var(--surface-card)] text-[14px] font-medium tracking-tight"
                  style={{ boxShadow: '0 8px 24px -8px rgba(27,27,24,0.35)' }}
                >
                  Try Kolumn
                  <ArrowUp size={14} weight="bold" style={{ transform: 'rotate(45deg)' }} />
                </motion.div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default function LandingBoardSandbox() {
  return (
    <div className="min-h-screen bg-[var(--surface-page)]">
      <header className="sticky top-0 z-10 flex items-center justify-between px-6 py-3 bg-[var(--surface-card)] border-b border-[var(--border-default)]">
        <h1 className="text-[13px] font-semibold text-[var(--text-primary)]">Landing — mock board sandbox</h1>
        <span className="text-[11px] font-mono text-[var(--text-muted)]">
          src/pages/LandingBoardSandbox.jsx · animated hero sequence
        </span>
      </header>

      <main className="flex items-center justify-center px-6 py-10 min-h-[calc(100vh-49px)]">
        {/* Outer mauve frame, no inner panel — the pill / composer / cards
            sit directly on the mauve bg through the animation. */}
        <div className="relative overflow-hidden w-full max-w-[720px] h-[85vh] min-h-[500px] rounded-[28px] bg-[var(--color-mauve-wash)]">
          <HeroAnimation />
        </div>
      </main>
    </div>
  )
}
