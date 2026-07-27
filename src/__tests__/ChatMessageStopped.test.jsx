import { describe, test, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import ChatMessage from '../components/chat/ChatMessage'

const renderMsg = (message) =>
  render(<MemoryRouter><ChatMessage message={message} /></MemoryRouter>)

describe('ChatMessage stopped marker', () => {
  test('a stopped message shows the muted Stopped note', () => {
    renderMsg({ id: 'm1', role: 'assistant', text: 'partial reply', stopped: true })
    expect(screen.getByText('Stopped')).toBeInTheDocument()
  })

  test('normal messages show no marker', () => {
    renderMsg({ id: 'm1', role: 'assistant', text: 'full reply' })
    expect(screen.queryByText('Stopped')).not.toBeInTheDocument()
  })
})
