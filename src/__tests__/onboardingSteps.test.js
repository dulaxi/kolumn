import { describe, it, expect } from 'vitest'
import {
  SHIP_DATE,
  ONBOARDING_STEPS,
  isNewAccount,
  shouldShowChecklist,
} from '../constants/onboarding'

const AFTER = new Date(SHIP_DATE.getTime() + 86400000).toISOString()
const BEFORE = new Date(SHIP_DATE.getTime() - 86400000).toISOString()

const newProfile = (steps = {}) => ({ created_at: AFTER, onboarding_steps: steps })

describe('onboarding step definitions', () => {
  it('defines exactly three steps: board, card, ai', () => {
    expect(ONBOARDING_STEPS.map((s) => s.key)).toEqual(['board', 'card', 'ai'])
    ONBOARDING_STEPS.forEach((s) => {
      expect(s.title).toBeTruthy()
      expect(s.subtitle).toBeTruthy()
    })
  })
})

describe('isNewAccount', () => {
  it('true for accounts created on/after SHIP_DATE', () => {
    expect(isNewAccount({ created_at: AFTER })).toBe(true)
  })
  it('false for older accounts, null, or missing created_at', () => {
    expect(isNewAccount({ created_at: BEFORE })).toBe(false)
    expect(isNewAccount(null)).toBe(false)
    expect(isNewAccount({})).toBe(false)
  })
})

describe('shouldShowChecklist', () => {
  it('shows for a new account with no steps done', () => {
    expect(shouldShowChecklist(newProfile())).toBe(true)
  })
  it('shows while any step is incomplete', () => {
    expect(shouldShowChecklist(newProfile({ board: AFTER, card: AFTER }))).toBe(true)
  })
  it('hides when all three steps are done', () => {
    expect(shouldShowChecklist(newProfile({ board: AFTER, card: AFTER, ai: AFTER }))).toBe(false)
  })
  it('hides when dismissed', () => {
    expect(shouldShowChecklist(newProfile({ dismissed: AFTER }))).toBe(false)
  })
  it('hides for old accounts and missing profiles', () => {
    expect(shouldShowChecklist({ created_at: BEFORE, onboarding_steps: {} })).toBe(false)
    expect(shouldShowChecklist(null)).toBe(false)
  })
  it('tolerates a profile without the onboarding_steps column', () => {
    expect(shouldShowChecklist({ created_at: AFTER })).toBe(true)
  })
})
