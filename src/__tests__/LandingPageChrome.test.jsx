import { describe, test, expect, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

vi.mock('../store/authStore', () => ({
  useAuthStore: Object.assign(() => null, {
    getState: () => ({ user: null }),
    subscribe: () => () => {},
  }),
}))

import LandingPage from '../pages/LandingPage'
import { FOOTER_GROUPS } from '../content/marketing-nav'

// Regression for the landing page adopting the shared marketing chrome
// (MarketingNav + MarketingFooter) instead of a bespoke MobileNav + a
// one-line footer. Before this, the homepage — the site's highest-authority
// page — linked to almost nothing in the 50-page marketing site, which
// starved internal link equity from reaching the rest of the site.
describe('LandingPage — shared marketing chrome', () => {
  test('renders the shared footer with every group heading and at least one marketing link', () => {
    render(<MemoryRouter><LandingPage /></MemoryRouter>)
    const footer = screen.getByRole('contentinfo')
    for (const group of FOOTER_GROUPS) {
      expect(within(footer).getByRole('heading', { name: group.heading })).toBeInTheDocument()
    }
    // Total footer links across every group — this is the count that used
    // to be zero (the old footer linked only to mailto/#sign-in/onboarding).
    const totalFooterLinks = FOOTER_GROUPS.reduce((n, g) => n + g.links.length, 0)
    expect(totalFooterLinks).toBeGreaterThan(20)
    expect(within(footer).getByRole('link', { name: 'Pricing' })).toHaveAttribute('href', '/pricing')
    expect(within(footer).getByRole('link', { name: 'Startups' })).toHaveAttribute('href', '/solutions/startups')
  })

  test('renders the shared nav with links into the marketing site', () => {
    render(<MemoryRouter><LandingPage /></MemoryRouter>)
    const nav = screen.getByRole('navigation', { name: /main/i })
    expect(within(nav).getByRole('link', { name: 'Pricing' })).toHaveAttribute('href', '/pricing')
    expect(within(nav).getByRole('link', { name: 'Get started' })).toHaveAttribute('href', '/onboarding')
  })

  test('still renders the hero and demo content untouched by the chrome swap', () => {
    render(<MemoryRouter><LandingPage /></MemoryRouter>)
    expect(screen.getByRole('heading', { level: 1, name: 'A board that listens.' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Notes in, Kanban out' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Frequently asked questions' })).toBeInTheDocument()
  })
})
