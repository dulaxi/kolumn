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
})
