import { describe, test, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import MarkdownRenderer from '../components/chat/MarkdownRenderer'

describe('MarkdownRenderer code copy', () => {
  beforeEach(() => {
    Object.assign(navigator, { clipboard: { writeText: vi.fn().mockResolvedValue(undefined) } })
  })

  test('fenced blocks get a copy button that copies the code text', () => {
    render(<MarkdownRenderer content={'```\nconst x = 1\n```'} />)
    fireEvent.click(screen.getByRole('button', { name: 'Copy code' }))
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(expect.stringContaining('const x = 1'))
  })

  test('inline code gets no button', () => {
    render(<MarkdownRenderer content={'use `npm test` here'} />)
    expect(screen.queryByRole('button', { name: 'Copy code' })).not.toBeInTheDocument()
  })

  test('an empty language-less fenced block still renders as a block with a copy button', () => {
    render(<MarkdownRenderer content={'```\n```'} />)
    fireEvent.click(screen.getByRole('button', { name: 'Copy code' }))
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('')
  })
})
