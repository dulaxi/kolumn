import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, act, within, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'

// Hoisted so the mock factory below can reach it — vi.mock is lifted above
// the imports, so a plain `let` declared here would still be in the TDZ when
// the factory runs.
const { reduced } = vi.hoisted(() => ({ reduced: { value: false } }))
vi.mock('../hooks/useReducedMotion', () => ({ default: () => reduced.value }))

import UseCaseShowcase, { AUTO_MS, FADE_OUT_MS } from '../components/marketing/UseCaseShowcase'
import { USE_CASES } from '../content/use-cases'

// The board under the use-case sentence advances on its own until someone
// hovers an example, then holds. Both halves matter: without the cycle the
// hover affordance is undiscoverable (nobody hovers a paragraph), and without
// the permanent stop the board drifts out from under whoever just took
// control — which is the exact annoyance the cycle exists to avoid.

function renderShowcase() {
  return render(<MemoryRouter><UseCaseShowcase /></MemoryRouter>)
}

// The visible board, found by its own data attribute rather than by any card
// text, so these assertions don't re-encode the content of use-cases.js.
// (It used to be found by aria-live; that was removed — auto-advancing
// content must not announce itself to a screen reader.)
function board() {
  return document.querySelector('[data-usecase-board]')
}

function panel() {
  return board().firstElementChild
}

// One full advance = a dwell, then the outgoing panel's exit. These have to be
// two separate act() calls: the interval firing inside the first one sets the
// 'out' phase, but React only commits the effect that schedules the 90ms exit
// timer when act() returns — so a single combined advance would step past the
// dwell without ever registering the timer that completes the swap.
function advanceCycles(n = 1) {
  for (let i = 0; i < n; i += 1) {
    act(() => { vi.advanceTimersByTime(AUTO_MS) })
    act(() => { vi.advanceTimersByTime(FADE_OUT_MS) })
  }
}

function showingUseCase(i) {
  const firstCardTitle = USE_CASES[i].columns[0].cards[0].title
  return within(board()).queryByText(firstCardTitle) !== null
}

beforeEach(() => {
  reduced.value = false
})

afterEach(() => {
  vi.useRealTimers()
})

