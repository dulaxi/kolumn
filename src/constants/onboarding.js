// Sidebar "Get started" checklist for new users. SHIP_DATE gates the whole
// feature: accounts created before it never see the card and never write
// onboarding_steps. Bump to the real deploy date when this ships.
export const SHIP_DATE = new Date('2026-07-23T00:00:00Z')

export const ONBOARDING_STEPS = [
  {
    key: 'board',
    title: 'Create your first board',
    subtitle: 'Or poke at the Welcome board we made you',
  },
  {
    key: 'card',
    title: 'Add a card',
    subtitle: 'Click + New task in any column',
  },
  {
    key: 'ai',
    title: 'Ask the AI',
    subtitle: 'Type what you want done into the bar on any board',
  },
]

export function isNewAccount(profile) {
  if (!profile?.created_at) return false
  return new Date(profile.created_at) >= SHIP_DATE
}

export function shouldShowChecklist(profile) {
  if (!isNewAccount(profile)) return false
  const steps = profile.onboarding_steps || {}
  if (steps.dismissed) return false
  return ONBOARDING_STEPS.some((s) => !steps[s.key])
}
