import { describe, test, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import ChatMessage from '../components/chat/ChatMessage'
import { useBoardStore } from '../store/boardStore'

const renderMsg = (message) =>
  render(<MemoryRouter><ChatMessage message={message} /></MemoryRouter>)

beforeEach(() => {
  useBoardStore.setState({ cards: {}, _tempIdMap: {} })
})

describe('ChatMessage activity chips', () => {
  test('renders chips between text segments at atChar boundaries', () => {
    renderMsg({
      id: 'm1', role: 'assistant',
      text: 'Looking now. Here is what I found.',
      activities: [{ atChar: 12, icon: 'search', label: 'Searched cards · 2 results' }],
    })
    expect(screen.getByText('Searched cards · 2 results')).toBeInTheDocument()
    expect(screen.getByText(/Looking now/)).toBeInTheDocument()
    expect(screen.getByText(/Here is what I found/)).toBeInTheDocument()
  })

  test('message without activities renders text only, no chips', () => {
    renderMsg({ id: 'm2', role: 'assistant', text: 'Plain reply.' })
    expect(screen.getByText('Plain reply.')).toBeInTheDocument()
    expect(screen.queryByText(/Searched cards/)).toBeNull()
  })

  test('board icon variant renders its label', () => {
    renderMsg({
      id: 'm3', role: 'assistant', text: 'AB',
      activities: [{ atChar: 1, icon: 'board', label: 'Summarized Launch' }],
    })
    expect(screen.getByText('Summarized Launch')).toBeInTheDocument()
  })
})
