import { describe, test, expect } from 'vitest'
import { resolveStepRedirect, resumeStep } from '../lib/onboardingSteps'

const user = { id: 'u1' }
describe('resolveStepRedirect', () => {
  test('unauthenticated visitors cannot reach post-signup steps', () => {
    for (const s of ['plan', 'upsell', 'disclaimer', 'name', 'role'])
      expect(resolveStepRedirect(s, { user: null, profile: null })).toBe('terms')
  })
  test('signed-in users skip account creation', () => {
    expect(resolveStepRedirect('details', { user, profile: {} })).toBe('plan')
  })
  test('signed-in users who accepted terms skip the terms step', () => {
    expect(resolveStepRedirect('terms', { user, profile: { terms_accepted_at: 'x' } })).toBe('plan')
  })
  test('OAuth users (no acceptance) still see terms', () => {
    expect(resolveStepRedirect('terms', { user, profile: { terms_accepted_at: null } })).toBe(null)
  })
  test('valid states pass through', () => {
    expect(resolveStepRedirect('terms', { user: null, profile: null })).toBe(null)
    expect(resolveStepRedirect('name', { user, profile: {} })).toBe(null)
  })
  test('already-onboarded users are sent out of the flow', () => {
    expect(resolveStepRedirect('plan', { user, profile: { onboarded_at: 'x', terms_accepted_at: 'x' } })).toBe('done')
  })
})

describe('resumeStep', () => {
  test('no acceptance → terms; accepted → plan', () => {
    expect(resumeStep({ terms_accepted_at: null })).toBe('terms')
    expect(resumeStep({ terms_accepted_at: 'x' })).toBe('plan')
  })
})
