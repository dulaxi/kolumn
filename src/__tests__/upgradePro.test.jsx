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

describe('UpgradeProPage — trial state', () => {
  test('with trial state: shows "Start free trial" CTA and $0 due today', () => {
    mockLocationState = { trial: true }
    render(<UpgradeProPage />)

    expect(screen.getByRole('button', { name: /start free trial/i })).toBeInTheDocument()
    expect(screen.getByText('$0')).toBeInTheDocument()
  })

  test('without trial state: shows "Activate Pro" CTA', () => {
    mockLocationState = null
    render(<UpgradeProPage />)

    expect(screen.getByRole('button', { name: /^activate pro$/i })).toBeInTheDocument()
  })
})

describe('UpgradeProPage — subscribe button', () => {
  test('trial + from onboarding: sets Pro tier, records trial_ends_at, routes to onboarding disclaimer', async () => {
    mockLocationState = { trial: true, from: 'onboarding' }
    render(<UpgradeProPage />)

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

    fireEvent.click(screen.getByRole('button', { name: /^activate pro$/i }))

    await waitFor(() => expect(mockSetTier).toHaveBeenCalledWith('pro'))
    expect(mockUpdateProfile).not.toHaveBeenCalled()
    expect(mockNavigate).toHaveBeenCalledWith('/dashboard', { replace: true })
  })
})
