import { describe, test, expect, vi, afterEach } from 'vitest'
import { useState } from 'react'
import { render, screen, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Popover from '../components/ui/Popover'

afterEach(() => cleanup())

function Harness({ initialOpen = false, onOpenChange = () => {}, panel = <div data-testid="panel">Hi</div>, ...rest }) {
  const [open, setOpen] = useState(initialOpen)
  return (
    <Popover
      open={open}
      onOpenChange={(next) => { setOpen(next); onOpenChange(next) }}
      panel={panel}
      {...rest}
    >
      <button type="button" onClick={() => setOpen((v) => !v)}>Toggle</button>
    </Popover>
  )
}

describe('Popover', () => {
  test('does not render the panel when open=false', () => {
    render(<Harness />)
    expect(screen.queryByTestId('panel')).toBe(null)
  })

  test('renders the panel when open=true', () => {
    render(<Harness initialOpen />)
    expect(screen.getByTestId('panel')).toBeTruthy()
  })

  test('Escape closes the panel', async () => {
    const onOpenChange = vi.fn()
    render(<Harness initialOpen onOpenChange={onOpenChange} />)
    expect(screen.getByTestId('panel')).toBeTruthy()
    await userEvent.keyboard('{Escape}')
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  test('clicking outside closes the panel', async () => {
    const onOpenChange = vi.fn()
    render(
      <div>
        <div data-testid="outside">Outside</div>
        <Harness initialOpen onOpenChange={onOpenChange} />
      </div>,
    )
    expect(screen.getByTestId('panel')).toBeTruthy()
    await userEvent.click(screen.getByTestId('outside'))
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  test('placement="top-end" applies top-end positioning classes', () => {
    render(<Harness initialOpen placement="top-end" />)
    const panel = screen.getByRole('dialog')
    expect(panel.className).toMatch(/bottom-full/)
    expect(panel.className).toMatch(/right-0/)
  })

  test('closeOnEscape={false} keeps the panel open on Escape', async () => {
    const onOpenChange = vi.fn()
    render(<Harness initialOpen closeOnEscape={false} onOpenChange={onOpenChange} />)
    await userEvent.keyboard('{Escape}')
    expect(onOpenChange).not.toHaveBeenCalled()
  })

  test('closeOnOutsideClick={false} keeps the panel open on outside click', async () => {
    const onOpenChange = vi.fn()
    render(
      <div>
        <div data-testid="outside">Outside</div>
        <Harness initialOpen closeOnOutsideClick={false} onOpenChange={onOpenChange} />
      </div>,
    )
    await userEvent.click(screen.getByTestId('outside'))
    expect(onOpenChange).not.toHaveBeenCalled()
  })
})
