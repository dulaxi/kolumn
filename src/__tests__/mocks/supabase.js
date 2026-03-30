import { vi } from 'vitest'

// Chainable query builder mock
function createQueryBuilder(resolveWith = { data: [], error: null }) {
  const builder = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    upsert: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    gt: vi.fn().mockReturnThis(),
    lt: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue(resolveWith),
    maybeSingle: vi.fn().mockResolvedValue(resolveWith),
    then: vi.fn((resolve) => resolve(resolveWith)),
    // Make builder thenable so `await supabase.from(...).select(...)` works
    [Symbol.toStringTag]: 'Promise',
  }
  // Default resolution for await
  builder.then = (resolve) => Promise.resolve(resolveWith).then(resolve)
  builder.catch = (reject) => Promise.resolve(resolveWith).catch(reject)
  return builder
}

// Channel mock for realtime subscriptions
function createChannelMock() {
  return {
    on: vi.fn().mockReturnThis(),
    subscribe: vi.fn().mockReturnThis(),
    unsubscribe: vi.fn(),
  }
}

export function createMockSupabase() {
  const queryBuilder = createQueryBuilder()

  const supabase = {
    from: vi.fn(() => queryBuilder),
    channel: vi.fn(() => createChannelMock()),
    removeChannel: vi.fn(),
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      signUp: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null }),
      signInWithPassword: vi.fn().mockResolvedValue({ data: { session: { user: { id: 'user-1' } } }, error: null }),
      signOut: vi.fn().mockResolvedValue({ error: null }),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
    },
    _queryBuilder: queryBuilder,
    _createQueryBuilder: createQueryBuilder,
  }

  return supabase
}

// Setup module mock — call this in vi.mock
export function mockSupabaseModule() {
  const mock = createMockSupabase()
  return { supabase: mock }
}
