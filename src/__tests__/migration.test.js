import { describe, test, expect, vi, beforeEach } from 'vitest'

vi.mock('../lib/supabase', () => {
  const chain = () => ({
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: { id: 'new-1' }, error: null }),
    then: (r) => Promise.resolve({ data: { id: 'new-1' }, error: null }).then(r),
    catch: (r) => Promise.resolve({ data: { id: 'new-1' }, error: null }).catch(r),
  })
  return {
    supabase: {
      from: vi.fn(chain),
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'u1' } } }),
      },
    },
  }
})

import { migrateLocalData, hasLocalData } from '../lib/migrateLocalData'

beforeEach(() => {
  localStorage.clear()
})

describe('hasLocalData', () => {
  test('returns false when no localStorage data', () => {
    expect(hasLocalData()).toBe(false)
  })

  test('returns true when gambit-boards exists', () => {
    localStorage.setItem('gambit-boards', '{}')
    expect(hasLocalData()).toBe(true)
  })

  test('returns true when gambit-notes exists', () => {
    localStorage.setItem('gambit-notes', '{}')
    expect(hasLocalData()).toBe(true)
  })
})

describe('migrateLocalData', () => {
  test('returns false when no localStorage data', async () => {
    expect(await migrateLocalData()).toBe(false)
  })

  test('clears localStorage after successful migration', async () => {
    localStorage.setItem('gambit-boards', JSON.stringify({
      state: {
        boards: { b1: { name: 'Test', columns: [], icon: null, nextTaskNumber: 1 } },
        cards: {},
      },
    }))
    await migrateLocalData()
    expect(localStorage.getItem('gambit-boards')).toBeNull()
  })

  test('returns true after migration', async () => {
    localStorage.setItem('gambit-notes', JSON.stringify({
      state: {
        notes: { n1: { title: 'Note', content: 'Hello' } },
      },
    }))
    expect(await migrateLocalData()).toBe(true)
  })

  test('calls supabase insert for boards and notes', async () => {
    const { supabase } = await import('../lib/supabase')
    localStorage.setItem('gambit-boards', JSON.stringify({
      state: {
        boards: { b1: { name: 'Board', columns: [{ title: 'To Do', cardIds: [] }], icon: 'star', nextTaskNumber: 1 } },
        cards: {},
      },
    }))
    await migrateLocalData()
    expect(supabase.from).toHaveBeenCalledWith('boards')
  })
})
