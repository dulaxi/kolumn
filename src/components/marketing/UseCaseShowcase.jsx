import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'

import CardVisual from '../board/CardVisual'
import useReducedMotion from '../../hooks/useReducedMotion'
import { USE_CASES } from '../../content/use-cases'

// The landing page's "is this for me?" section: six examples read as one
// sentence, and the board underneath fills in with whichever one you point
// at.
//
// Design notes, because each of these is load-bearing:
//
// - **The examples stay <Link>s.** They point at real template pages, and
//   that internal linking from the site's highest-authority page is worth
//   more than making them buttons. Hover is a pure enhancement layered on
//   top; it never competes with the click.
//
// - **It cycles on its own until you interact.** A hover-only affordance is
//   invisible — nobody hovers a paragraph. Letting the board advance every
//   AUTO_MS teaches the connection by demonstration, then gets out of the
//   way permanently on the first hover or focus.
//
// - **Touch devices get the cycle, not tap-to-switch.** There is no hover on
//   a phone, and hijacking the tap would trade a real destination (the
//   template page) for a card shuffle. The auto-cycle carries mobile on its
//   own.
//
// - **The board's height is pinned.** Use cases have different card counts,
//   so without a floor the whole page below would jump every few seconds.
//
// - **The swap is Material's "fade through", not an entrance animation.**
//   See the long note beside the keyframes in index.css: the outgoing board
//   leaves *before* the incoming one arrives. Two earlier attempts here
//   animated only an entrance, which pops no matter which entrance you pick,
//   because the outgoing content was still vanishing on a single frame.
//
// - **No aria-live.** This is auto-advancing content, and a live region
//   would interrupt a screen-reader user every AUTO_MS with a board they
//   never asked for. Carousel guidance is explicit that auto-rotating
//   content should not announce itself. The examples above are the
//   accessible interaction point, and focusing one stops the rotation —
//   which is also what satisfies WCAG 2.2.2 (Pause, Stop, Hide) here, since
//   the motion runs longer than five seconds beside other content.
//
// - **Reduced motion skips the state machine entirely** — no fade, no scale,
//   no cycle. Hovering still switches, instantly.

// How long each example holds before the board advances. Tuned for reading,
// not for pace: a three-column board with four cards takes longer than a
// glance to take in, and a strip that flicks past faster than you can read it
// reads as a distraction rather than an invitation. 6.5s also sits inside the
// 5–7s dwell that carousel guidance recommends. Exported so the tests pin the
// real value instead of a copy that can drift out of sync.
export const AUTO_MS = 6500

// Must equal --dur-fade-through-out in index.css: the content swaps at the
// moment the outgoing panel finishes leaving, so this timer and that duration
// are one number living in two places. Same constraint, and same reason, as
// OVERLAY_EXIT_MS / MODAL_EXIT_MS in src/constants/motion.js — a CSS custom
// property isn't readable synchronously without a getComputedStyle round-trip.
export const FADE_OUT_MS = 90

// Tallest column across all six use cases, in cards. Drives the min-height so
// switching between a 2-card column and a 1-card column doesn't reflow the
// page. Derived rather than typed so adding a card to use-cases.js can't
// silently reintroduce the jump.
// Pinning the board's height is what stops the page below it lurching every
// time the board advances. The floor is DERIVED from the content rather than
// typed, so adding a card or a description to use-cases.js can't silently
// reintroduce the jump — which it did once already, when descriptions were
// added and a hardcoded floor stopped covering the tallest column.
//
// The three constants are measured, not guessed: a card is 88px plus the 8px
// gap beneath it, a two-line-clamped description adds 31px, and a column
// header is 32px. Erring a few pixels high costs invisible whitespace; erring
// low costs a visible twitch, so round up when in doubt.
const CARD_PX = 96
const CARD_DESCRIPTION_PX = 31
const COLUMN_HEADER_PX = 32
const COLUMN_GAP_PX = 20

const columnHeight = (cards) =>
  cards.length * CARD_PX + cards.filter((c) => c.description).length * CARD_DESCRIPTION_PX

// Desktop: three columns side by side, so the tallest single column wins.
const BOARD_MIN_HEIGHT = COLUMN_HEADER_PX + Math.max(
  ...USE_CASES.flatMap((u) => u.columns.map((col) => columnHeight(col.cards))),
)

// Mobile: the columns stack, so a use case's whole board is the measurement,
// headers and inter-column gaps included.
const BOARD_MIN_HEIGHT_STACKED = Math.max(
  ...USE_CASES.map((u) =>
    u.columns.reduce((n, col) => n + columnHeight(col.cards) + COLUMN_HEADER_PX, 0)
    + COLUMN_GAP_PX * (u.columns.length - 1),
  ),
)

// 290px is the app's true card width — the same figure the Open Graph cards
// use. Letting the columns flex to fill 1152px would render the product's card
// at roughly twice its real size, which is exactly the fidelity the shared
// CardVisual exists to preserve. Written as a Tailwind literal below rather
// than a constant because the JIT only sees literals.
function BoardColumn({ title, cards }) {
  return (
    <div className="w-full sm:w-[290px] sm:shrink-0">
      {/* Not a heading. This section has no h2 of its own, so an <h3> here
          would skip a level from the page's h1 — and a fake board's column
          names are part of an illustration, not the document outline. */}
      <p className="mb-3 font-sans text-sm font-semibold text-[var(--text-primary)]">{title}</p>
      {/* labelStyle="alt" is the outlined colour pill. The default style
          renders a label as faint lowercase "/catering" text, which reads as a
          path fragment rather than a tag, and loses the colour that makes each
          example feel like a different world. */}
      <div className="flex flex-col gap-2">
        {cards.map((c) => (
          <CardVisual key={c.id} card={c} labels={c.labels} labelStyle="alt" interactive={false} dueDateLabel={c.dueLabel} />
        ))}
      </div>
    </div>
  )
}

