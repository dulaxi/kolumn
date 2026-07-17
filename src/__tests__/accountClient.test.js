import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest'
import { listSessions, revokeSession, deleteAccount } from '../lib/accountClient'
import { supabase } from '../lib/supabase'

vi.mock('../lib/supabase', () => ({
  supabase: { auth: { getSession: vi.fn() } },
}))

beforeEach(() => {
  supabase.auth.getSession.mockResolvedValue({
    data: { session: { access_token: 'jwt-token' } },
  })
  global.fetch = vi.fn()
})

afterEach(() => vi.restoreAllMocks())

const okJson = (body, status = 200) =>
  Promise.resolve({ ok: status < 400, status, json: () => Promise.resolve(body) })

describe('accountClient', () => {
  test('listSessions returns rows and sends the bearer token', async () => {
    fetch.mockReturnValue(okJson({ sessions: [{ id: 's1', current: true }] }))
    const rows = await listSessions()
    expect(rows).toEqual([{ id: 's1', current: true }])
    const [url, opts] = fetch.mock.calls[0]
    expect(url).toContain('/functions/v1/account/sessions')
    expect(opts.headers.Authorization).toBe('Bearer jwt-token')
  })

  test('revokeSession posts the session id', async () => {
    fetch.mockReturnValue(okJson({ ok: true }))
    await revokeSession('s2')
    const [url, opts] = fetch.mock.calls[0]
    expect(url).toContain('/functions/v1/account/revoke')
    expect(JSON.parse(opts.body)).toEqual({ session_id: 's2' })
  })

  test('deleteAccount attaches blockers on 409', async () => {
    fetch.mockReturnValue(okJson({ error: 'owned_shared_resources', blockers: [{ type: 'board', name: 'Roadmap' }] }, 409))
    await expect(deleteAccount()).rejects.toMatchObject({
      blockers: [{ type: 'board', name: 'Roadmap' }],
    })
  })

  test('throws a friendly error when signed out', async () => {
    supabase.auth.getSession.mockResolvedValue({ data: { session: null } })
    await expect(listSessions()).rejects.toThrow(/signed in/i)
  })
})
