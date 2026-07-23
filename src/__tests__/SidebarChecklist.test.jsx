import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import SidebarChecklist from '../components/layout/SidebarChecklist'
import { useAuthStore } from '../store/authStore'
import { SHIP_DATE } from '../constants/onboarding'

const AFTER = new Date(SHIP_DATE.getTime() + 86400000).toISOString()
const BEFORE = new Date(SHIP_DATE.getTime() - 86400000).toISOString()

const renderCard = () =>
  render(
    <MemoryRouter>
      <SidebarChecklist />
    </MemoryRouter>,
  )

describe('SidebarChecklist', () => {
  beforeEach(() => useAuthStore.setState({ profile: null }))

  it('renders nothing for old accounts', () => {
    useAuthStore.setState({ profile: { created_at: BEFORE, onboarding_steps: {} } })
    const { container } = renderCard()
    expect(container.firstChild).toBeNull()
  })

  it('renders three steps and a 0 / 3 counter for a fresh account', () => {
    useAuthStore.setState({ profile: { created_at: AFTER, onboarding_steps: {} } })
    renderCard()
    expect(screen.getByText('Get started')).toBeInTheDocument()
    expect(screen.getByText('0 / 3')).toBeInTheDocument()
    expect(screen.getByText('Create your first board')).toBeInTheDocument()
    expect(screen.getByText('Add a card')).toBeInTheDocument()
    expect(screen.getByText('Ask the AI')).toBeInTheDocument()
  })

  it('counts completed steps and hides when all are done', () => {
    useAuthStore.setState({ profile: { created_at: AFTER, onboarding_steps: { board: AFTER } } })
    renderCard()
    expect(screen.getByText('1 / 3')).toBeInTheDocument()

    useAuthStore.setState({
      profile: { created_at: AFTER, onboarding_steps: { board: AFTER, card: AFTER, ai: AFTER } },
    })
    const { container } = renderCard()
    expect(container.firstChild).toBeNull()
  })

  it('has an accessible dismiss button', () => {
    useAuthStore.setState({ profile: { created_at: AFTER, onboarding_steps: {} } })
    renderCard()
    expect(screen.getByRole('button', { name: 'Dismiss checklist' })).toBeInTheDocument()
  })
})
