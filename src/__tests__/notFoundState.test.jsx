import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, test, expect } from 'vitest'
import NotFoundState from '../components/ui/NotFoundState'
import NotFoundPage from '../pages/NotFoundPage'

const renderIn = (ui) => render(<MemoryRouter>{ui}</MemoryRouter>)

describe('NotFoundState', () => {
  test('renders Klay, title, body and a way out', () => {
    renderIn(
      <NotFoundState
        title="This conversation is gone"
        body="It may have been deleted on another device."
        actions={[{ label: 'Back to chats', to: '/chat' }]}
      />,
    )
    expect(screen.getByRole('img', { name: /klay/i })).toBeInTheDocument()
    expect(screen.getByText('This conversation is gone')).toBeInTheDocument()
    expect(screen.getByText(/deleted on another device/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Back to chats' })).toHaveAttribute('href', '/chat')
  })

  test('every state offers at least one action — no dead ends', () => {
    renderIn(<NotFoundState title="Gone" actions={[{ label: 'Home', to: '/dashboard' }]} />)
    expect(screen.getAllByRole('link').length).toBeGreaterThan(0)
  })
})

describe('NotFoundPage (404)', () => {
  test('leads with Klay and the headline, demotes 404 to an eyebrow', () => {
    renderIn(<NotFoundPage />)
    expect(screen.getByRole('img', { name: /klay/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'This page wandered off' })).toBeInTheDocument()
    expect(screen.getByText('404')).toBeInTheDocument()
  })

  test('offers both a primary and a secondary route out', () => {
    renderIn(<NotFoundPage />)
    expect(screen.getByRole('link', { name: 'Back to Dashboard' })).toHaveAttribute('href', '/dashboard')
    expect(screen.getByRole('link', { name: 'Go to Boards' })).toHaveAttribute('href', '/boards')
  })
})
