import { describe, test, expect, vi } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import ChatInput from '../components/chat/ChatInput'

describe('ChatInput', () => {
  test('send button is always rendered and disabled when empty', () => {
    render(<ChatInput onSend={vi.fn()} />)
    expect(screen.getByRole('button', { name: 'Send message' })).toBeDisabled()
    expect(screen.queryByRole('button', { name: 'Add files' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Use voice mode' })).not.toBeInTheDocument()
  })

  test('Enter while busy keeps the draft and shows the waiting hint, then hides it', () => {
    vi.useFakeTimers()
    const onSend = vi.fn()
    render(<ChatInput onSend={onSend} busy />)
    const box = screen.getByPlaceholderText('How can I help you today?')
    fireEvent.change(box, { target: { value: 'queued question' } })
    fireEvent.keyDown(box, { key: 'Enter' })
    expect(onSend).not.toHaveBeenCalled()
    expect(box).toHaveValue('queued question')
    expect(screen.getByText('Waiting for the current reply…')).toBeInTheDocument()
    act(() => vi.advanceTimersByTime(2000))
    expect(screen.queryByText('Waiting for the current reply…')).not.toBeInTheDocument()
    vi.useRealTimers()
  })

  test('Enter sends when not busy', () => {
    const onSend = vi.fn()
    render(<ChatInput onSend={onSend} />)
    const box = screen.getByPlaceholderText('How can I help you today?')
    fireEvent.change(box, { target: { value: 'hello' } })
    fireEvent.keyDown(box, { key: 'Enter' })
    expect(onSend).toHaveBeenCalledWith('hello')
    expect(box).toHaveValue('')
  })
})
