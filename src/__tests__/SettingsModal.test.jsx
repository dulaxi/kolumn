import { describe, test, expect, vi, afterEach, beforeEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import SettingsModal from '../components/settings/SettingsModal'
import { useSettingsStore } from '../store/settingsStore'
import { useAuthStore } from '../store/authStore'

vi.mock('../lib/accountClient', () => ({
  listSessions: vi.fn().mockResolvedValue([]),
  revokeSession: vi.fn(),
  deleteAccount: vi.fn(),
}))

afterEach(() => cleanup())

function renderModal(props = {}) {
  return render(
    <MemoryRouter>
      <SettingsModal open onClose={() => {}} {...props} />
    </MemoryRouter>,
  )
}

describe('SettingsModal', () => {
  beforeEach(() => {
    useSettingsStore.setState({ theme: 'light', font: 'mona-sans' })
    useAuthStore.setState({
      profile: { display_name: 'Dula', email: 'dula@example.com', tier: 'free' },
      user: { email: 'dula@example.com' },
      updateProfile: vi.fn(),
      signOut: vi.fn(),
    })
  })

  test('renders nav items and the General pane (profile + preferences) by default', () => {
    renderModal()
    for (const item of ['General', 'Account', 'Privacy', 'Billing']) {
      expect(screen.getByRole('button', { name: item })).toBeTruthy()
    }
    expect(screen.queryByRole('button', { name: 'Data' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Profile' })).toBeNull()
    expect(screen.getByRole('heading', { name: 'Profile' })).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Preferences' })).toBeTruthy()
  })

  test('clicking a nav item switches sections', async () => {
    renderModal()
    await userEvent.click(screen.getByRole('button', { name: 'Account' }))
    expect(screen.getByRole('heading', { name: 'Account' })).toBeTruthy()
    expect(screen.getByText('dula@example.com')).toBeTruthy()
  })

  test('search auto-selects the first matching section and dims the rest', async () => {
    renderModal()
    await userEvent.type(screen.getByLabelText('Search settings'), 'export')
    expect(screen.getByRole('heading', { name: 'Privacy' })).toBeTruthy()
    const general = screen.getByRole('button', { name: 'General' })
    expect(general.className).toContain('opacity-40')
  })

  test('close button calls onClose', async () => {
    const onClose = vi.fn()
    renderModal({ onClose })
    await userEvent.click(screen.getByRole('button', { name: 'Close settings' }))
    expect(onClose).toHaveBeenCalled()
  })

  test('renders nothing when closed', () => {
    render(
      <MemoryRouter>
        <SettingsModal open={false} onClose={() => {}} />
      </MemoryRouter>,
    )
    expect(screen.queryByRole('dialog')).toBeNull()
  })
})
