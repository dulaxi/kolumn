import { describe, test, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useCardEditState } from '../hooks/useCardEditState'

describe('useCardEditState', () => {
  test('returns empty defaults when card is null', () => {
    const { result } = renderHook(() => useCardEditState(null))
    expect(result.current.title).toBe('')
    expect(result.current.description).toBe('')
    expect(result.current.priority).toBe('medium')
    expect(result.current.dueDate).toBe('')
    expect(result.current.pendingLabels).toEqual([])
    expect(result.current.assignees).toEqual([])
    expect(result.current.checklist).toEqual([])
  })

  test('hydrates from card fields (no labels — labels come from store now)', () => {
    const card = {
      title: 'Hello',
      description: 'desc',
      priority: 'high',
      due_date: '2026-04-20',
      assignees: ['Alice'],
      checklist: [{ text: 'todo', done: false }],
    }
    const { result } = renderHook(() => useCardEditState(card))
    expect(result.current.title).toBe('Hello')
    expect(result.current.description).toBe('desc')
    expect(result.current.priority).toBe('high')
    expect(result.current.dueDate).toBe('2026-04-20')
    expect(result.current.pendingLabels).toEqual([])
    // assignees is now an array of { name, id } refs; the legacy names mirror
    // hydrates as free-text (id null).
    expect(result.current.assignees).toEqual([{ name: 'Alice', id: null }])
    expect(result.current.checklist).toEqual([{ text: 'todo', done: false }])
  })

  test('prefers assignee_refs (member ids) when present', () => {
    const card = { assignee_refs: [{ name: 'Alice', id: 'u1' }, { name: 'ext', id: null }], assignees: ['stale'] }
    const { result } = renderHook(() => useCardEditState(card))
    expect(result.current.assignees).toEqual([{ name: 'Alice', id: 'u1' }, { name: 'ext', id: null }])
  })

  test('falls back to assignee_name when assignees array missing', () => {
    const card = { assignee_name: 'Bob' }
    const { result } = renderHook(() => useCardEditState(card))
    expect(result.current.assignees).toEqual([{ name: 'Bob', id: null }])
  })

  test('returns empty assignees when neither field is set', () => {
    const card = {}
    const { result } = renderHook(() => useCardEditState(card))
    expect(result.current.assignees).toEqual([])
  })

  test('clones checklist array (no shared refs)', () => {
    const checklist = [{ text: 'c', done: false }]
    const card = { checklist }
    const { result } = renderHook(() => useCardEditState(card))
    expect(result.current.checklist).not.toBe(checklist)
  })

  test('setters update state', () => {
    const { result } = renderHook(() => useCardEditState({ title: 'a' }))
    act(() => result.current.setTitle('b'))
    expect(result.current.title).toBe('b')
    act(() => result.current.setPriority('low'))
    expect(result.current.priority).toBe('low')
  })

  test('"Untitled task" starts with empty title (new-card placeholder)', () => {
    const card = { title: 'Untitled task' }
    const { result } = renderHook(() => useCardEditState(card, { treatUntitledAsEmpty: true }))
    expect(result.current.title).toBe('')
  })

  test('without treatUntitledAsEmpty, "Untitled task" is preserved', () => {
    const card = { title: 'Untitled task' }
    const { result } = renderHook(() => useCardEditState(card))
    expect(result.current.title).toBe('Untitled task')
  })

  test('starts with empty pendingLabels for new card', () => {
    const { result } = renderHook(() => useCardEditState(null))
    expect(result.current.pendingLabels).toEqual([])
  })

  test('starts with empty pendingLabels for existing card', () => {
    const { result } = renderHook(() => useCardEditState({ id: 'C1', title: 'X' }))
    expect(result.current.pendingLabels).toEqual([])
  })

  test('setPendingLabels updates pendingLabels', () => {
    const { result } = renderHook(() => useCardEditState(null))
    act(() => result.current.setPendingLabels([{ text: 'bug', color: 'red' }]))
    expect(result.current.pendingLabels).toEqual([{ text: 'bug', color: 'red' }])
  })
})