export default function UseCaseShowcase() {
  const [active, setActive] = useState(0)
  // 'in' while the board is arriving or settled, 'out' while the previous one
  // is leaving. Flipping the className between the two is what restarts each
  // animation, so no key churn is needed to replay them.
  const [phase, setPhase] = useState('in')
  // Separate from `active` so that stopping the cycle is permanent: once a
  // person has taken control, drifting the board under them again would be the
  // exact annoyance the auto-cycle exists to avoid.
  const [userTookOver, setUserTookOver] = useState(false)
  const reducedMotion = useReducedMotion()
  // A ref, not state, so a hover landing mid-fade retargets the transition
  // already in flight instead of queueing a second one behind it.
  const pendingRef = useRef(null)

  const goTo = useCallback((i) => {
    if (i === active) return
    if (reducedMotion) { setActive(i); return }
    pendingRef.current = i
    setPhase('out')
  }, [active, reducedMotion])

  const takeOver = useCallback((i) => {
    setUserTookOver(true)
    goTo(i)
  }, [goTo])

  // Swap the content at the moment the outgoing panel has finished leaving.
  // This is the half that both earlier attempts were missing.
  useEffect(() => {
    if (phase !== 'out') return undefined
    const t = setTimeout(() => {
      if (pendingRef.current !== null) setActive(pendingRef.current)
      pendingRef.current = null
      setPhase('in')
    }, FADE_OUT_MS)
    return () => clearTimeout(t)
  }, [phase])

  useEffect(() => {
    if (userTookOver || reducedMotion) return undefined
    const id = setInterval(() => {
      // Advance from whatever is already queued, so a tick that lands during
      // a fade doesn't skip an example.
      const from = pendingRef.current ?? active
      goTo((from + 1) % USE_CASES.length)
    }, AUTO_MS)
    return () => clearInterval(id)
  }, [userTookOver, reducedMotion, goTo, active])

  const useCase = USE_CASES[active]

  return (
    <section className="px-6 sm:px-10 pt-4 pb-16 max-w-6xl mx-auto">
      <div className="max-w-3xl mx-auto text-center">
        <p className="font-heading font-[425] text-2xl sm:text-3xl text-[var(--text-primary)] tracking-tight leading-snug">
          {USE_CASES.map((item, i) => (
            <span key={item.to}>
              <Link
                to={item.to}
                onMouseEnter={() => takeOver(i)}
                onFocus={() => takeOver(i)}
                /* nowrap: without it a phrase breaks across lines at narrow
                   widths ("Client / work.") and its underline fragments with
                   it. Breaks now land between examples, never inside one.

                   The active example is inked and thickened rather than given
                   a new colour — lime is a state colour but never a text
                   treatment, and a second hue here would fight the cards
                   below. */
                className={`whitespace-nowrap underline decoration-1 underline-offset-4 transition-colors ${
                  i === active
                    ? 'text-[var(--text-primary)] decoration-[var(--text-primary)] decoration-2'
                    : 'text-[var(--text-secondary)] decoration-[var(--border-default)] hover:decoration-[var(--text-primary)]'
                }`}
              >
                {item.label}
              </Link>
              {i < USE_CASES.length - 1 ? '. ' : '.'}
            </span>
          ))}
        </p>
        <p className="mt-4 text-base text-[var(--text-secondary)] leading-relaxed">
          If it is a list of things that need doing, it goes on a board.
        </p>
      </div>

      <div
        data-usecase-board
        /* --surface-lifted, not --surface-raised: raised (#F2EDE8) is a
           heavy beige against the cream page, and this panel is mostly
           empty space around a few cards. Lifted sits one step LIGHTER
           than the page at the same warmth, so the board reads as raised
           off the page rather than as a well cut into it, and the white
           cards keep their separation via their own border + shadow-sm.
           It theme-flips correctly too: in dark it is #232321 against
           #262624 cards, so the panel still recedes behind them. */
        className="mt-10 rounded-xl border border-[var(--border-default)] bg-[var(--surface-lifted)] p-5 sm:p-7"
      >
        {/* Two floors, because the layout changes: side-by-side columns on
            desktop, stacked on mobile. A plain inline min-height can't carry
            a media query, so both go in as custom properties and the rule in
            index.css picks the right one. */}
        <div
          data-phase={phase}
          className={`usecase-board-row flex flex-col sm:flex-row sm:justify-center gap-5 sm:gap-6 ${
            phase === 'out' ? 'animate-fade-through-out' : 'animate-fade-through-in'
          }`}
          style={{
            '--board-min': `${BOARD_MIN_HEIGHT}px`,
            '--board-min-stacked': `${BOARD_MIN_HEIGHT_STACKED}px`,
          }}
        >
          {useCase.columns.map((col) => (
            <BoardColumn key={`${useCase.label}-${col.title}`} title={col.title} cards={col.cards} />
          ))}
        </div>
      </div>
    </section>
  )
}
