import { describe, test, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import ChatListPage from '../pages/ChatListPage'
import { useChatStore } from '../store/chatStore'

describe('ChatListPage delete', () => {
  beforeEach(() => {
    useChatStore.setState({
      conversations: {
        c1: { id: 'c1', title: 'Doomed chat', created_at: '2026-07-26T10:00:00.000Z', updated_at: '2026-07-26T10:00:00.000Z' },
      },
      messages: { c1: [] },
    })
  })

  test('delete asks for confirmation and only deletes on confirm', () => {
    render(<MemoryRouter><ChatListPage /></MemoryRouter>)
    fireEvent.click(screen.getByLabelText('Delete conversation'))
    expect(useChatStore.getState().conversations.c1).toBeDefined()
    expect(screen.getByText('Delete conversation?')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /^Delete$/ }))
    expect(useChatStore.getState().conversations.c1).toBeUndefined()
  })

  test('the decorative sort button is gone', () => {
    render(<MemoryRouter><ChatListPage /></MemoryRouter>)
    expect(screen.queryByText('Sort by Activity')).not.toBeInTheDocument()
  })
})
