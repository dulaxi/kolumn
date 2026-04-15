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
    expect(result.current.labels).toEqual([])
    expect(result.current.assignees).toEqual([])
    expect(result.current.checklist).toEqual([])
  })

  test('hydrates from card fields', () => {
    const card = {
      title: 'Hello',
      description: 'desc',
      priority: 'high',
      due_date: '2026-04-20',
      labels: [{ text: 'bug', color: 'red' }],
      assignees: ['Alice'],
      checklist: [{ text: 'todo', done: false }],
    }
    const { result } = renderHook(() => useCardEditState(card))
    expect(result.current.title).toBe('Hello')
    expect(result.current.description).toBe('desc')
    expect(result.current.priority).toBe('high')
    expect(result.current.dueDate).toBe('2026-04-20')
    expect(result.current.labels).toEqual([{ text: 'bug', color: 'red' }])
    expect(result.current.assignees).toEqual(['Alice'])
    expect(result.current.checklist).toEqual([{ text: 'todo', done: false }])
  })

  test('falls back to assignee_name when assignees array missing', () => {
    const card = { assignee_name: 'Bob' }
    const { result } = renderHook(() => useCardEditState(card))
    expect(result.current.assignees).toEqual(['Bob'])
  })

  test('returns empty assignees when neither field is set', () => {
    const card = {}
    const { result } = renderHook(() => useCardEditState(card))
    expect(result.current.assignees).toEqual([])
  })

  test('clones labels and checklist arrays (no shared refs)', () => {
    const labels = [{ text: 'l', color: 'blue' }]
    const checklist = [{ text: 'c', done: false }]
    const card = { labels, checklist }
    const { result } = renderHook(() => useCardEditState(card))
    expect(result.current.labels).not.toBe(labels)
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
})
