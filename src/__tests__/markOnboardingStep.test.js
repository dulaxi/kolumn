import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useAuthStore } from '../store/authStore'
import { SHIP_DATE } from '../constants/onboarding'

const AFTER = new Date(SHIP_DATE.getTime() + 86400000).toISOString()
const BEFORE = new Date(SHIP_DATE.getTime() - 86400000).toISOString()

function arrange(profile) {
  const updateProfile = vi.fn().mockResolvedValue({})
  useAuthStore.setState({ profile, updateProfile })
  return updateProfile
}

describe('markOnboardingStep', () => {
  beforeEach(() => {
    useAuthStore.setState({ profile: null })
  })

  it('records a step with an ISO timestamp and persists it', async () => {
    const spy = arrange({ created_at: AFTER, onboarding_steps: {} })
    await useAuthStore.getState().markOnboardingStep('board')
    const sent = spy.mock.calls[0][0].onboarding_steps
    expect(Date.parse(sent.board)).not.toBeNaN()
    // optimistic local merge happened before persist resolved
    expect(useAuthStore.getState().profile.onboarding_steps.board).toBe(sent.board)
  })

  it('no-ops when the key is already set', async () => {
    const spy = arrange({ created_at: AFTER, onboarding_steps: { board: AFTER } })
    await useAuthStore.getState().markOnboardingStep('board')
    expect(spy).not.toHaveBeenCalled()
  })

  it('no-ops for step keys when dismissed, but still allows dismissing', async () => {
    const spy = arrange({ created_at: AFTER, onboarding_steps: { dismissed: AFTER } })
    await useAuthStore.getState().markOnboardingStep('card')
    expect(spy).not.toHaveBeenCalled()

    const spy2 = arrange({ created_at: AFTER, onboarding_steps: {} })
    await useAuthStore.getState().markOnboardingStep('dismissed')
    expect(spy2).toHaveBeenCalledOnce()
  })

  it('no-ops for accounts created before SHIP_DATE', async () => {
    const spy = arrange({ created_at: BEFORE, onboarding_steps: {} })
    await useAuthStore.getState().markOnboardingStep('board')
    expect(spy).not.toHaveBeenCalled()
  })

  it('no-ops with no profile', async () => {
    const spy = arrange(null)
    await useAuthStore.getState().markOnboardingStep('board')
    expect(spy).not.toHaveBeenCalled()
  })

  it('keeps the optimistic merge and does not throw when persist fails', async () => {
    const updateProfile = vi.fn().mockRejectedValue(new Error('offline'))
    useAuthStore.setState({ profile: { created_at: AFTER, onboarding_steps: {} }, updateProfile })
    await expect(useAuthStore.getState().markOnboardingStep('ai')).resolves.toBeUndefined()
    expect(useAuthStore.getState().profile.onboarding_steps.ai).toBeTruthy()
  })
})
