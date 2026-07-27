import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest'
import { useBoardStore } from '../store/boardStore'
import { waitForRealCardId } from '../store/boardStore/waitForRealCardId'

describe('waitForRealCardId', () => {
  beforeEach(() => {
    useBoardStore.setState({ cards: {}, _tempIdMap: {} })
  })

  test('resolves immediately when the map already has the id', async () => {
    useBoardStore.setState({ _tempIdMap: { 'temp-1': 'real-1' } })
    await expect(waitForRealCardId('temp-1')).resolves.toBe('real-1')
  })

  test('resolves null immediately when the temp card is already gone unmapped', async () => {
    // addCard's failure path removed the optimistic card without mapping it.
    await expect(waitForRealCardId('temp-gone')).resolves.toBeNull()
  })

  test('resolves when the mapping lands later', async () => {
    useBoardStore.setState({ cards: { 'temp-2': { id: 'temp-2' } } })
    const p = waitForRealCardId('temp-2')
    setTimeout(() => {
      useBoardStore.setState({ _tempIdMap: { 'temp-2': 'real-2' } })
    }, 10)
    await expect(p).resolves.toBe('real-2')
  })

  test('the atomic success swap (map + remove in one set) resolves the real id', async () => {
    useBoardStore.setState({ cards: { 'temp-3': { id: 'temp-3' } } })
    const p = waitForRealCardId('temp-3')
    setTimeout(() => {
      useBoardStore.setState({
        cards: { 'real-3': { id: 'real-3' } },
        _tempIdMap: { 'temp-3': 'real-3' },
      })
    }, 10)
    await expect(p).resolves.toBe('real-3')
  })

  test('a failed insert (card removed, never mapped) resolves null before the timeout', async () => {
    useBoardStore.setState({ cards: { 'temp-4': { id: 'temp-4' } } })
    const p = waitForRealCardId('temp-4', { timeoutMs: 60000 })
    const started = Date.now()
    setTimeout(() => {
      useBoardStore.setState({ cards: {} })
    }, 10)
    await expect(p).resolves.toBeNull()
    expect(Date.now() - started).toBeLessThan(5000)
  })

  test('times out to null', async () => {
    vi.useFakeTimers()
    try {
      useBoardStore.setState({ cards: { 'temp-5': { id: 'temp-5' } } })
      const p = waitForRealCardId('temp-5', { timeoutMs: 4000 })
      await vi.advanceTimersByTimeAsync(4000)
      await expect(p).resolves.toBeNull()
    } finally {
      vi.useRealTimers()
    }
  })
})
