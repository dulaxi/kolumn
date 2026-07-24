import { describe, test, expect, vi, beforeEach } from 'vitest'

const inserts = []
vi.mock('../lib/supabase', () => {
  const { createMockSupabase } = require('./mocks/supabase')
  const mock = createMockSupabase()
  const origFrom = mock.from
  mock.from = (table) => {
    const builder = origFrom(table)
    // createMockSupabase() hands back a single shared query-builder instance
    // for every table, so guard the wrap with a flag — otherwise each repeat
    // call to `.from('card_activity')` across tests re-wraps the already
    // wrapped `insert`, and one logical insert compounds into N pushes.
    if (table === 'card_activity' && !builder._activityInsertWrapped) {
      const origInsert = builder.insert
      builder.insert = (row) => { inserts.push(row); return origInsert(row) }
      builder._activityInsertWrapped = true
    }
    return builder
  }
  mock.auth = { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'u1', email: 'u@x.y' } } }) }
  return { supabase: mock }
})
vi.mock('../utils/logger', () => ({ logError: vi.fn() }))

import { logActivity } from '../store/boardStore/helpers'
import { useBoardStore } from '../store/boardStore'
import { useAuthStore } from '../store/authStore'

describe('logActivity v2', () => {
  beforeEach(() => {
    inserts.length = 0
    useAuthStore.setState({ profile: { display_name: 'Dulaxi' } })
    useBoardStore.setState({
      cards: { c1: { id: 'c1', board_id: 'b1', title: 'Redo hero', icon: 'rocket' } },
    })
  })

  test('writes board_id and snapshots card title/icon into meta', async () => {
    await logActivity('c1', 'renamed', 'a → b')
    expect(inserts).toHaveLength(1)
    expect(inserts[0].board_id).toBe('b1')
    expect(inserts[0].meta).toMatchObject({ card_title: 'Redo hero', card_icon: 'rocket' })
  })

  test('boardIdOverride + explicit meta serve the deleted flow (card gone from store)', async () => {
    useBoardStore.setState({ cards: {} })
    await logActivity('c1', 'deleted', null, { card_title: 'Redo hero', card_icon: 'rocket' }, 'b1')
    expect(inserts).toHaveLength(1)
    expect(inserts[0].board_id).toBe('b1')
    expect(inserts[0].meta.card_title).toBe('Redo hero')
  })

  test('skips the insert when no board id is resolvable', async () => {
    useBoardStore.setState({ cards: {} })
    await logActivity('ghost-card', 'renamed', 'x')
    expect(inserts).toHaveLength(0)
  })

  test('caller meta wins over snapshot on key collision', async () => {
    await logActivity('c1', 'moved', 'A → B', { card_title: 'Custom' })
    expect(inserts[0].meta.card_title).toBe('Custom')
  })
})
