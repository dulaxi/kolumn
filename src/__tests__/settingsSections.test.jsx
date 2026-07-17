import { describe, test, expect, vi, afterEach, beforeEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import GeneralSection from '../components/settings/GeneralSection'
import ProfileSection from '../components/settings/ProfileSection'
import { useSettingsStore } from '../store/settingsStore'
import { useAuthStore } from '../store/authStore'

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
    useAuthStore.setState({
      profile: { display_name: 'Dula', icon: null, color: null, tier: 'free' },
      updateProfile: vi.fn(),
    })
  })

  test('renders the current display name', () => {
    render(<ProfileSection />)
    expect(screen.getByLabelText('Display name').value).toBe('Dula')
  })

  test('committing a new display name calls updateProfile on blur', async () => {
    render(<ProfileSection />)
    const input = screen.getByLabelText('Display name')
    await userEvent.clear(input)
    await userEvent.type(input, 'Abdullah')
    await userEvent.tab()
    expect(useAuthStore.getState().updateProfile).toHaveBeenCalledWith({ display_name: 'Abdullah' })
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
})
