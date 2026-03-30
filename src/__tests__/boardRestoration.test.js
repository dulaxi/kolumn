import { describe, test, expect } from 'vitest'
import { resolveActiveBoardId } from '../utils/boardRestoration'

describe('resolveActiveBoardId', () => {
  test('prefers current activeBoardId if valid', () => {
    const boards = { b1: { id: 'b1' }, b2: { id: 'b2' } }
    expect(resolveActiveBoardId(boards, 'b1', 'b2', 'b1')).toBe('b1')
  })

  test('falls back to saved when current is invalid', () => {
    const boards = { b1: { id: 'b1' }, b2: { id: 'b2' } }
    expect(resolveActiveBoardId(boards, 'deleted-id', 'b2', 'b1')).toBe('b2')
  })

  test('accepts __all__ as a valid saved value', () => {
    const boards = { b1: { id: 'b1' } }
    expect(resolveActiveBoardId(boards, null, '__all__', 'b1')).toBe('__all__')
  })

  test('falls back to firstBoardId when nothing else valid', () => {
    const boards = { b1: { id: 'b1' } }
    expect(resolveActiveBoardId(boards, null, null, 'b1')).toBe('b1')
  })

  test('returns null when no boards exist', () => {
    expect(resolveActiveBoardId({}, null, null, null)).toBeNull()
  })
})
