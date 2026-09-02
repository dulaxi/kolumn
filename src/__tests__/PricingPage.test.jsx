import { describe, test, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import PricingPage from '../pages/marketing/PricingPage'
import { PRICING } from '../content/pricing'

describe('PricingPage', () => {
  test('renders hero, plans, comparison, reassurance and every FAQ', () => {
    render(<MemoryRouter><PricingPage /></MemoryRouter>)
    expect(screen.getByRole('heading', { level: 1, name: 'Pricing' })).toBeInTheDocument()
    expect(screen.getByText(PRICING.hero.subhead)).toBeInTheDocument()
    for (const tier of PRICING.tiers) {
      expect(screen.getByRole('heading', { level: 3, name: tier.name })).toBeInTheDocument()
    }
    expect(screen.getByText(PRICING.footnote)).toBeInTheDocument()
    expect(screen.getByRole('table', { name: /compare plans/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: PRICING.reassurance.heading })).toBeInTheDocument()
    for (const item of PRICING.faq) {
      expect(screen.getByRole('button', { name: item.q })).toBeInTheDocument()
    }
  })

  test('no button or link is lime-filled', () => {
    render(<MemoryRouter><PricingPage /></MemoryRouter>)
    // Global constraint: lime is a state color, never a button fill.
    for (const el of document.querySelectorAll('a, button')) {
      expect(el.className, el.textContent).not.toMatch(/bg-\[var\(--(accent-lime|color-lime)/)
    }
  })
})
