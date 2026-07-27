import { describe, test, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import ChatMessage from '../components/chat/ChatMessage'

const renderMsg = (message, onRetry) =>
  render(<MemoryRouter><ChatMessage message={message} onRetry={onRetry} /></MemoryRouter>)

describe('ChatMessage retry', () => {
  test('errored message shows Retry and fires onRetry', () => {
    const onRetry = vi.fn()
    renderMsg(
      { id: 'm1', role: 'assistant', text: '', error: { message: 'Claude hit a snag — try sending that again.', isLimit: false } },
      onRetry,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }))
    expect(onRetry).toHaveBeenCalledTimes(1)
  })

  test('limit errors show the upgrade link, not Retry', () => {
    renderMsg(
      { id: 'm1', role: 'assistant', text: '', error: { message: 'Daily limit reached.', isLimit: true } },
      vi.fn(),
    )
    expect(screen.queryByRole('button', { name: 'Retry' })).not.toBeInTheDocument()
    expect(screen.getByText('Upgrade to Pro')).toBeInTheDocument()
  })

  test('no Retry without an onRetry handler', () => {
    renderMsg({ id: 'm1', role: 'assistant', text: '', error: { message: 'snag', isLimit: false } })
    expect(screen.queryByRole('button', { name: 'Retry' })).not.toBeInTheDocument()
  })
})
