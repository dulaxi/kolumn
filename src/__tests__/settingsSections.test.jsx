import { describe, test, expect, vi, afterEach, beforeEach } from 'vitest'
import { render, screen, cleanup, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// Mock toast so we can assert on calls without rendering react-hot-toast
vi.mock('../utils/toast', () => ({
  showToast: {
    error: vi.fn(),
    warn: vi.fn(),
    success: vi.fn(),
    restore: vi.fn(),
    archive: vi.fn(),
    delete: vi.fn(),
    info: vi.fn(),
    overdue: vi.fn(),
  },
}))

import GeneralSection from '../components/settings/GeneralSection'
import ProfileSection from '../components/settings/ProfileSection'
import { useSettingsStore } from '../store/settingsStore'
import { useAuthStore } from '../store/authStore'
import { showToast } from '../utils/toast'

afterEach(() => cleanup())

describe('GeneralSection', () => {
  beforeEach(() => {
    useSettingsStore.setState({ theme: 'light', font: 'mona-sans' })
  })

  test('appearance control reflects and updates the theme', async () => {
    render(<GeneralSection />)
    const dark = screen.getByRole('radio', { name: 'Dark' })
    expect(dark.getAttribute('aria-checked')).toBe('false')
    await userEvent.click(dark)
    expect(useSettingsStore.getState().theme).toBe('dark')
  })

  test('font control updates the font', async () => {
    render(<GeneralSection />)
    await userEvent.click(screen.getByRole('radio', { name: 'SF Mono' }))
    expect(useSettingsStore.getState().font).toBe('sf-mono')
  })
})

describe('ProfileSection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useAuthStore.setState({
      profile: { display_name: 'Dula Hassan', nickname: '', icon: null, color: null, tier: 'free' },
      updateProfile: vi.fn().mockResolvedValue({}),
    })
  })

  test('renders the current full name and nickname', () => {
    render(<ProfileSection />)
    expect(screen.getByLabelText('Full name').value).toBe('Dula Hassan')
    expect(screen.getByLabelText('Display name').value).toBe('')
  })

  test('committing a new full name calls updateProfile on blur', async () => {
    render(<ProfileSection />)
    const input = screen.getByLabelText('Full name')
    await userEvent.clear(input)
    await userEvent.type(input, 'Abdullah')
    await userEvent.tab()
    expect(useAuthStore.getState().updateProfile).toHaveBeenCalledWith({ display_name: 'Abdullah' })
  })

  test('committing a nickname calls updateProfile; clearing it commits empty', async () => {
    useAuthStore.setState({
      profile: { display_name: 'Dula Hassan', nickname: 'Dula', icon: null, color: null, tier: 'free' },
    })
    render(<ProfileSection />)
    const input = screen.getByLabelText('Display name')
    await userEvent.clear(input)
    await userEvent.type(input, 'Abdu')
    await userEvent.tab()
    expect(useAuthStore.getState().updateProfile).toHaveBeenCalledWith({ nickname: 'Abdu' })
    await userEvent.clear(input)
    await userEvent.tab()
    expect(useAuthStore.getState().updateProfile).toHaveBeenCalledWith({ nickname: '' })
  })

  test('picking a color calls updateProfile', async () => {
    render(<ProfileSection />)
    const swatches = screen.getAllByRole('button', { name: /^Profile color/ })
    expect(swatches.length).toBeGreaterThan(0)
    await userEvent.click(swatches[0])
    expect(useAuthStore.getState().updateProfile).toHaveBeenCalledWith(
      expect.objectContaining({ color: expect.any(String) }),
    )
  })

  test('failed profile update shows an error toast, not a success toast', async () => {
    useAuthStore.setState({ updateProfile: vi.fn().mockRejectedValue(new Error('nope')) })
    render(<ProfileSection />)
    const input = screen.getByLabelText('Full name')
    await userEvent.clear(input)
    await userEvent.type(input, 'Abdullah')
    await userEvent.tab()
    await waitFor(() => {
      expect(showToast.error).toHaveBeenCalledWith("Couldn't update profile")
    })
    expect(showToast.success).not.toHaveBeenCalled()
  })
})
