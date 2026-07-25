import { describe, test, expect } from 'vitest'
import { groupExchanges } from '../lib/chatExchanges'

const m = (id, role) => ({ id, role, text: id })

describe('groupExchanges', () => {
  test('groups user + following assistant messages, newest first', () => {
    const groups = groupExchanges([m('u1', 'user'), m('a1', 'assistant'), m('u2', 'user'), m('a2', 'assistant'), m('a3', 'assistant')])
    expect(groups).toHaveLength(2)
    expect(groups[0].key).toBe('u2')
    expect(groups[0].user.id).toBe('u2')
    expect(groups[0].replies.map((r) => r.id)).toEqual(['a2', 'a3'])
    expect(groups[1].key).toBe('u1')
    expect(groups[1].replies.map((r) => r.id)).toEqual(['a1'])
  })

  test('empty list returns empty array', () => {
    expect(groupExchanges([])).toEqual([])
  })

  test('leading assistant message forms a user-less group', () => {
    const groups = groupExchanges([m('a0', 'assistant'), m('u1', 'user')])
    expect(groups).toHaveLength(2)
    expect(groups[0].user.id).toBe('u1')
    expect(groups[1].user).toBeNull()
    expect(groups[1].replies.map((r) => r.id)).toEqual(['a0'])
  })
})
