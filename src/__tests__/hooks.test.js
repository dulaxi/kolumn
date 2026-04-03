import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'

import { useAutoSave } from '../hooks/useAutoSave'
import { useClickOutside } from '../hooks/useClickOutside'

// ─────────────────────────────────────────────
// useAutoSave
// ─────────────────────────────────────────────
describe('useAutoSave', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  test('does not save immediately when scheduleSave is called', () => {
    const saveFn = vi.fn()
    const { result } = renderHook(() => useAutoSave(saveFn, 1000))

    act(() => {
      result.current.scheduleSave()
    })

    expect(saveFn).not.toHaveBeenCalled()
  })

  test('saves after the delay elapses', () => {
    const saveFn = vi.fn()
    const { result } = renderHook(() => useAutoSave(saveFn, 500))

    act(() => {
      result.current.scheduleSave()
    })

    act(() => {
      vi.advanceTimersByTime(500)
    })

    expect(saveFn).toHaveBeenCalledTimes(1)
  })

  test('debounces multiple rapid calls', () => {
    const saveFn = vi.fn()
    const { result } = renderHook(() => useAutoSave(saveFn, 1000))

    act(() => {
      result.current.scheduleSave()
    })
    act(() => {
      vi.advanceTimersByTime(300)
    })
    act(() => {
      result.current.scheduleSave()
    })
    act(() => {
      vi.advanceTimersByTime(300)
    })
    act(() => {
      result.current.scheduleSave()
    })
    act(() => {
      vi.advanceTimersByTime(1000)
    })

    expect(saveFn).toHaveBeenCalledTimes(1)
  })

  test('flushSave triggers save immediately and clears timer', () => {
    const saveFn = vi.fn()
    const { result } = renderHook(() => useAutoSave(saveFn, 1000))

    act(() => {
      result.current.scheduleSave()
    })

    act(() => {
      result.current.flushSave()
    })

    expect(saveFn).toHaveBeenCalledTimes(1)

    // Advancing timer should not trigger again
    act(() => {
      vi.advanceTimersByTime(1000)
    })

    expect(saveFn).toHaveBeenCalledTimes(1)
  })

  test('isDirty returns true after scheduling, false after save', () => {
    const saveFn = vi.fn()
    const { result } = renderHook(() => useAutoSave(saveFn, 500))

    expect(result.current.isDirty).toBe(false)

    act(() => {
      result.current.scheduleSave()
    })

    expect(result.current.isDirty).toBe(true)

    act(() => {
      vi.advanceTimersByTime(500)
    })

    expect(result.current.isDirty).toBe(false)
  })

  test('cleans up timer on unmount', () => {
    const saveFn = vi.fn()
    const { result, unmount } = renderHook(() => useAutoSave(saveFn, 1000))

    act(() => {
      result.current.scheduleSave()
    })

    unmount()

    // Save should have been flushed on unmount
    expect(saveFn).toHaveBeenCalledTimes(1)
  })
})

// ─────────────────────────────────────────────
// useClickOutside
// ─────────────────────────────────────────────
describe('useClickOutside', () => {
  test('calls handler when clicking outside the ref element', () => {
    const handler = vi.fn()
    const { result } = renderHook(() => useClickOutside(handler))

    // Simulate a ref pointing to a DOM element
    const inside = document.createElement('div')
    document.body.appendChild(inside)
    result.current.current = inside

    // Click outside
    const event = new MouseEvent('mousedown', { bubbles: true })
    document.dispatchEvent(event)

    expect(handler).toHaveBeenCalledTimes(1)

    document.body.removeChild(inside)
  })

  test('does not call handler when clicking inside the ref element', () => {
    const handler = vi.fn()
    const { result } = renderHook(() => useClickOutside(handler))

    const inside = document.createElement('div')
    document.body.appendChild(inside)
    result.current.current = inside

    // Click inside
    const event = new MouseEvent('mousedown', { bubbles: true })
    inside.dispatchEvent(event)

    expect(handler).not.toHaveBeenCalled()

    document.body.removeChild(inside)
  })

  test('cleans up listener on unmount', () => {
    const handler = vi.fn()
    const { unmount } = renderHook(() => useClickOutside(handler))

    unmount()

    const event = new MouseEvent('mousedown', { bubbles: true })
    document.dispatchEvent(event)

    expect(handler).not.toHaveBeenCalled()
  })
})
