import { describe, test, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { fireEvent } from '@testing-library/react'
import GhostToggle from '../components/board/GhostToggle'
import { useSettingsStore } from '../store/settingsStore'

describe('GhostToggle', () => {
  beforeEach(() => useSettingsStore.setState({ ghostBoards: {} }))

  test('renders nothing for the all-tasks view', () => {
    const { container } = render(<GhostToggle boardId="__all__" />)
    expect(container.firstChild).toBeNull()
  })

  test('reflects and toggles armed state', () => {
    render(<GhostToggle boardId="b1" />)
    const btn = screen.getByRole('button', { name: /ghost/i })
    expect(btn).toHaveAttribute('aria-pressed', 'false')
    fireEvent.click(btn)
    expect(useSettingsStore.getState().isGhostArmed('b1')).toBe(true)
    expect(btn).toHaveAttribute('aria-pressed', 'true')
  })
})
