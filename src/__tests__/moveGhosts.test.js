import { describe, test, expect } from 'vitest'
import { buildLastMove, deriveGhosts, interleaveGhosts, resolveGhostIndex } from '../lib/moveGhosts'

describe('buildLastMove', () => {
  test('assembles the denormalized payload from origin, landing, actor', () => {
    const lm = buildLastMove(
      { columnId: 'col-a', position: 2 },
      { columnId: 'col-b', position: 0 },
      { id: 'u1', name: 'Maya', color: 'copper', icon: 'Star', at: '2026-07-21T10:00:00.000Z' },
    )
    expect(lm).toEqual({
      from_column_id: 'col-a', from_position: 2,
      to_column_id: 'col-b', to_position: 0,
      moved_by_id: 'u1', moved_by_name: 'Maya', moved_by_color: 'copper', moved_by_icon: 'Star',
      moved_at: '2026-07-21T10:00:00.000Z',
    })
  })
})

describe('deriveGhosts', () => {
  const cols = ['col-a', 'col-b', 'col-c']
  const move = (from, pos) => ({ from_column_id: from, from_position: pos, moved_by_name: 'Maya' })

  test('empty moves -> empty array', () => {
    expect(deriveGhosts([], cols)).toEqual([])
    expect(deriveGhosts(null, cols)).toEqual([])
  })

  test('places a ghost at the exact origin slot', () => {
    const [g] = deriveGhosts([move('col-a', 3)], cols)
    expect(g.columnId).toBe('col-a')
    expect(g.position).toBe(3)
    expect(g.age).toBe(1)
    expect(g.approximate).toBe(false)
  })

  test('missing position falls back to column top, approximate=true', () => {
    const [g] = deriveGhosts([{ from_column_id: 'col-a', moved_by_name: 'Maya' }], cols)
    expect(g.columnId).toBe('col-a')
    expect(g.position).toBe(0)
    expect(g.approximate).toBe(true)
  })

  test('deleted origin column -> columnId null', () => {
    const [g] = deriveGhosts([move('col-gone', 1)], cols)
    expect(g.columnId).toBeNull()
  })

  test('N moves get ascending age (newest first = age 1)', () => {
    const ghosts = deriveGhosts([move('col-a', 0), move('col-b', 1), move('col-c', 2)], cols)
    expect(ghosts.map((g) => g.age)).toEqual([1, 2, 3])
  })
})

describe('interleaveGhosts', () => {
  test('inserts a ghost at its position among cards', () => {
    const out = interleaveGhosts(['x', 'y', 'z'], [{ position: 1, age: 1 }])
    expect(out).toEqual([
      { type: 'card', id: 'x' },
      { type: 'ghost', ghost: { position: 1, age: 1 } },
      { type: 'card', id: 'y' },
      { type: 'card', id: 'z' },
    ])
  })

  test('position beyond length clamps to the end', () => {
    const out = interleaveGhosts(['x'], [{ position: 9 }])
    expect(out).toEqual([
      { type: 'card', id: 'x' },
      { type: 'ghost', ghost: { position: 9 } },
    ])
  })

  test('no ghosts -> just cards', () => {
    expect(interleaveGhosts(['x', 'y'], [])).toEqual([
      { type: 'card', id: 'x' },
      { type: 'card', id: 'y' },
    ])
  })
})

describe('resolveGhostIndex', () => {
  test('manual order, no filter/sort: absolute position maps 1:1', () => {
    expect(resolveGhostIndex([0, 1, 2, 3], 2)).toBe(2)
  })

  test('filtered/gapped positions: ghost lands before the first rendered card with a >= position', () => {
    expect(resolveGhostIndex([0, 2, 3, 7], 5)).toBe(3)
  })

  test('position beyond the rendered slice clamps to the end', () => {
    expect(resolveGhostIndex([0, 1, 2], 25)).toBe(3)
  })

  test('empty rendered list -> 0', () => {
    expect(resolveGhostIndex([], 5)).toBe(0)
  })
})
