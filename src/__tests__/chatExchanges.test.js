import { describe, test, expect } from 'vitest'
import { groupExchanges, splitMentionedIds } from '../lib/chatExchanges'

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

describe('splitMentionedIds', () => {
  const mm = (id, role, mentionedCardIds, cardIds) => ({ id, role, text: id, mentionedCardIds, cardIds })

  test('splits at the last user message; both sides newest message first', () => {
    const { currentRaw, earlierRaw } = splitMentionedIds([
      mm('u1', 'user', ['a']),
      mm('a1', 'assistant', ['b']),
      mm('u2', 'user', ['c']),
      mm('a2', 'assistant', ['d']),
    ])
    expect(currentRaw).toEqual(['d', 'c'])
    expect(earlierRaw).toEqual(['b', 'a'])
  })

  test('no user message means everything is current', () => {
    const { currentRaw, earlierRaw } = splitMentionedIds([
      mm('a1', 'assistant', ['x']),
      mm('a2', 'assistant', ['y']),
    ])
    expect(currentRaw).toEqual(['y', 'x'])
    expect(earlierRaw).toEqual([])
  })

  test('merges mentionedCardIds then legacy cardIds per message, keeping duplicates', () => {
    const { currentRaw, earlierRaw } = splitMentionedIds([
      mm('u1', 'user', ['a'], ['b']),
      mm('a1', 'assistant', ['a'], ['c']),
    ])
    expect(currentRaw).toEqual(['a', 'c', 'a', 'b'])
    expect(earlierRaw).toEqual([])
  })

  test('messages without mention fields contribute nothing', () => {
    const { currentRaw, earlierRaw } = splitMentionedIds([
      mm('u1', 'user'),
      mm('a1', 'assistant'),
    ])
    expect(currentRaw).toEqual([])
    expect(earlierRaw).toEqual([])
  })

  test('empty message list', () => {
    expect(splitMentionedIds([])).toEqual({ currentRaw: [], earlierRaw: [] })
  })
})
