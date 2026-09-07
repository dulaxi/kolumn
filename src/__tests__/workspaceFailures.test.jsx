import { describe, test, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// Both of these surfaces used to `await` with nothing around it. A rejection
// escaped as an unhandled promise, so the line that re-enables the button
// never ran: the control kept its spinner, the form stayed dead, and nothing
// on screen said why. WorkspaceCreateModal had a second failure on top — a
// resolve with no id skipped onCreated but still called onClose(), so the
// modal shut as though a workspace had been created.
//
// These tests are about recovery, not styling: after a failure the control
// must come back, the typed value must survive, and the reason must be on
// screen.

const mockCreateWorkspace = vi.fn()
vi.mock('../store/workspacesStore', () => ({
  useWorkspacesStore: (sel) => sel({ createWorkspace: mockCreateWorkspace }),
}))

import WorkspaceCreateModal from '../components/workspace/WorkspaceCreateModal'
import WorkspaceInvitations from '../components/workspace/WorkspaceInvitations'
import { EMAIL_INVALID_MESSAGE } from '../utils/validation'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('WorkspaceCreateModal — recovery from a failed create', () => {
  function open(onClose = vi.fn(), onCreated = vi.fn()) {
    render(<WorkspaceCreateModal open onClose={onClose} onCreated={onCreated} />)
    return { onClose, onCreated }
  }

  test('a thrown error gives the button back instead of spinning forever', async () => {
    const user = userEvent.setup()
    mockCreateWorkspace.mockRejectedValue(new Error('network'))
    const { onClose } = open()

    await user.type(screen.getByPlaceholderText(/name for your workspace/i), 'Design team')
    const submit = screen.getByRole('button', { name: /^create$/i })
    await user.click(submit)

    expect(await screen.findByText(/couldn't create that workspace/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^create$/i })).toBeEnabled()
    // The modal must stay open so the failure is visible and retryable.
    expect(onClose).not.toHaveBeenCalled()
  })

  test('the typed name survives a failure, so you can retry without retyping', async () => {
    const user = userEvent.setup()
    mockCreateWorkspace.mockRejectedValue(new Error('network'))
    open()
    const field = screen.getByPlaceholderText(/name for your workspace/i)
    await user.type(field, 'Design team')
    await user.click(screen.getByRole('button', { name: /^create$/i }))

    await screen.findByText(/couldn't create that workspace/i)
    expect(field).toHaveValue('Design team')
    expect(field).toHaveAttribute('aria-invalid', 'true')
  })

  test('a silent failure — resolving with no id — does not close the modal', async () => {
    const user = userEvent.setup()
    mockCreateWorkspace.mockResolvedValue(undefined)
    const { onClose, onCreated } = open()

    await user.type(screen.getByPlaceholderText(/name for your workspace/i), 'Design team')
    await user.click(screen.getByRole('button', { name: /^create$/i }))

    await screen.findByText(/couldn't create that workspace/i)
    // This is the bug that made a workspace look created when it wasn't.
    expect(onClose).not.toHaveBeenCalled()
    expect(onCreated).not.toHaveBeenCalled()
  })

  test('a successful create still closes and reports the new id', async () => {
    const user = userEvent.setup()
    mockCreateWorkspace.mockResolvedValue('ws-123')
    const { onClose, onCreated } = open()

    await user.type(screen.getByPlaceholderText(/name for your workspace/i), 'Design team')
    await user.click(screen.getByRole('button', { name: /^create$/i }))

    expect(onCreated).toHaveBeenCalledWith('ws-123')
    expect(onClose).toHaveBeenCalled()
    expect(screen.queryByText(/couldn't create/i)).toBeNull()
  })
})

describe('WorkspaceInvitations — recovery from a failed invite', () => {
  const renderInvites = (onInvite) =>
    render(<WorkspaceInvitations sentInvitations={[]} onInvite={onInvite} onCancelInvitation={vi.fn()} />)

  test('a rejected invite gives the button back', async () => {
    const user = userEvent.setup()
    const onInvite = vi.fn().mockRejectedValue(new Error('nope'))
    renderInvites(onInvite)

    await user.type(screen.getByPlaceholderText('teammate@example.com'), 'sam@example.com')
    await user.click(screen.getByRole('button', { name: /send invite/i }))

    expect(await screen.findByText(/couldn't send that invite/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /send invite/i })).toBeEnabled()
    // Keeping the address means retrying is one click, not a retype.
    expect(screen.getByPlaceholderText('teammate@example.com')).toHaveValue('sam@example.com')
  })

  test('a malformed address never reaches the API', async () => {
    const user = userEvent.setup()
    const onInvite = vi.fn()
    renderInvites(onInvite)

    await user.type(screen.getByPlaceholderText('teammate@example.com'), 'sam@')
    await user.click(screen.getByRole('button', { name: /send invite/i }))

    expect(screen.getByText(EMAIL_INVALID_MESSAGE)).toBeInTheDocument()
    expect(onInvite).not.toHaveBeenCalled()
  })

  test('a successful invite clears the field', async () => {
    const user = userEvent.setup()
    const onInvite = vi.fn().mockResolvedValue(undefined)
    renderInvites(onInvite)

    await user.type(screen.getByPlaceholderText('teammate@example.com'), 'sam@example.com')
    await user.click(screen.getByRole('button', { name: /send invite/i }))

    expect(onInvite).toHaveBeenCalledWith('sam@example.com')
    expect(screen.getByPlaceholderText('teammate@example.com')).toHaveValue('')
  })
})
