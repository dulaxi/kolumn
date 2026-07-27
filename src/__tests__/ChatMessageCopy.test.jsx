import { describe, test, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import ChatMessage from '../components/chat/ChatMessage'

const renderMsg = (message, props = {}) =>
  render(<MemoryRouter><ChatMessage message={message} {...props} /></MemoryRouter>)

describe('ChatMessage copy', () => {
  beforeEach(() => {
    Object.assign(navigator, { clipboard: { writeText: vi.fn().mockResolvedValue(undefined) } })
  })

  test('copies the raw markdown of an assistant message', () => {
    renderMsg({ id: 'm1', role: 'assistant', text: '**bold** reply' })
    fireEvent.click(screen.getByRole('button', { name: 'Copy message' }))
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('**bold** reply')
  })

  test('hidden while the message is streaming (busy)', () => {
    renderMsg({ id: 'm1', role: 'assistant', text: 'partial' }, { busy: true })
    expect(screen.queryByRole('button', { name: 'Copy message' })).not.toBeInTheDocument()
  })

  test('hidden for empty and errored messages', () => {
    renderMsg({ id: 'm1', role: 'assistant', text: '' })
    expect(screen.queryByRole('button', { name: 'Copy message' })).not.toBeInTheDocument()
    renderMsg({ id: 'm2', role: 'assistant', text: 'x', error: { message: 'snag', isLimit: false } })
    expect(screen.queryByRole('button', { name: 'Copy message' })).not.toBeInTheDocument()
  })

  test('user messages get no copy button', () => {
    renderMsg({ id: 'm1', role: 'user', text: 'question' })
    expect(screen.queryByRole('button', { name: 'Copy message' })).not.toBeInTheDocument()
  })
})
