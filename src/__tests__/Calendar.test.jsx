import { describe, test, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { format, addMonths } from 'date-fns'
import Calendar from '../components/ui/Calendar'

describe('Calendar', () => {
  test('renders the current month and selects a day as yyyy-MM-dd', () => {
    const onChange = vi.fn()
    render(<Calendar value="" onChange={onChange} />)

    const now = new Date()
    expect(screen.getByText(format(now, 'MMMM yyyy'))).toBeInTheDocument()

    // Pick the 15th of the visible month
    fireEvent.click(screen.getByRole('button', { name: format(new Date(now.getFullYear(), now.getMonth(), 15), 'PPPP') }))
    expect(onChange).toHaveBeenCalledWith(format(new Date(now.getFullYear(), now.getMonth(), 15), 'yyyy-MM-dd'))
  })

  test('opens on the month of the selected value and marks it selected', () => {
    render(<Calendar value="2026-09-10" onChange={() => {}} />)
    expect(screen.getByText('September 2026')).toBeInTheDocument()
    const day = screen.getByRole('button', { name: /September 10th, 2026/ })
    expect(day).toHaveAttribute('aria-pressed', 'true')
  })

  test('navigates months with the caret buttons', () => {
    render(<Calendar value="" onChange={() => {}} />)
    const next = screen.getByRole('button', { name: 'Next month' })
    fireEvent.click(next)
    expect(screen.getByText(format(addMonths(new Date(), 1), 'MMMM yyyy'))).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Previous month' }))
    fireEvent.click(screen.getByRole('button', { name: 'Previous month' }))
    expect(screen.getByText(format(addMonths(new Date(), -1), 'MMMM yyyy'))).toBeInTheDocument()
  })

  test('Today selects today; Clear appears only with a value and returns null', () => {
    const onChange = vi.fn()
    const { rerender } = render(<Calendar value="" onChange={onChange} />)
    expect(screen.queryByRole('button', { name: 'Clear' })).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'Today' }))
    expect(onChange).toHaveBeenCalledWith(format(new Date(), 'yyyy-MM-dd'))

    rerender(<Calendar value="2026-09-10" onChange={onChange} />)
    fireEvent.click(screen.getByRole('button', { name: 'Clear' }))
    expect(onChange).toHaveBeenCalledWith(null)
  })
})
