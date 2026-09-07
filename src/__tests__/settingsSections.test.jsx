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

  // The name row reports through the field, not the shared toast: a toast is
  // transient and by the time you read it your eye has left the box that
  // caused it. The other rows keep the toast — they have no single field to
  // blame. This test used to assert the toast here; it now asserts the field.
  test('a failed name save reports on the field, not in a toast', async () => {
    useAuthStore.setState({ updateProfile: vi.fn().mockRejectedValue(new Error('nope')) })
    render(<ProfileSection />)
    const input = screen.getByLabelText('Full name')
    await userEvent.clear(input)
    await userEvent.type(input, 'Abdullah')
    await userEvent.tab()
    await waitFor(() => {
      expect(screen.getByText("Couldn't save that. Try again.")).toBeInTheDocument()
    })
    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(showToast.success).not.toHaveBeenCalled()
    expect(showToast.error).not.toHaveBeenCalled()
  })

  // Clearing the field used to snap the old name back with no explanation.
  test('clearing the name explains the revert instead of silently undoing it', async () => {
    render(<ProfileSection />)
    const input = screen.getByLabelText('Full name')
    await userEvent.clear(input)
    await userEvent.tab()
    expect(screen.getByText('Your name cannot be empty.')).toBeInTheDocument()
    expect(useAuthStore.getState().updateProfile).not.toHaveBeenCalled()
  })

  // SettingsRow lays its control area out as a horizontal flex row, so an
  // error rendered as a direct sibling of the input sits BESIDE the field
  // rather than under it. Both have to live in a stacking wrapper of their own.
  test('the name error sits under the field, not beside it', async () => {
    render(<ProfileSection />)
    const input = screen.getByLabelText('Full name')
    await userEvent.clear(input)
    await userEvent.tab()

    const alert = screen.getByRole('alert')
    const controlColumn = input.closest('.flex.shrink-0')
    expect(controlColumn).not.toBeNull()
    // Same wrapper as the input …
    expect(alert.parentElement.contains(input)).toBe(true)
    // … and that wrapper is not the horizontal row itself.
    expect(alert.parentElement).not.toBe(controlColumn)
    // Order matters too: under means after.
    expect(input.compareDocumentPosition(alert) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  // A failure on a row with no single field to blame still uses the toast.
  test('a failed colour change still uses the shared toast', async () => {
    useAuthStore.setState({ updateProfile: vi.fn().mockRejectedValue(new Error('nope')) })
    render(<ProfileSection />)
    await userEvent.click(screen.getAllByRole('button', { name: /^Profile color/ })[0])
    await waitFor(() => {
      expect(showToast.error).toHaveBeenCalledWith("Couldn't update profile")
    })
  })
})
