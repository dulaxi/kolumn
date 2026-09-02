// Nav + footer link data. Grows as marketing pages ship: a link may only be
// added here once its route is in MARKETING_ROUTES (or KNOWN_ROUTES) —
// src/__tests__/marketingRoutes.test.js fails on dead links.
export { CONTACT_EMAIL } from './pricing'

export const PRIMARY_CTA = { label: 'Get started', to: '/onboarding' }
export const SIGN_IN = { label: 'Sign in', to: '/#sign-in' }

// Flat top-level links, in order. (Features → '/features' joins when built.)
export const NAV_LINKS = [{ label: 'Pricing', to: '/pricing' }]

// Dropdown menus: { label, columns: [[{ label, to }, …], …] }.
// Solutions and Resources menus are added by their page plans.
export const NAV_MENUS = []

export const FOOTER_TAGLINE = 'A kanban that stays a kanban.'

// Column order follows the chrome spec: Product · Solutions · Resources +
// Company · Legal. Groups appear as their pages ship.
export const FOOTER_GROUPS = [
  {
    heading: 'Product',
    links: [
      { label: 'Pricing', to: '/pricing' },
      { label: 'Log in', to: '/#sign-in' },
    ],
  },
  {
    heading: 'Legal',
    links: [
      { label: 'Terms', to: '/terms' },
      { label: 'Privacy', to: '/privacy' },
    ],
  },
]
