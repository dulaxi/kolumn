import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import LabelAutocomplete from '../components/board/LabelAutocomplete'

vi.mock('../store/boardStore', () => ({
  useBoardStore: (selector) => selector({
    labels: {
      L1: { id: 'L1', board_id: 'B1', text: 'Frontend', color: 'blue',  archived_at: null },
      L2: { id: 'L2', board_id: 'B1', text: 'Backend',  color: 'green', archived_at: null },
      L3: { id: 'L3', board_id: 'B1', text: 'Bug',      color: 'red',   archived_at: null },
    },
  }),
}))

describe('LabelAutocomplete', () => {
  it('filters by case-insensitive prefix as user types', () => {
    render(<LabelAutocomplete boardId="B1" excludeIds={[]} onPick={() => {}} onCreate={() => {}} onManage={() => {}} />)
    const input = screen.getByPlaceholderText('/label')
    fireEvent.change(input, { target: { value: 'fr' } })
    expect(screen.getByText('Frontend')).toBeTruthy()
    expect(screen.queryByText('Backend')).toBeNull()
  })

  it('calls onPick when an existing label is clicked', () => {
    const onPick = vi.fn()
    render(<LabelAutocomplete boardId="B1" excludeIds={[]} onPick={onPick} onCreate={() => {}} onManage={() => {}} />)
    fireEvent.change(screen.getByPlaceholderText('/label'), { target: { value: 'bug' } })
    fireEvent.click(screen.getByText('Bug'))
    expect(onPick).toHaveBeenCalledWith(expect.objectContaining({ id: 'L3' }))
  })

  it('calls onCreate with text and color when no match exists and user hits Enter', () => {
    const onCreate = vi.fn()
    render(<LabelAutocomplete boardId="B1" excludeIds={[]} onPick={() => {}} onCreate={onCreate} onManage={() => {}} />)
    const input = screen.getByPlaceholderText('/label')
    fireEvent.change(input, { target: { value: 'NewLabel' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(onCreate).toHaveBeenCalledWith('NewLabel', expect.any(String))
  })

  it('excludes labels in excludeIds', () => {
    render(<LabelAutocomplete boardId="B1" excludeIds={['L3']} onPick={() => {}} onCreate={() => {}} onManage={() => {}} />)
    fireEvent.change(screen.getByPlaceholderText('/label'), { target: { value: 'b' } })
    expect(screen.queryByText('Bug')).toBeNull()
    expect(screen.getByText('Backend')).toBeTruthy()
  })

  it('shows Manage labels footer that calls onManage', () => {
    const onManage = vi.fn()
    render(<LabelAutocomplete boardId="B1" excludeIds={[]} onPick={() => {}} onCreate={() => {}} onManage={onManage} />)
    fireEvent.click(screen.getByText(/Manage labels/i))
    expect(onManage).toHaveBeenCalled()
  })

  it('blurring with typed text creates the label (click-away commit)', () => {
    const onCreate = vi.fn()
    render(<LabelAutocomplete boardId="B1" excludeIds={[]} onPick={() => {}} onCreate={onCreate} onManage={() => {}} />)
    const input = screen.getByPlaceholderText('/label')
    fireEvent.change(input, { target: { value: 'Shipped' } })
    fireEvent.blur(input)
    expect(onCreate).toHaveBeenCalledWith('Shipped', expect.any(String))
  })

  it('blurring with a query that matches an existing label picks it (click-away commit)', () => {
    const onPick = vi.fn()
    render(<LabelAutocomplete boardId="B1" excludeIds={[]} onPick={onPick} onCreate={() => {}} onManage={() => {}} />)
    const input = screen.getByPlaceholderText('/label')
    fireEvent.change(input, { target: { value: 'fr' } })
    fireEvent.blur(input)
    expect(onPick).toHaveBeenCalledWith(expect.objectContaining({ id: 'L1' }))
  })

  it('blurring with no input calls onClose', () => {
    const onClose = vi.fn()
    render(<LabelAutocomplete boardId="B1" excludeIds={[]} onPick={() => {}} onCreate={() => {}} onManage={() => {}} onClose={onClose} />)
    fireEvent.blur(screen.getByPlaceholderText('/label'))
    expect(onClose).toHaveBeenCalled()
  })

  it('Escape closes via onClose', () => {
    const onClose = vi.fn()
    render(<LabelAutocomplete boardId="B1" excludeIds={[]} onPick={() => {}} onCreate={() => {}} onManage={() => {}} onClose={onClose} />)
    fireEvent.keyDown(screen.getByPlaceholderText('/label'), { key: 'Escape' })
    expect(onClose).toHaveBeenCalled()
  })
})
