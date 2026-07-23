import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import UpsellStep from '../components/UpsellStep'

afterEach(cleanup)

describe('UpsellStep', () => {
  it('keeps the three feature cards and header copy', () => {
    render(<UpsellStep onTryPro={() => {}} onSkip={() => {}} />)
    expect(screen.getByText('Get more out of Kolumn with Pro')).toBeInTheDocument()
    expect(screen.getByText('Chat with your boards')).toBeInTheDocument()
    expect(screen.getByText('Agentic moves')).toBeInTheDocument()
    expect(screen.getByText('Connect your tools')).toBeInTheDocument()
    expect(screen.getByText('Coming soon')).toBeInTheDocument()
  })

  it('wires both CTAs', () => {
    const onTryPro = vi.fn()
    const onSkip = vi.fn()
    render(<UpsellStep onTryPro={onTryPro} onSkip={onSkip} />)
    fireEvent.click(screen.getByRole('button', { name: /get pro free for 1 week/i }))
    fireEvent.click(screen.getByRole('button', { name: /skip/i }))
    expect(onTryPro).toHaveBeenCalledTimes(1)
    expect(onSkip).toHaveBeenCalledTimes(1)
  })

  it('renders one traveling Klay and three resting-prop stages', () => {
    const { container } = render(<UpsellStep onTryPro={() => {}} onSkip={() => {}} />)
    expect(screen.getByRole('img', { name: 'Klay demonstrating Kolumn Pro features' })).toBeInTheDocument()
    // three station anchors, each with a static props svg
    expect(container.querySelectorAll('[data-klay-station]')).toHaveLength(3)
  })
})
