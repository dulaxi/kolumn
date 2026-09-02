import { describe, test, expect, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'

vi.mock('../store/authStore', () => ({
  useAuthStore: Object.assign(() => null, {
    getState: () => ({ user: null }),
    subscribe: () => () => {},
  }),
}))

import MarketingNav from '../components/marketing/MarketingNav'
import MarketingFooter from '../components/marketing/MarketingFooter'
import { FOOTER_GROUPS } from '../content/marketing-nav'

const wrap = (ui) => render(<MemoryRouter initialEntries={['/pricing']}>{ui}</MemoryRouter>)

describe('MarketingNav', () => {
  test('desktop bar has links, sign in and get started', () => {
    wrap(<MarketingNav />)
    const nav = screen.getByRole('navigation', { name: /main/i })
    expect(within(nav).getByRole('link', { name: 'Pricing' })).toHaveAttribute('href', '/pricing')
    expect(within(nav).getByRole('link', { name: 'Sign in' })).toHaveAttribute('href', '/#sign-in')
    expect(within(nav).getByRole('link', { name: 'Get started' })).toHaveAttribute('href', '/onboarding')
  })

  test('mobile toggle opens an overlay with the same links and locks scroll', async () => {
    wrap(<MarketingNav />)
    const toggle = screen.getByRole('button', { name: /open menu/i })
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    await userEvent.click(toggle)
    expect(screen.getByRole('button', { name: /close menu/i })).toHaveAttribute('aria-expanded', 'true')
    expect(document.body.style.overflow).toBe('hidden')
    const overlay = screen.getByRole('dialog', { name: /menu/i })
    expect(within(overlay).getByRole('link', { name: 'Pricing' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /close menu/i }))
    expect(document.body.style.overflow).not.toBe('hidden')
  })
})

describe('MarketingFooter', () => {
  test('renders every footer group heading and link', () => {
    wrap(<MarketingFooter />)
    const footer = screen.getByRole('contentinfo')
    for (const group of FOOTER_GROUPS) {
      expect(within(footer).getByRole('heading', { name: group.heading })).toBeInTheDocument()
      for (const link of group.links) {
        expect(within(footer).getByRole('link', { name: link.label })).toHaveAttribute('href', link.to)
      }
    }
    expect(within(footer).getByText(new RegExp(`© ${new Date().getFullYear()} Kolumn`))).toBeInTheDocument()
  })
})
