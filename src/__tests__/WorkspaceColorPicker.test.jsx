import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import WorkspaceColorPicker from '../components/workspace/WorkspaceColorPicker'
import { WORKSPACE_COLORS } from '../constants/colors'

describe('WorkspaceColorPicker', () => {
  it('renders a swatch button for every WORKSPACE_COLORS entry', () => {
    render(<WorkspaceColorPicker value={null} onChange={() => {}} onClose={() => {}} />)
    for (const c of WORKSPACE_COLORS) {
      expect(screen.getByRole('button', { name: c.name })).toBeInTheDocument()
    }
    expect(screen.getAllByRole('button').length).toBe(WORKSPACE_COLORS.length)
  })

  it('marks the swatch matching `value` as selected via aria-pressed', () => {
    render(<WorkspaceColorPicker value="copper" onChange={() => {}} onClose={() => {}} />)
    const copper = screen.getByRole('button', { name: 'copper' })
    expect(copper).toHaveAttribute('aria-pressed', 'true')
    const lime = screen.getByRole('button', { name: 'lime' })
    expect(lime).toHaveAttribute('aria-pressed', 'false')
  })

  it('does not mark any swatch selected for a legacy/non-matching value', () => {
    render(<WorkspaceColorPicker value="cube" onChange={() => {}} onClose={() => {}} />)
    for (const c of WORKSPACE_COLORS) {
      expect(screen.getByRole('button', { name: c.name })).toHaveAttribute('aria-pressed', 'false')
    }
  })

  it('calls onChange with the swatch name then onClose when a swatch is clicked', () => {
    const onChange = vi.fn()
    const onClose = vi.fn()
    render(<WorkspaceColorPicker value={null} onChange={onChange} onClose={onClose} />)
    fireEvent.click(screen.getByRole('button', { name: 'honey' }))
    expect(onChange).toHaveBeenCalledWith('honey')
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
