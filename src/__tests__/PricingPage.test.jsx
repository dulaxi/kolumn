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

  test('heading outline has no level skips', () => {
    render(<MemoryRouter><PricingPage /></MemoryRouter>)
    const levels = [...document.querySelectorAll('h1, h2, h3, h4, h5, h6')].map((el) => Number(el.tagName[1]))
    expect(levels[0]).toBe(1)
    for (let i = 1; i < levels.length; i += 1) {
      expect(levels[i] - levels[i - 1], `jump before <${document.querySelectorAll('h1,h2,h3,h4,h5,h6')[i].tagName}>`).toBeLessThanOrEqual(1)
    }
  })
})
