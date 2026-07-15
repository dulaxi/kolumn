import { describe, test, expect, vi, beforeEach } from 'vitest'

vi.mock('../lib/supabase', () => ({
  supabase: {
    functions: { invoke: vi.fn() },
    auth: {
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
    },
  },
}))

import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/authStore'

describe('checkEmailExists error codes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    supabase.functions.invoke.mockClear()
  })

  test('rate_limited becomes a friendly wait message with the code attached', async () => {
    supabase.functions.invoke.mockResolvedValue({
      data: null,
      error: {
        message: 'FunctionsHttpError',
        context: new Response(JSON.stringify({ error: 'rate_limited' }), { status: 429 }),
      },
    })
    await expect(useAuthStore.getState().checkEmailExists('a@b.co')).rejects.toMatchObject({
      code: 'rate_limited',
      message: expect.stringMatching(/too many attempts/i),
    })
  })
})
