import { describe, test, expect } from 'vitest'
import { ONBOARDING_BOARD } from '../data/onboardingBoard'

const allCards = ONBOARDING_BOARD.columns.flatMap((c) => c.cards)

describe('onboarding board data shape', () => {
  test('checklist items use { text, done } — the shape Card.jsx counts', () => {
    for (const card of allCards) {
      for (const item of card.checklist || []) {
        expect(item).toHaveProperty('text')
        expect(item).toHaveProperty('done')
        expect(item).not.toHaveProperty('completed')
      }
    }
  })

  test('welcome card ships with its first checklist item pre-checked', () => {
    const welcome = allCards.find((c) => c.id === 'welcome')
    expect(welcome.checklist[0].done).toBe(true)
  })

  test('Done column only contains completed cards', () => {
    const done = ONBOARDING_BOARD.columns.find((c) => c.id === 'done')
    for (const card of done.cards) expect(card.completed).toBe(true)
  })

  test('the AI card does not promise a chat panel or ⌘K chat', () => {
    const chat = allCards.find((c) => c.id === 'chat')
    expect(chat.description).not.toMatch(/panel on the right/i)
    expect(chat.description).not.toMatch(/⌘K/)
  })
})
