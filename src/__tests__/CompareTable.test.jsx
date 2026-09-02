import { describe, test, expect } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import CompareTable from '../components/marketing/CompareTable'

const comparison = {
  columns: ['Free', 'Pro'],
  note: 'A note.',
  rows: [
    { label: 'Boards', cells: ['Unlimited', 'Unlimited'] },
    { label: 'Moves cards', cells: [false, true] },
  ],
}

describe('CompareTable', () => {
  test('renders a table with column headers, value cells and yes/no glyphs', () => {
    render(<CompareTable comparison={comparison} />)
    const table = screen.getByRole('table', { name: /compare plans/i })
    expect(within(table).getByRole('columnheader', { name: 'Pro' })).toBeInTheDocument()
    expect(within(table).getAllByText('Unlimited')).toHaveLength(2)
    const row = within(table).getByRole('row', { name: /moves cards/i })
    expect(within(row).getByLabelText('Not included')).toBeInTheDocument()
    expect(within(row).getByLabelText('Included')).toBeInTheDocument()
    expect(screen.getByText('A note.')).toBeInTheDocument()
  })
})
