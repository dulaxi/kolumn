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
