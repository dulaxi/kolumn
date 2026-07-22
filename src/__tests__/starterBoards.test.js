import { describe, test, expect } from 'vitest'
import { STARTER_BOARDS, getStarterBoard } from '../data/starterBoards'
import { STARTER_PROMPTS } from '../data/starterPrompts'

describe('starter boards', () => {
  test('every starter prompt has a template — no dead-end clicks', () => {
    for (const [role, starters] of Object.entries(STARTER_PROMPTS)) {
      for (const s of starters) {
        expect(getStarterBoard(role, s.id), `${role}/${s.id}`).toBeTruthy()
      }
    }
  })
  test('templates are well-formed', () => {
    for (const [key, t] of Object.entries(STARTER_BOARDS)) {
      expect(t.name, key).toBeTruthy()
      expect(t.columns.length, key).toBeGreaterThanOrEqual(3)
      for (const col of t.columns)
        for (const card of col.cards)
          for (const item of card.checklist || []) {
            expect(item).toHaveProperty('done')
            expect(item).not.toHaveProperty('completed')
          }
    }
  })
})
