import { describe, test, expect, vi, beforeEach } from 'vitest'

// Thenable chainable query builder: every method returns the builder; awaiting
// it resolves `result`. Captures calls for assertions.
let result
let builder
vi.mock('../lib/supabase', () => ({
  supabase: {
    from: vi.fn((table) => {
      builder.table = table
      return builder
    }),
  },
}))

import {
  threadToRow, rowToThread, messageToRow, rowToMessage,
  fetchThreads, fetchMessages, upsertThread, upsertMessage, deleteThread,
} from '../lib/chatSync'

const makeBuilder = () => {
  const b = {
    table: null,
    select: vi.fn(() => b),
    eq: vi.fn(() => b),
    lt: vi.fn(() => b),
    order: vi.fn(() => b),
    limit: vi.fn(() => b),
    upsert: vi.fn(() => b),
    delete: vi.fn(() => b),
    then: (resolve) => resolve(result),
  }
  return b
}

beforeEach(() => {
  result = { data: [], error: null }
  builder = makeBuilder()
})

describe('row mapping', () => {
  const conv = {
    id: 't1', title: 'Sprint chat', starred: true, titleEdited: true,
    aiTitled: true, railGroupBy: 'board',
    created_at: '2026-07-27T10:00:00.000Z', updated_at: '2026-07-27T11:00:00.000Z',
  }

  test('thread mapping round-trips including flags', () => {
    const row = threadToRow('u1', conv)
    expect(row).toEqual({
      id: 't1', user_id: 'u1', title: 'Sprint chat', starred: true,
      title_edited: true, ai_titled: true, rail_group_by: 'board',
      created_at: conv.created_at, updated_at: conv.updated_at,
    })
    expect(rowToThread(row)).toEqual({ ...conv })
  })

  test('absent flags map to false/null and back to absent', () => {
    const bare = { id: 't2', title: 'Bare', created_at: 'a', updated_at: 'b' }
    const row = threadToRow('u1', bare)
    expect(row.starred).toBe(false)
    expect(row.rail_group_by).toBeNull()
    const back = rowToThread(row)
    expect(back.starred).toBeUndefined()
    expect(back.railGroupBy).toBeUndefined()
  })

  test('message mapping round-trips', () => {
    const msg = {
      id: 'm1', role: 'assistant', text: 'hi', cardIds: ['c9'],
      mentionedCardIds: ['c1'], activities: [{ atChar: 0, icon: 'search', label: 'x' }],
      stopped: true, created_at: '2026-07-27T10:00:00.000Z',
    }
    const row = messageToRow('u1', 't1', msg)
    expect(row).toEqual({
      id: 'm1', thread_id: 't1', user_id: 'u1', role: 'assistant', text: 'hi',
      card_ids: ['c9'], mentioned_card_ids: ['c1'],
      activities: msg.activities, stopped: true, created_at: msg.created_at,
    })
    expect(rowToMessage(row)).toEqual({ ...msg })
  })
})

describe('reads', () => {
  test('fetchThreads is bounded and newest-first', async () => {
    result = { data: [{ id: 't1', title: 'A', created_at: 'a', updated_at: 'b', starred: false, title_edited: false, ai_titled: false, rail_group_by: null }], error: null }
    const res = await fetchThreads()
    expect(res.ok).toBe(true)
    expect(res.data[0].id).toBe('t1')
    expect(builder.table).toBe('chat_threads')
    expect(builder.order).toHaveBeenCalledWith('updated_at', { ascending: false })
    expect(builder.limit).toHaveBeenCalledWith(200)
  })

  test('fetchMessages reverses to chronological and supports the keyset cursor', async () => {
    result = {
      data: [
        { id: 'm2', role: 'assistant', text: 'newer', card_ids: [], mentioned_card_ids: [], activities: [], stopped: false, created_at: '2' },
        { id: 'm1', role: 'user', text: 'older', card_ids: [], mentioned_card_ids: [], activities: [], stopped: false, created_at: '1' },
      ],
      error: null,
    }
    const res = await fetchMessages('t1', { before: '3' })
    expect(res.data.map((m) => m.id)).toEqual(['m1', 'm2'])
    expect(builder.eq).toHaveBeenCalledWith('thread_id', 't1')
    expect(builder.order).toHaveBeenCalledWith('created_at', { ascending: false })
    expect(builder.lt).toHaveBeenCalledWith('created_at', '3')
    expect(builder.limit).toHaveBeenCalledWith(200)
  })

  test('read errors return ok:false without throwing', async () => {
    result = { data: null, error: { message: 'boom' } }
    const res = await fetchThreads()
    expect(res.ok).toBe(false)
  })

  test('a rejected query resolves ok:false instead of throwing', async () => {
    builder.then = () => { throw new Error('network down') }
    const res = await fetchThreads()
    expect(res.ok).toBe(false)
  })

  test('stopped:false rows do not fabricate a stopped key', async () => {
    result = {
      data: [{ id: 'm1', role: 'user', text: 'q', card_ids: [], mentioned_card_ids: [], activities: [], stopped: false, created_at: '1' }],
      error: null,
    }
    const res = await fetchMessages('t1')
    expect('stopped' in res.data[0]).toBe(false)
  })
})

describe('writes', () => {
  test('upsertThread sends the mapped row', async () => {
    result = { error: null }
    const res = await upsertThread('u1', { id: 't1', title: 'X', created_at: 'a', updated_at: 'b' })
    expect(res.ok).toBe(true)
    expect(builder.table).toBe('chat_threads')
    expect(builder.upsert).toHaveBeenCalledWith(expect.objectContaining({ id: 't1', user_id: 'u1' }))
  })

  test('upsertMessage sends the mapped row', async () => {
    result = { error: null }
    await upsertMessage('u1', 't1', { id: 'm1', role: 'user', text: 'q', created_at: 'a' })
    expect(builder.table).toBe('chat_messages')
    expect(builder.upsert).toHaveBeenCalledWith(expect.objectContaining({ id: 'm1', thread_id: 't1', user_id: 'u1' }))
  })

  test('deleteThread deletes by id and write errors return ok:false', async () => {
    result = { error: null }
    expect((await deleteThread('t1')).ok).toBe(true)
    expect(builder.delete).toHaveBeenCalled()
    expect(builder.eq).toHaveBeenCalledWith('id', 't1')
    result = { error: { message: 'nope' } }
    expect((await upsertThread('u1', { id: 't1', title: 'X', created_at: 'a', updated_at: 'b' })).ok).toBe(false)
  })
})