describe('UseCaseShowcase', () => {
  test('renders the first use case before any interaction', () => {
    renderShowcase()
    expect(showingUseCase(0)).toBe(true)
  })

  test('advances on its own so the interaction is discoverable', () => {
    vi.useFakeTimers()
    renderShowcase()
    expect(showingUseCase(0)).toBe(true)
    advanceCycles()
    expect(showingUseCase(0)).toBe(false)
    expect(showingUseCase(1)).toBe(true)
  })

  test('wraps around rather than stopping at the last use case', () => {
    vi.useFakeTimers()
    renderShowcase()
    advanceCycles(USE_CASES.length)
    expect(showingUseCase(0)).toBe(true)
  })

  test('hovering an example shows that use case', async () => {
    const user = userEvent.setup()
    renderShowcase()
    await user.hover(screen.getByRole('link', { name: USE_CASES[3].label }))
    await waitFor(() => expect(showingUseCase(3)).toBe(true))
  })

  test('hovering stops the cycle permanently', () => {
    // fireEvent rather than userEvent here: userEvent awaits its own internal
    // delays, which deadlocks against fake timers unless its clock is wired
    // up exactly right. This test is about the interval, not about faithfully
    // simulating a pointer, so the synchronous event is the better tool.
    // React synthesises onMouseEnter from a bubbling mouseover.
    vi.useFakeTimers()
    renderShowcase()

    fireEvent.mouseOver(screen.getByRole('link', { name: USE_CASES[3].label }))
    act(() => { vi.advanceTimersByTime(FADE_OUT_MS) })
    expect(showingUseCase(3)).toBe(true)

    // Three full cycle intervals with no further interaction: the board must
    // still be showing what the person chose.
    advanceCycles(3)
    expect(showingUseCase(3)).toBe(true)
  })

  test('keyboard focus takes over too, not just the mouse', async () => {
    const user = userEvent.setup()
    renderShowcase()
    await user.tab()
    // First focusable in this section is the first example link.
    expect(showingUseCase(0)).toBe(true)
    expect(document.activeElement).toHaveAttribute('href', USE_CASES[0].to)
  })

  test('reduced motion suppresses the cycle entirely', () => {
    reduced.value = true
    vi.useFakeTimers()
    renderShowcase()
    advanceCycles(4)
    expect(showingUseCase(0)).toBe(true)
  })

  test('every example links to its template page', () => {
    renderShowcase()
    for (const { label, to } of USE_CASES) {
      expect(screen.getByRole('link', { name: label })).toHaveAttribute('href', to)
    }
  })

  test('the board is announced politely rather than mutating silently', () => {
    renderShowcase()
    expect(board()).toBeInTheDocument()
  })

  // The column names change per use case (a wedding board has no "Doing"),
  // except the first, which stays generic on purpose: it is the prerendered
  // default and it names the exact three columns the hero's sub-line just
  // promised. Both halves are load-bearing, so both are pinned.
  test('the default use case shows the three columns the hero promises', () => {
    renderShowcase()
    for (const name of ['To do', 'Doing', 'Done']) {
      expect(within(board()).getByText(name)).toBeInTheDocument()
    }
  })

  test('other use cases rename their columns to fit', () => {
    vi.useFakeTimers()
    renderShowcase()
    const sprint = USE_CASES.find((u) => u.label === 'This sprint')
    fireEvent.mouseOver(screen.getByRole('link', { name: sprint.label }))
    act(() => { vi.advanceTimersByTime(FADE_OUT_MS) })
    for (const col of sprint.columns) {
      expect(within(board()).getByText(col.title)).toBeInTheDocument()
    }
    expect(within(board()).queryByText('Doing')).toBeNull()
  })

  // Every use case must still be a three-column board — the shape is what
  // stays recognisable while the names change.
  test('every use case has exactly three columns', () => {
    for (const u of USE_CASES) expect(u.columns).toHaveLength(3)
  })

  // Material's fade-through: the outgoing panel leaves completely, THEN the
  // incoming one arrives scaling up from 92%. Overlapping them would show
  // both at half opacity ("double vision"), which is why the swap is
  // sequential and why the component holds an explicit 'out' phase.
  //
  // Two earlier attempts animated only an entrance, with no exit at all — so
  // the outgoing board vanished on a single frame no matter which entrance
  // was used. This test is the regression guard for that whole class of bug.
  test('the outgoing board fades out before the new one is swapped in', () => {
    vi.useFakeTimers()
    renderShowcase()
    expect(panel().className).toContain('animate-fade-through-in')

    fireEvent.mouseOver(screen.getByRole('link', { name: USE_CASES[3].label }))
    // Mid-transition: still showing the OLD content, now leaving.
    expect(panel().className).toContain('animate-fade-through-out')
    expect(showingUseCase(0)).toBe(true)
    expect(showingUseCase(3)).toBe(false)

    act(() => { vi.advanceTimersByTime(FADE_OUT_MS) })
    // Only now does the content change, and it arrives rather than pops.
    expect(showingUseCase(3)).toBe(true)
    expect(panel().className).toContain('animate-fade-through-in')
  })

  test('a hover landing mid-fade retargets instead of queueing a second swap', () => {
    vi.useFakeTimers()
    renderShowcase()
    fireEvent.mouseOver(screen.getByRole('link', { name: USE_CASES[1].label }))
    fireEvent.mouseOver(screen.getByRole('link', { name: USE_CASES[4].label }))
    act(() => { vi.advanceTimersByTime(FADE_OUT_MS) })
    expect(showingUseCase(4)).toBe(true)
    // and it settles there rather than continuing on to the first target
    act(() => { vi.advanceTimersByTime(1000) })
    expect(showingUseCase(4)).toBe(true)
  })

  test('reduced motion swaps instantly, with no out phase at all', () => {
    reduced.value = true
    renderShowcase()
    fireEvent.mouseOver(screen.getByRole('link', { name: USE_CASES[2].label }))
    expect(showingUseCase(2)).toBe(true)
    expect(panel().className).not.toContain('animate-fade-through-out')
  })

  // A real due_date would rot: every helper in dateUtils is relative to now,
  // so a hardcoded date renders copper and "overdue" a few months after it
  // ships, and one computed at render time breaks hydration against the
  // build-time prerender. Deadlines here are evergreen literals instead.
  test('no card carries a real due_date, and no deadline is an absolute date', () => {
    const cards = USE_CASES.flatMap((u) => u.columns.flatMap((c) => c.cards))
    for (const c of cards) {
      expect(c.due_date, `${c.title} must use dueLabel, not due_date`).toBeUndefined()
      if (c.dueLabel) {
        // "Mar 3" or "12/04" would go stale; "Fri" and "Next Tue" never do.
        expect(c.dueLabel, `${c.title}: "${c.dueLabel}" looks like a fixed date`)
          .not.toMatch(/\d{2,}|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec/i)
      }
    }
  })

  test('deadlines and descriptions actually render on the cards', () => {
    renderShowcase()
    const withDue = USE_CASES[0].columns.flatMap((c) => c.cards).find((c) => c.dueLabel)
    const withDesc = USE_CASES[0].columns.flatMap((c) => c.cards).find((c) => c.description)
    expect(withDue && withDesc).toBeTruthy()
    expect(within(board()).getByText(withDue.dueLabel)).toBeInTheDocument()
    expect(within(board()).getByText(withDesc.description)).toBeInTheDocument()
  })

  // Guards the fidelity decision: these are the app's real cards at the app's
  // real width, not marketing lookalikes. A card rendered at column width
  // (~1100px here) would be roughly four times its true size.
  test('cards render at the app width, not stretched to the container', () => {
    renderShowcase()
    const columns = panel().children
    expect(columns).toHaveLength(3)
    for (const col of columns) {
      expect(col.className).toContain('sm:w-[290px]')
    }
  })
})
