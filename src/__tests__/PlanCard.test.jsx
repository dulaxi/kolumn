import { describe, test, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import PlanCard from '../components/PlanCard'
import { getPlan } from '../data/plans'

const wrap = (ui) => render(<MemoryRouter>{ui}</MemoryRouter>)

describe('PlanCard', () => {
  test('pro shows badge, caption, and period', () => {
    wrap(<PlanCard plan={getPlan('pro')} />)
    expect(screen.getByText('Recommended')).toBeInTheDocument()
    expect(screen.getByText(/Billed monthly/)).toBeInTheDocument()
    expect(screen.getByText('/ month')).toBeInTheDocument()
  })

  test('team omits the period and links its CTA to mailto', () => {
    wrap(<PlanCard plan={getPlan('team')} />)
    expect(screen.queryByText(/^\/ /)).toBeNull()
    const cta = screen.getByRole('link', { name: /get notified/i })
    expect(cta.getAttribute('href')).toMatch(/^mailto:/)
  })

  test('free CTA links to onboarding', () => {
    wrap(<PlanCard plan={getPlan('free')} />)
    expect(screen.getByRole('link', { name: /start for free/i })).toHaveAttribute('href', '/onboarding')
  })

  test('picker mode disables the team card and never calls onSelect', async () => {
    const onSelect = vi.fn()
    wrap(<PlanCard plan={getPlan('team')} mode="picker" onSelect={onSelect} />)
    const btn = screen.getByRole('button', { name: /coming soon/i })
    expect(btn).toBeDisabled()
    btn.click()
    expect(onSelect).not.toHaveBeenCalled()
  })
})
