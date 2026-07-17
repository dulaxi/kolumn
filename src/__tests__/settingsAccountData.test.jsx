import { describe, test, expect, vi, afterEach, beforeEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import AccountSection from '../components/settings/AccountSection'
import { buildExportPayload } from '../components/settings/DataSection'
import { useAuthStore } from '../store/authStore'
import { listSessions } from '../lib/accountClient'

vi.mock('../lib/accountClient', () => ({
  listSessions: vi.fn(),
  revokeSession: vi.fn(),
  deleteAccount: vi.fn(),
}))

afterEach(() => cleanup())

describe('AccountSection', () => {
  beforeEach(() => {
    listSessions.mockResolvedValue([])
    useAuthStore.setState({
      profile: { display_name: 'Dula', email: 'dula@example.com', tier: 'pro' },
      user: { email: 'dula@example.com' },
      signOut: vi.fn(),
      signOutEverywhere: vi.fn(),
    })
  })

  test('shows email', () => {
    render(<MemoryRouter><AccountSection onClose={() => {}} /></MemoryRouter>)
    expect(screen.getByText('dula@example.com')).toBeTruthy()
  })

  test('sign out calls authStore.signOut and closes the modal', async () => {
    const onClose = vi.fn()
    render(<MemoryRouter><AccountSection onClose={onClose} /></MemoryRouter>)
    await userEvent.click(screen.getByRole('button', { name: 'Sign out' }))
    expect(useAuthStore.getState().signOut).toHaveBeenCalled()
    expect(onClose).toHaveBeenCalled()
  })

  test('log out everywhere calls authStore.signOutEverywhere and closes the modal', async () => {
    const onClose = vi.fn()
    render(<MemoryRouter><AccountSection onClose={onClose} /></MemoryRouter>)
    await userEvent.click(screen.getByRole('button', { name: 'Log out everywhere' }))
    expect(useAuthStore.getState().signOutEverywhere).toHaveBeenCalled()
    expect(onClose).toHaveBeenCalled()
  })
})

describe('buildExportPayload', () => {
  test('includes boards/columns/cards and a timestamp, excludes notes', () => {
    const state = {
      boards: { b1: { id: 'b1', name: 'Board' } },
      columns: { c1: { id: 'c1', board_id: 'b1' } },
      cards: { k1: { id: 'k1', column_id: 'c1' } },
      notes: { n1: { id: 'n1' } },
    }
    const payload = buildExportPayload(state)
    expect(payload.boards).toEqual(state.boards)
    expect(payload.columns).toEqual(state.columns)
    expect(payload.cards).toEqual(state.cards)
    expect(payload.notes).toBeUndefined()
    expect(typeof payload.exported_at).toBe('string')
  })
})
