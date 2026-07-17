import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import SessionsList from '../components/settings/SessionsList'
import { listSessions, revokeSession } from '../lib/accountClient'
import { showToast } from '../utils/toast'

vi.mock('../lib/accountClient', () => ({
  listSessions: vi.fn(),
  revokeSession: vi.fn(),
}))

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

afterEach(() => cleanup())

const ROWS = [
  { id: 'cur', device: 'Chrome · Windows', location: 'Dubai, United Arab Emirates', ip: '1.2.3.4', created_at: '2026-07-01T10:00:00Z', last_active_at: '2026-07-17T09:00:00Z', current: true },
  { id: 'oth', device: 'Safari · iOS', location: 'London, United Kingdom', ip: '5.6.7.8', created_at: '2026-07-10T10:00:00Z', last_active_at: '2026-07-16T09:00:00Z', current: false },
]

describe('SessionsList', () => {
  beforeEach(() => vi.clearAllMocks())

  test('renders sessions with device, location, and This device tag', async () => {
    listSessions.mockResolvedValue(ROWS)
    render(<SessionsList />)
    expect(await screen.findByText('Chrome · Windows')).toBeTruthy()
    expect(screen.getByText('Safari · iOS')).toBeTruthy()
    expect(screen.getByText('This device')).toBeTruthy()
    expect(screen.getByText(/Dubai/)).toBeTruthy()
  })

  test('current session has no revoke button; others do', async () => {
    listSessions.mockResolvedValue(ROWS)
    render(<SessionsList />)
    await screen.findByText('Chrome · Windows')
    expect(screen.getAllByRole('button', { name: 'Revoke' })).toHaveLength(1)
  })

  test('revoke removes the row on success', async () => {
    listSessions.mockResolvedValue(ROWS)
    revokeSession.mockResolvedValue()
    render(<SessionsList />)
    await screen.findByText('Safari · iOS')
    await userEvent.click(screen.getByRole('button', { name: 'Revoke' }))
    expect(revokeSession).toHaveBeenCalledWith('oth')
    await waitFor(() => expect(screen.queryByText('Safari · iOS')).toBeNull())
  })

  test('revoke failure shows an error toast and keeps the row', async () => {
    listSessions.mockResolvedValue(ROWS)
    revokeSession.mockRejectedValue(new Error("You can't revoke the session you're using."))
    render(<SessionsList />)
    await screen.findByText('Safari · iOS')
    await userEvent.click(screen.getByRole('button', { name: 'Revoke' }))
    await waitFor(() => expect(showToast.error).toHaveBeenCalledWith("You can't revoke the session you're using."))
    expect(screen.getByText('Safari · iOS')).toBeTruthy()
  })

  test('load failure shows an error notice with retry', async () => {
    listSessions.mockRejectedValueOnce(new Error('nope')).mockResolvedValueOnce(ROWS)
    render(<SessionsList />)
    expect(await screen.findByRole('alert')).toBeTruthy()
    await userEvent.click(screen.getByRole('button', { name: /retry/i }))
    expect(await screen.findByText('Chrome · Windows')).toBeTruthy()
  })
})
