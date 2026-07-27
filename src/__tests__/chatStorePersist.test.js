import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest'
import { useChatStore } from '../store/chatStore'

describe('debounced persist', () => {
  let setItemSpy
  beforeEach(() => {
    vi.useFakeTimers()
    setItemSpy = vi.spyOn(Storage.prototype, 'setItem')
  })
  afterEach(() => {
    vi.runOnlyPendingTimers()
    vi.useRealTimers()
    setItemSpy.mockRestore()
  })

  test('rapid store writes collapse into one localStorage write', () => {
    const id = useChatStore.getState().createConversation()
    setItemSpy.mockClear()
    for (let i = 0; i < 20; i++) {
      useChatStore.getState().addMessage(id, { role: 'assistant', text: `chunk ${i}` })
    }
    expect(setItemSpy).not.toHaveBeenCalled()
    vi.advanceTimersByTime(400)
    expect(setItemSpy).toHaveBeenCalledTimes(1)
    const [, value] = setItemSpy.mock.calls[0]
    expect(value).toContain('chunk 19')
  })

  test('a quota error is swallowed, not thrown', () => {
    setItemSpy.mockImplementation(() => { throw new DOMException('quota', 'QuotaExceededError') })
    const id = useChatStore.getState().createConversation()
    useChatStore.getState().addMessage(id, { role: 'user', text: 'hi' })
    expect(() => vi.advanceTimersByTime(400)).not.toThrow()
  })
})
