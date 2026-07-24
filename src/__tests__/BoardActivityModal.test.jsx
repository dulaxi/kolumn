import { describe, test, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

vi.mock('../lib/supabase', () => {
  const { createMockSupabase } = require('./mocks/supabase')
  return { supabase: createMockSupabase() }
})
vi.mock('../utils/logger', () => ({ logError: vi.fn() }))

import BoardActivityModal from '../components/board/BoardActivityModal'
import { useBoardStore } from '../store/boardStore'

const TODAY = new Date().toISOString()
const OLD = '2026-01-05T10:00:00Z'

const ROWS = [
  { id: 'a1', card_id: 'c1', board_id: 'b1', actor_name: 'Sarah', action: 'moved', detail: 'Backlog → Done', meta: { card_title: 'Redo hero', card_icon: 'rocket' }, created_at: TODAY },
  { id: 'a2', card_id: null, board_id: 'b1', actor_name: 'Dulaxi', action: 'deleted', detail: null, meta: { card_title: 'Old card', card_icon: null }, created_at: OLD },
  { id: 'a3', card_id: 'c2', board_id: 'b1', actor_name: 'Sarah', action: 'label_added', detail: 'bug', meta: { card_title: 'Fix login', card_icon: null }, created_at: OLD },
]

describe('BoardActivityModal', () => {
  beforeEach(() => {
    useBoardStore.setState({
      boardActivity: { b1: ROWS },
      fetchBoardActivity: vi.fn().mockResolvedValue(ROWS.length),
    })
  })

  const renderModal = () => render(<BoardActivityModal boardId="b1" onClose={() => {}} />)

  test('groups rows by day with Today and dated headers', () => {
    renderModal()
    expect(screen.getByText('Today')).toBeInTheDocument()
    expect(screen.getByText('Jan 5')).toBeInTheDocument()
  })

  test('renders actor, verb, card title and detail', () => {
    renderModal()
    expect(screen.getAllByText('Sarah', { exact: false }).length).toBeGreaterThan(0)
    expect(screen.getByText('Redo hero')).toBeInTheDocument()
    expect(screen.getByText('Backlog → Done')).toBeInTheDocument()
  })

  test('deleted-card rows are not clickable; live rows dispatch open-card', () => {
    const spy = vi.fn()
    window.addEventListener('kolumn:open-card', spy)
    renderModal()
    fireEvent.click(screen.getByText('Redo hero'))
    expect(spy).toHaveBeenCalledTimes(1)
    fireEvent.click(screen.getByText('Old card'))
    expect(spy).toHaveBeenCalledTimes(1) // unchanged — dead chip
    window.removeEventListener('kolumn:open-card', spy)
  })

  test('type chips filter the list', () => {
    renderModal()
    fireEvent.click(screen.getByRole('button', { name: 'Labels' }))
    expect(screen.getByText('Fix login')).toBeInTheDocument()
    expect(screen.queryByText('Redo hero')).toBeNull()
  })
})
