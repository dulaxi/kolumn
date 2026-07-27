import { describe, test, expect, vi, beforeEach } from 'vitest'

vi.mock('../lib/supabase', () => ({
  supabase: { auth: { getSession: vi.fn().mockResolvedValue({ data: { session: { access_token: 'tok' } } }) } },
}))
vi.mock('../lib/env', () => ({ env: { supabaseUrl: 'http://test', supabaseAnonKey: 'anon' } }))

import { streamChat } from '../lib/aiClient'

describe('streamChat abort', () => {
  beforeEach(() => { global.fetch = vi.fn() })

  test('fetch AbortError resolves via onDone(aborted), not onError', async () => {
    const err = new Error('The user aborted a request.')
    err.name = 'AbortError'
    global.fetch.mockRejectedValue(err)
    const onDone = vi.fn()
    const onError = vi.fn()
    await streamChat(
      { message: 'hi', mode: 'chat' },
      { onText: vi.fn(), onDone, onError },
      { signal: new AbortController().signal },
    )
    expect(onDone).toHaveBeenCalledWith({ stopReason: 'aborted' })
    expect(onError).not.toHaveBeenCalled()
  })

  test('the signal is passed through to fetch', async () => {
    const controller = new AbortController()
    global.fetch.mockResolvedValue({ ok: true, body: null })
    await streamChat(
      { message: 'hi', mode: 'chat' },
      { onText: vi.fn(), onDone: vi.fn(), onError: vi.fn() },
      { signal: controller.signal },
    )
    expect(global.fetch.mock.calls[0][1].signal).toBe(controller.signal)
  })
})
