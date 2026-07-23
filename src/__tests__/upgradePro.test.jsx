import { describe, test, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

const mockSetTier = vi.fn()
const mockUpdateProfile = vi.fn()
const mockNavigate = vi.fn()
let mockLocationState = null

vi.mock('../store/authStore', () => ({
  useAuthStore: vi.fn((sel) => sel({
    setTier: mockSetTier,
    updateProfile: mockUpdateProfile,
  })),
}))
vi.mock('../utils/toast', () => ({
  showToast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))
vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
  useLocation: () => ({ state: mockLocationState, pathname: '/upgrade/pro' }),
}))

import UpgradeProPage from '../pages/UpgradeProPage'

beforeEach(() => {
  mockSetTier.mockReset()
  mockUpdateProfile.mockReset()
  mockNavigate.mockReset()
  mockLocationState = null
})

// The agreement checkbox gates the CTA (claude.ai-style checkout).
const agree = () => fireEvent.click(screen.getByRole('checkbox'))

describe('UpgradeProPage — trial state', () => {
  test('with trial state: shows "Start free trial" CTA and $0.00 due today', () => {
    mockLocationState = { trial: true }
    render(<UpgradeProPage />)

    expect(screen.getByRole('button', { name: /start free trial/i })).toBeInTheDocument()
    // $0.00 appears for both Tax and Total due today in trial mode
    expect(screen.getAllByText('$0.00')).toHaveLength(2)
  })

  test('without trial state: shows "Subscribe" CTA', () => {
    mockLocationState = null
    render(<UpgradeProPage />)

    expect(screen.getByRole('button', { name: /^subscribe$/i })).toBeInTheDocument()
  })
})

describe('UpgradeProPage — subscribe button', () => {
  test('CTA is disabled until the terms checkbox is checked', () => {
    mockLocationState = null
    render(<UpgradeProPage />)

    const cta = screen.getByRole('button', { name: /^subscribe$/i })
    expect(cta).toBeDisabled()
    agree()
    expect(cta).not.toBeDisabled()
  })

  test('trial + from onboarding: sets Pro tier, records trial_ends_at, routes to onboarding disclaimer', async () => {
    mockLocationState = { trial: true, from: 'onboarding' }
    render(<UpgradeProPage />)

    agree()
    fireEvent.click(screen.getByRole('button', { name: /start free trial/i }))

    await waitFor(() => expect(mockSetTier).toHaveBeenCalledWith('pro'))
    expect(mockUpdateProfile).toHaveBeenCalledTimes(1)
    const profileArg = mockUpdateProfile.mock.calls[0][0]
    expect(typeof profileArg.trial_ends_at).toBe('string')
    expect(mockNavigate).toHaveBeenCalledWith('/onboarding?step=disclaimer', { replace: true })
  })

  test('non-trial, no state: sets Pro tier, skips trial profile update, routes to dashboard', async () => {
    mockLocationState = null
    render(<UpgradeProPage />)

    agree()
    fireEvent.click(screen.getByRole('button', { name: /^subscribe$/i }))

    await waitFor(() => expect(mockSetTier).toHaveBeenCalledWith('pro'))
    expect(mockUpdateProfile).not.toHaveBeenCalled()
    expect(mockNavigate).toHaveBeenCalledWith('/dashboard', { replace: true })
  })
})
