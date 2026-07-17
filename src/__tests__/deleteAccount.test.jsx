import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import DeleteAccountModal from '../components/settings/DeleteAccountModal'
import { deleteAccount } from '../lib/accountClient'
import { useAuthStore } from '../store/authStore'

vi.mock('../lib/accountClient', () => ({ deleteAccount: vi.fn() }))

afterEach(() => cleanup())

describe('DeleteAccountModal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useAuthStore.setState({
      profile: { email: 'me@example.com' },
      user: { email: 'me@example.com' },
      clearAfterAccountDeletion: vi.fn(),
    })
  })

  test('delete button is disabled until the email matches exactly', async () => {
    render(<DeleteAccountModal open onClose={() => {}} onDeleted={() => {}} />)
    const btn = screen.getByRole('button', { name: /delete my account/i })
    expect(btn.disabled).toBe(true)
    await userEvent.type(screen.getByLabelText(/type your email/i), 'me@example.com')
    expect(btn.disabled).toBe(false)
  })

  test('delete button ignores case and surrounding whitespace', async () => {
    render(<DeleteAccountModal open onClose={() => {}} onDeleted={() => {}} />)
    const btn = screen.getByRole('button', { name: /delete my account/i })
    await userEvent.type(screen.getByLabelText(/type your email/i), 'ME@Example.com ')
    expect(btn.disabled).toBe(false)
  })

  test('successful delete calls onDeleted', async () => {
    deleteAccount.mockResolvedValue()
    const onDeleted = vi.fn()
    render(<DeleteAccountModal open onClose={() => {}} onDeleted={onDeleted} />)
    await userEvent.type(screen.getByLabelText(/type your email/i), 'me@example.com')
    await userEvent.click(screen.getByRole('button', { name: /delete my account/i }))
    await waitFor(() => expect(onDeleted).toHaveBeenCalled())
  })

  test('409 shows the blocking workspaces/boards', async () => {
    const err = new Error('You still own shared workspaces or boards.')
    err.blockers = [{ type: 'workspace', name: 'Design Team' }, { type: 'board', name: 'Roadmap' }]
    deleteAccount.mockRejectedValue(err)
    render(<DeleteAccountModal open onClose={() => {}} onDeleted={() => {}} />)
    await userEvent.type(screen.getByLabelText(/type your email/i), 'me@example.com')
    await userEvent.click(screen.getByRole('button', { name: /delete my account/i }))
    expect(await screen.findByText(/Design Team/)).toBeTruthy()
    expect(screen.getByText(/Roadmap/)).toBeTruthy()
  })

  test('dismissal is locked while the delete is in flight', async () => {
    let resolveDelete
    deleteAccount.mockReturnValue(new Promise((res) => { resolveDelete = res }))
    const onClose = vi.fn()
    const onDeleted = vi.fn()
    render(<DeleteAccountModal open onClose={onClose} onDeleted={onDeleted} />)
    await userEvent.type(screen.getByLabelText(/type your email/i), 'me@example.com')
    await userEvent.click(screen.getByRole('button', { name: /delete my account/i }))
    // cancel disabled + escape ignored while busy
    expect(screen.getByRole('button', { name: /cancel/i }).disabled).toBe(true)
    await userEvent.keyboard('{Escape}')
    expect(onClose).not.toHaveBeenCalled()
    resolveDelete()
    await waitFor(() => expect(onDeleted).toHaveBeenCalled())
  })
})
