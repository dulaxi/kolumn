// Nav + footer link data. Grows as marketing pages ship: a link may only be
// added here once its route is in MARKETING_ROUTES (or KNOWN_ROUTES) —
// src/__tests__/marketingRoutes.test.js fails on dead links.
export { CONTACT_EMAIL } from './pricing'

export const PRIMARY_CTA = { label: 'Get started', to: '/onboarding' }
export const SIGN_IN = { label: 'Sign in', to: '/#sign-in' }

// Flat top-level links, in order.
export const NAV_LINKS = [
  { label: 'Features', to: '/features' },
  { label: 'Pricing', to: '/pricing' },
]

// Dropdown menus: { label, columns: [[{ label, to }, …], …] }. Chrome spec
// §3.1: Solutions is 2 columns of 4 (the eight verticals); Resources is a
// single column of 5.
export const NAV_MENUS = [
  {
    label: 'Solutions',
    columns: [
      [
        { label: 'Startups', to: '/solutions/startups' },
        { label: 'Small business', to: '/solutions/small-business' },
        { label: 'Nonprofits', to: '/solutions/nonprofits' },
        { label: 'Students', to: '/solutions/students' },
      ],
      [
        { label: 'Legal', to: '/solutions/legal' },
        { label: 'Healthcare', to: '/solutions/healthcare' },
        { label: 'Customer support', to: '/solutions/customer-support' },
        { label: 'Engineering', to: '/solutions/engineering' },
      ],
    ],
  },
  {
    label: 'Resources',
    columns: [
      [
        { label: 'Blog', to: '/blog' },
        { label: 'Tutorials', to: '/tutorials' },
        { label: 'Customer stories', to: '/customers' },
        { label: 'Support', to: '/support' },
        { label: 'Status', to: '/status' },
      ],
    ],
  },
]

export const FOOTER_TAGLINE = 'A kanban that stays a kanban.'

// Column order follows the chrome spec §3.7: Product · Solutions ·
// Resources + Company (stacked) · Legal.
export const FOOTER_GROUPS = [
  {
    heading: 'Product',
    links: [
      { label: 'Features', to: '/features' },
      { label: 'Pricing', to: '/pricing' },
      { label: 'Templates', to: '/templates' },
      { label: 'Connectors', to: '/connectors' },
      { label: 'Changelog', to: '/changelog' },
      { label: 'Log in', to: '/#sign-in' },
    ],
  },
  {
    heading: 'Solutions',
    links: [
      { label: 'Startups', to: '/solutions/startups' },
      { label: 'Small business', to: '/solutions/small-business' },
      { label: 'Nonprofits', to: '/solutions/nonprofits' },
      { label: 'Students', to: '/solutions/students' },
      { label: 'Legal', to: '/solutions/legal' },
      { label: 'Healthcare', to: '/solutions/healthcare' },
      { label: 'Customer support', to: '/solutions/customer-support' },
      { label: 'Engineering', to: '/solutions/engineering' },
    ],
  },
  {
    heading: 'Resources',
    links: [
      { label: 'Blog', to: '/blog' },
      { label: 'Tutorials', to: '/tutorials' },
      { label: 'Customer stories', to: '/customers' },
      { label: 'Support', to: '/support' },
      { label: 'Status', to: '/status' },
    ],
  },
  {
    heading: 'Company',
    links: [
      { label: 'About', to: '/about' },
      { label: 'Careers', to: '/careers' },
      { label: 'Security', to: '/security' },
    ],
  },
  {
    heading: 'Legal',
    links: [
      { label: 'Terms', to: '/terms' },
      { label: 'Privacy', to: '/privacy' },
      { label: 'Usage policy', to: '/legal/usage-policy' },
      { label: 'Responsible disclosure', to: '/legal/responsible-disclosure' },
      { label: 'Privacy choices', to: '/legal/privacy-choices' },
    ],
  },
]
