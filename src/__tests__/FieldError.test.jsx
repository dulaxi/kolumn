import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import FieldError from '../components/ui/FieldError'

describe('FieldError', () => {
  it('renders message with alert role, mono micro styling, and icon', () => {
    const { container } = render(<FieldError>Already invited</FieldError>)
    const el = screen.getByRole('alert')
    expect(el).toHaveTextContent('Already invited')
    expect(el.className).toContain('font-mono')
    expect(el.className).toContain('text-[11px]')
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('renders nothing when children is falsy', () => {
    const { container } = render(<FieldError>{''}</FieldError>)
    expect(container).toBeEmptyDOMElement()
  })
})
