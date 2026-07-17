import { describe, test, expect, vi, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import SegmentedControl from '../components/ui/SegmentedControl'

afterEach(() => cleanup())

const OPTIONS = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
]

describe('SegmentedControl', () => {
  test('renders a radiogroup with one radio per option', () => {
    render(<SegmentedControl options={OPTIONS} value="light" onChange={() => {}} ariaLabel="Appearance" />)
    expect(screen.getByRole('radiogroup', { name: 'Appearance' })).toBeTruthy()
    expect(screen.getAllByRole('radio')).toHaveLength(3)
  })

  test('marks the selected option aria-checked and gives it the only tab stop', () => {
    render(<SegmentedControl options={OPTIONS} value="light" onChange={() => {}} ariaLabel="Appearance" />)
    const radios = screen.getAllByRole('radio')
    expect(radios[1].getAttribute('aria-checked')).toBe('true')
    expect(radios[1].tabIndex).toBe(0)
    expect(radios[0].getAttribute('aria-checked')).toBe('false')
    expect(radios[0].tabIndex).toBe(-1)
  })

  test('click selects an option', async () => {
    const onChange = vi.fn()
    render(<SegmentedControl options={OPTIONS} value="light" onChange={onChange} ariaLabel="Appearance" />)
    await userEvent.click(screen.getByRole('radio', { name: 'Dark' }))
    expect(onChange).toHaveBeenCalledWith('dark')
  })

  test('arrow keys move the selection and wrap', async () => {
    const onChange = vi.fn()
    render(<SegmentedControl options={OPTIONS} value="dark" onChange={onChange} ariaLabel="Appearance" />)
    screen.getByRole('radio', { name: 'Dark' }).focus()
    await userEvent.keyboard('{ArrowRight}')
    expect(onChange).toHaveBeenCalledWith('system') // wraps past the end
    onChange.mockClear()
    await userEvent.keyboard('{ArrowLeft}')
    expect(onChange).toHaveBeenCalledWith('light')
  })

  test('icon-only options use ariaLabel for the accessible name', () => {
    render(
      <SegmentedControl
        options={[{ value: 'a', icon: <svg data-testid="ic" />, ariaLabel: 'Alpha' }, { value: 'b', label: 'Beta' }]}
        value="a"
        onChange={() => {}}
        ariaLabel="Test"
      />,
    )
    expect(screen.getByRole('radio', { name: 'Alpha' })).toBeTruthy()
  })
})
