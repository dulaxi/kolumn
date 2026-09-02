import { describe, test, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import FaqItem from '../components/marketing/FaqItem'
import PlanGrid from '../components/marketing/PlanGrid'

describe('FaqItem', () => {
  test('toggles aria-expanded and exposes the panel', async () => {
    render(<FaqItem question="Q?" answer="A." index={3} />)
    const btn = screen.getByRole('button', { name: 'Q?' })
    expect(btn).toHaveAttribute('aria-expanded', 'false')
    expect(btn).toHaveAttribute('aria-controls', 'faq-panel-3')
    await userEvent.click(btn)
    expect(btn).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByRole('region', { name: 'Q?' })).toHaveTextContent('A.')
  })
})

describe('PlanGrid', () => {
  test('renders the three plans', () => {
    render(<MemoryRouter><PlanGrid /></MemoryRouter>)
    for (const name of ['Free', 'Pro', 'Team']) {
      expect(screen.getByRole('heading', { name })).toBeInTheDocument()
    }
  })
})
