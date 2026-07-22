import { describe, test, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'

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
