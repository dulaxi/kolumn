import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import PrivacySection from '../components/settings/PrivacySection'
import BillingSection from '../components/settings/BillingSection'
import { buildExportPayload } from '../utils/exportData'
import { useAuthStore } from '../store/authStore'

afterEach(() => cleanup())

describe('PrivacySection', () => {
  test('renders data-protection rows, policy link, and export', () => {
    render(<PrivacySection />)
    expect(screen.getByText(/where your data lives/i)).toBeTruthy()
    expect(screen.getByRole('link', { name: /privacy policy/i }).getAttribute('href')).toBe('/privacy')
    expect(screen.getByRole('button', { name: /export/i })).toBeTruthy()
  })
})

describe('buildExportPayload', () => {
  test('unchanged shape, still excludes notes', () => {
    const payload = buildExportPayload({ boards: { a: 1 }, columns: {}, cards: {}, notes: { n: 1 } })
    expect(payload.boards).toEqual({ a: 1 })
    expect(payload.notes).toBeUndefined()
    expect(typeof payload.exported_at).toBe('string')
  })
})

describe('BillingSection', () => {
  beforeEach(() => {
    useAuthStore.setState({ profile: { tier: 'free' }, setTier: vi.fn() })
  })

  test('free tier shows plan, limits, and Upgrade', () => {
    render(<MemoryRouter><BillingSection onClose={() => {}} /></MemoryRouter>)
    expect(screen.getByText('Free')).toBeTruthy()
    expect(screen.getByText(/20 AI messages/i)).toBeTruthy()
    expect(screen.getByRole('button', { name: /upgrade/i })).toBeTruthy()
  })

  test('pro tier shows Downgrade instead of Upgrade', async () => {
    useAuthStore.setState({ profile: { tier: 'pro' }, setTier: vi.fn().mockResolvedValue() })
    render(<MemoryRouter><BillingSection onClose={() => {}} /></MemoryRouter>)
    expect(screen.getByText('Pro')).toBeTruthy()
    const btn = screen.getByRole('button', { name: /downgrade/i })
    await userEvent.click(btn)
    expect(useAuthStore.getState().setTier).toHaveBeenCalledWith('free')
  })
})
