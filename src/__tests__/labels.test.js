import { describe, it, expect } from 'vitest'
import { selectCardLabels, selectBoardLabels, selectBoardLabelByText } from '../store/selectors'

const state = {
  labels: {
    L1: { id: 'L1', board_id: 'B1', text: 'Bug',      color: 'red',   archived_at: null },
    L2: { id: 'L2', board_id: 'B1', text: 'Frontend', color: 'blue',  archived_at: null },
    L3: { id: 'L3', board_id: 'B1', text: 'Legacy',   color: 'gray',  archived_at: '2026-01-01T00:00:00Z' },
    L4: { id: 'L4', board_id: 'B2', text: 'Other',    color: 'green', archived_at: null },
  },
  cardLabels: {
    C1: new Set(['L1', 'L2']),
    C2: new Set(['L3']),
  },
}

describe('selectCardLabels', () => {
  it('returns active label objects for a card', () => {
    const labels = selectCardLabels('C1')(state)
    expect(labels.map((l) => l.id).sort()).toEqual(['L1', 'L2'])
  })

  it('filters out archived labels', () => {
    const labels = selectCardLabels('C2')(state)
    expect(labels).toEqual([])
  })

  it('returns stable identity for empty result', () => {
    const a = selectCardLabels('NONE')(state)
    const b = selectCardLabels('NONE')(state)
    expect(a).toBe(b)
  })
})

describe('selectBoardLabels', () => {
  it('returns active labels on the board sorted by lower(text)', () => {
    const labels = selectBoardLabels('B1')(state)
    expect(labels.map((l) => l.text)).toEqual(['Bug', 'Frontend'])
  })

  it('excludes labels from other boards', () => {
    const labels = selectBoardLabels('B1')(state)
    expect(labels.find((l) => l.id === 'L4')).toBeUndefined()
  })
})

describe('selectBoardLabelByText', () => {
  it('matches case-insensitively', () => {
    expect(selectBoardLabelByText('B1', 'BUG')(state)?.id).toBe('L1')
    expect(selectBoardLabelByText('B1', 'bug')(state)?.id).toBe('L1')
  })

  it('does not match archived labels', () => {
    expect(selectBoardLabelByText('B1', 'legacy')(state)).toBeUndefined()
  })
})
