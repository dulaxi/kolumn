import { describe, test, expect } from 'vitest'
import { findMentionedCardIds } from '../lib/cardMentions'

const cards = {
  c1: { id: 'c1', title: 'Landing page redesign' },
  c2: { id: 'c2', title: 'Landing page' },
  c3: { id: 'c3', title: 'Fix' },
  c4: { id: 'c4', title: 'Ship API docs' },
}

describe('findMentionedCardIds', () => {
  test('matches titles case-insensitively', () => {
    expect(findMentionedCardIds('finish the LANDING PAGE tonight', cards)).toEqual(['c2'])
  })

  test('longest overlapping title wins, shorter one does not also match', () => {
    const ids = findMentionedCardIds('the Landing page redesign is due', cards)
    expect(ids).toContain('c1')
    expect(ids).not.toContain('c2')
  })

  test('both match when text mentions both separately', () => {
    const ids = findMentionedCardIds('Landing page redesign blocks the old Landing page', cards)
    expect(ids).toContain('c1')
    expect(ids).toContain('c2')
  })

  test('short titles (<4 chars) only match as whole words', () => {
    expect(findMentionedCardIds('prefix fixed suffix', cards)).toEqual([])
    expect(findMentionedCardIds('please fix the build', cards)).toEqual(['c3'])
  })

  test('repeated mentions of one card yield one id', () => {
    expect(findMentionedCardIds('Fix it. fix it again. Fix!', cards)).toEqual(['c3'])
  })

  test('empty text and empty card map return []', () => {
    expect(findMentionedCardIds('', cards)).toEqual([])
    expect(findMentionedCardIds('hello world', {})).toEqual([])
    expect(findMentionedCardIds('hello world', undefined)).toEqual([])
  })

  test('ignores cards with blank or 1-char titles', () => {
    const weird = { w1: { id: 'w1', title: ' ' }, w2: { id: 'w2', title: 'a' } }
    expect(findMentionedCardIds('a normal sentence', weird)).toEqual([])
  })
})
