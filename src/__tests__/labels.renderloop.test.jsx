// Real-store render-loop regression test.
//
// The existing component tests mock useBoardStore as a plain function that
// runs the selector against a static object. That bypasses Zustand's
// useSyncExternalStore entirely, so it cannot catch a selector that returns
// a non-referentially-stable snapshot — exactly the bug that caused
// "Maximum update depth exceeded" in the browser.
//
// This test uses the *real* useBoardStore and asserts that re-rendering
// a Card and an autocomplete-bearing component completes without React
// throwing the max-update-depth error.

import { describe, test, expect, beforeEach, vi } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import { useBoardStore } from '../store/boardStore'

// Card depends on these stores; mock the ones it reads via simple selectors.
vi.mock('../store/authStore', () => ({
  useAuthStore: vi.fn((sel) => sel({
    profile: { display_name: 'Alice', icon: null, color: 'bg-blue-200' },
  })),
}))
vi.mock('../store/settingsStore', () => ({
  useSettingsStore: vi.fn((sel) => sel({
    font: 'default',
    labelStyle: 'default',
    toggleLabelStyle: vi.fn(),
    iconStyle: 'plain',
    toggleIconStyle: vi.fn(),
  })),
}))
vi.mock('../components/board/DynamicIcon', () => ({
  default: ({ name }) => <span data-testid="icon">{name}</span>,
}))
vi.mock('../lib/toolExecutor', () => ({
  isAICreated: () => false,
}))

// Import after mocks so the real boardStore is used.
const { default: Card } = await import('../components/board/Card')

function seedStore({ withLabels }) {
  useBoardStore.setState({
    cards: {
      c1: { id: 'c1', board_id: 'b1', title: 'Fix login', task_number: 3, priority: 'medium', completed: false, icon: null, checklist: [] },
    },
    labels: withLabels
      ? { l1: { id: 'l1', board_id: 'b1', text: 'bug', color: 'red', archived_at: null } }
      : {},
    cardLabels: withLabels ? { c1: new Set(['l1']) } : {},
  })
}

const card = {
  id: 'c1', board_id: 'b1', title: 'Fix login',
  task_number: 3, priority: 'medium', completed: false,
  icon: null, checklist: [], assignee_name: '',
}

describe('Render loop regression (real Zustand store)', () => {
  beforeEach(() => {
    useBoardStore.setState({
      cards: {},
      labels: {},
      cardLabels: {},
      _tempIdMap: {},
    })
  })

  test('Card with NO labels mounts without max-update-depth error', () => {
    seedStore({ withLabels: false })
    expect(() => render(<Card card={card} onClick={vi.fn()} />)).not.toThrow()
  })

  test('Card WITH labels mounts without max-update-depth error', () => {
    // This is the bug case: selectCardLabels returns a non-empty array,
    // which historically built a fresh array on every call and made
    // useSyncExternalStore's getSnapshot() unstable.
    seedStore({ withLabels: true })
    expect(() => render(<Card card={card} onClick={vi.fn()} />)).not.toThrow()
    expect(screen.getByText('/bug')).toBeInTheDocument()
  })

  test('Card re-renders cleanly when an unrelated state slice updates', () => {
    seedStore({ withLabels: true })
    const { rerender } = render(<Card card={card} onClick={vi.fn()} />)
    // Trigger an unrelated state update. If the selector were unstable,
    // this would cascade into a render loop.
    act(() => {
      useBoardStore.setState((s) => ({ ...s, _tempIdMap: { 'temp-x': 'real-x' } }))
    })
    expect(() => rerender(<Card card={card} onClick={vi.fn()} />)).not.toThrow()
    expect(screen.getByText('/bug')).toBeInTheDocument()
  })

  test('selectCardLabels returns SAME reference across reads while state is unchanged', async () => {
    seedStore({ withLabels: true })
    const { selectCardLabels } = await import('../store/selectors')
    const state = useBoardStore.getState()
    const a = selectCardLabels('c1')(state)
    const b = selectCardLabels('c1')(state)
    expect(a).toBe(b)
  })

  test('selectCardLabels returns a NEW reference once cardLabels changes', async () => {
    seedStore({ withLabels: true })
    const { selectCardLabels } = await import('../store/selectors')
    const a = selectCardLabels('c1')(useBoardStore.getState())
    act(() => {
      useBoardStore.setState((s) => ({
        cardLabels: { ...s.cardLabels, c1: new Set(['l1']) },
      }))
    })
    const b = selectCardLabels('c1')(useBoardStore.getState())
    expect(a).not.toBe(b)
  })
})

describe('LabelAutocomplete render loop (real store)', () => {
  beforeEach(() => {
    useBoardStore.setState({
      cards: {},
      labels: {
        L1: { id: 'L1', board_id: 'B1', text: 'Frontend', color: 'blue', archived_at: null },
        L2: { id: 'L2', board_id: 'B1', text: 'Backend',  color: 'green', archived_at: null },
      },
      cardLabels: {},
      _tempIdMap: {},
    })
  })

  test('mounts without max-update-depth error', async () => {
    const { default: LabelAutocomplete } = await import('../components/board/LabelAutocomplete')
    expect(() =>
      render(
        <LabelAutocomplete
          boardId="B1"
          excludeIds={[]}
          onPick={vi.fn()}
          onCreate={vi.fn()}
          onManage={vi.fn()}
        />,
      ),
    ).not.toThrow()
  })

  test('selectBoardLabels referential stability holds across renders', async () => {
    const { selectBoardLabels } = await import('../store/selectors')
    const a = selectBoardLabels('B1')(useBoardStore.getState())
    const b = selectBoardLabels('B1')(useBoardStore.getState())
    expect(a).toBe(b)
  })
})

describe('LabelManagerModal render loop (real store)', () => {
  beforeEach(() => {
    useBoardStore.setState({
      cards: { c1: { id: 'c1', board_id: 'B1' } },
      labels: {
        L1: { id: 'L1', board_id: 'B1', text: 'Frontend', color: 'blue', archived_at: null },
        L2: { id: 'L2', board_id: 'B1', text: 'Backend',  color: 'green', archived_at: null },
      },
      cardLabels: { c1: new Set(['L1']) },
      _tempIdMap: {},
    })
  })

  test('mounts open without max-update-depth error', async () => {
    const { default: LabelManagerModal } = await import('../components/board/LabelManagerModal')
    expect(() =>
      render(<LabelManagerModal open onClose={vi.fn()} boardId="B1" />),
    ).not.toThrow()
  })
})

