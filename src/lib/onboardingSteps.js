// Pure step-flow rules for /onboarding. Kept out of the component so the
// guard logic is unit-testable without router/auth mocks.

export const STEPS = ['terms', 'details', 'plan', 'upsell', 'disclaimer', 'name', 'role']

// Steps that only make sense with a signed-in user.
const AUTH_STEPS = new Set(['plan', 'upsell', 'disclaimer', 'name', 'role'])

// Where should this visitor actually be? null = current step is fine.
export function resolveStepRedirect(step, { user, profile }) {
  if (!user) return AUTH_STEPS.has(step) ? 'terms' : null
  // Signed in: no account creation, and terms only if not yet accepted
  // (OAuth signups skip the pre-signup flow entirely).
  if (step === 'details') return 'plan'
  if (step === 'terms' && profile?.terms_accepted_at) return 'plan'
  return null
}

// Entry point for users bounced into the flow by AppLayout.
export function resumeStep(profile) {
  return profile?.terms_accepted_at ? 'plan' : 'terms'
}
