import { describe, it, expect, vi } from 'vitest'

vi.mock('react-hot-toast', () => {
  const toast = vi.fn(() => 'toast-id-1')
  toast.dismiss = vi.fn()
  return { default: toast }
})

import toast from 'react-hot-toast'
import { showToast } from '../utils/toast'

describe('showToast.offline', () => {
  it('creates a persistent (Infinity) toast and returns its id', () => {
    const id = showToast.offline("You're offline")
    expect(id).toBe('toast-id-1')
    const opts = toast.mock.calls.at(-1)[1]
    expect(opts.duration).toBe(Infinity)
  })

  it('dismiss proxies to react-hot-toast', () => {
    showToast.dismiss('toast-id-1')
    expect(toast.dismiss).toHaveBeenCalledWith('toast-id-1')
  })
})

describe('toast hue semantics (error-style-decisions-3, 1B + 2B)', () => {
  it('delete is red (destructive receipt), no longer copper', () => {
    showToast.delete('Task deleted — undo?')
    const opts = toast.mock.calls.at(-1)[1]
    expect(opts.style.background).toBe('#B53333')
    expect(opts.style.border).toBe('1px solid #1B1B18')
  })

  it('overdue is honey with ink text (time warning), no longer copper', () => {
    showToast.overdue('Card is overdue')
    const opts = toast.mock.calls.at(-1)[1]
    expect(opts.style.background).toBe('#D4A843')
    expect(opts.style.color).toBe('#1B1B18')
  })

  it('error stays copper (failure hue)', () => {
    showToast.error('Failed')
    expect(toast.mock.calls.at(-1)[1].style.background).toBe('#C27A4A')
  })

  it('pale fills (info, archive) theme via tokens including the border', () => {
    showToast.info('Syncing')
    let opts = toast.mock.calls.at(-1)[1]
    expect(opts.style.background).toBe('var(--toast-info-bg)')
    expect(opts.style.border).toBe('1px solid var(--toast-pale-border)')

    showToast.archive('Task archived')
    opts = toast.mock.calls.at(-1)[1]
    expect(opts.style.background).toBe('var(--toast-archive-bg)')
    expect(opts.style.border).toBe('1px solid var(--toast-pale-border)')
  })
})
