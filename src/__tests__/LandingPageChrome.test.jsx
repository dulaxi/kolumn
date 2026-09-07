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
import { findMarketingRoute } from '../content/marketing-routes'
import { USE_CASES } from '../content/use-cases'

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
    expect(
      screen.getByRole('heading', { level: 1, name: 'Say what needs doing.' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Notes in, tasks out' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Frequently asked questions' })).toBeInTheDocument()
  })
})

// The homepage is the one page reached by someone who has never used a
// project tool, and it used to fail that reader completely: the h1 said "A
// board that listens.", the sub-line answered with "The kanban you talk to.",
// and the word "kanban" appeared three more times before anything defined it.
// The first plain-English sentence on the page was an FAQ answer at the very
// bottom, which defined Kolumn by reference to Trello.
//
// These tests pin the rule rather than the wording, so rephrasing the hero is
// free but reintroducing jargon above the fold fails loudly.
describe('LandingPage — explains itself to a first-time visitor', () => {
  function aboveTheFoldCopy() {
    render(<MemoryRouter><LandingPage /></MemoryRouter>)
    const h1 = screen.getByRole('heading', { level: 1 })
    const subhead = h1.parentElement.querySelector('p')
    expect(subhead).not.toBeNull()
    return `${h1.textContent} ${subhead.textContent}`
  }

  test('the hero teaches cards and columns instead of naming the category', () => {
    const copy = aboveTheFoldCopy()
    expect(copy).toMatch(/\bcards\b/i)
    expect(copy).toMatch(/\bcolumns\b/i)
  })

  test('the word "kanban" never appears above the fold', () => {
    expect(aboveTheFoldCopy()).not.toMatch(/kanban/i)
  })

  test('the FAQ defines the term the hero deliberately avoids', () => {
    render(<MemoryRouter><LandingPage /></MemoryRouter>)
    const question = screen.getByRole('button', { name: /what is a kanban board/i })
    expect(question).toBeInTheDocument()
  })

  test('every use-case example links to a page that exists', () => {
    render(<MemoryRouter><LandingPage /></MemoryRouter>)
    for (const { label, to } of USE_CASES) {
      expect(screen.getByRole('link', { name: label })).toHaveAttribute('href', to)
      expect(findMarketingRoute(to)).toBeTruthy()
    }
  })
})
