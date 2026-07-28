import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest'
import { useState } from 'react'
import { render, screen, cleanup, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Modal from '../components/ui/Modal'

// jsdom doesn't have a #root by default; AppLayout provides one in the real app.
// We add one before each test so the inert/aria-hidden behavior is exercised.
let appRoot

beforeEach(() => {
  appRoot = document.createElement('div')
  appRoot.id = 'root'
  document.body.appendChild(appRoot)
})

afterEach(() => {
  cleanup()
  if (appRoot && appRoot.parentNode) appRoot.parentNode.removeChild(appRoot)
  // Defensive cleanup in case a test failed mid-flight
  document.body.style.overflow = ''
  document.body.style.paddingRight = ''
})

function Harness({ open: initialOpen = true, onClose, ...props }) {
  return (
    <Modal open={initialOpen} onClose={onClose || vi.fn()} {...props}>
      <div data-testid="content">
        <button>First</button>
        <input aria-label="middle-input" />
        <button>Last</button>
      </div>
    </Modal>
  )
}

describe('Modal primitive', () => {
  test('renders nothing when open=false', () => {
    render(<Harness open={false} />)
    expect(screen.queryByTestId('content')).not.toBeInTheDocument()
  })

  test('renders content when open=true and is portaled to body', () => {
    render(<Harness />)
    const content = screen.getByTestId('content')
    expect(content).toBeInTheDocument()
    // Portal target is body — content should NOT be inside the harness's wrapper
    expect(document.body.contains(content)).toBe(true)
  })

  test('sets role="dialog" and aria-modal on the content wrapper', () => {
    render(<Harness ariaLabel="Test dialog" />)
    const dialog = screen.getByRole('dialog', { name: /test dialog/i })
    expect(dialog).toHaveAttribute('aria-modal', 'true')
  })

  test('supports role="alertdialog"', () => {
    render(<Harness role="alertdialog" ariaLabel="Confirm" />)
    expect(screen.getByRole('alertdialog', { name: /confirm/i })).toBeInTheDocument()
  })

  test('locks body scroll while open and restores on close', () => {
    document.body.style.overflow = 'auto'
    const { rerender } = render(<Harness />)
    expect(document.body.style.overflow).toBe('hidden')
    rerender(<Harness open={false} />)
    expect(document.body.style.overflow).toBe('auto')
  })

  test('sets inert + aria-hidden on #root while open and restores on close', () => {
    const { rerender } = render(<Harness />)
    expect(appRoot.hasAttribute('inert')).toBe(true)
    expect(appRoot.getAttribute('aria-hidden')).toBe('true')
    rerender(<Harness open={false} />)
    expect(appRoot.hasAttribute('inert')).toBe(false)
    expect(appRoot.hasAttribute('aria-hidden')).toBe(false)
  })

  test('Escape key calls onClose', async () => {
    const onClose = vi.fn()
    render(<Harness onClose={onClose} />)
    await userEvent.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  test('Escape does NOT close when dismissOnEscape=false', async () => {
    const onClose = vi.fn()
    render(<Harness onClose={onClose} dismissOnEscape={false} />)
    await userEvent.keyboard('{Escape}')
    expect(onClose).not.toHaveBeenCalled()
  })

  test('clicking the backdrop calls onClose', async () => {
    const onClose = vi.fn()
    render(<Harness onClose={onClose} />)
    const backdrop = document.querySelector('[data-modal-backdrop]')
    await userEvent.click(backdrop)
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  test('clicking inside content does NOT close', async () => {
    const onClose = vi.fn()
    render(<Harness onClose={onClose} />)
    await userEvent.click(screen.getByTestId('content'))
    expect(onClose).not.toHaveBeenCalled()
  })

  test('outside-click does NOT close when dismissOnOutside=false', async () => {
    const onClose = vi.fn()
    render(<Harness onClose={onClose} dismissOnOutside={false} />)
    const backdrop = document.querySelector('[data-modal-backdrop]')
    await userEvent.click(backdrop)
    expect(onClose).not.toHaveBeenCalled()
  })

  test('Tab from last focusable wraps to first (focus trap)', async () => {
    render(<Harness />)
    const buttons = screen.getAllByRole('button')
    const last = buttons[buttons.length - 1]
    last.focus()
    expect(document.activeElement).toBe(last)
    await userEvent.tab()
    expect(document.activeElement).toBe(buttons[0])
  })

  test('Shift+Tab from first focusable wraps to last (focus trap)', async () => {
    render(<Harness />)
    const buttons = screen.getAllByRole('button')
    const first = buttons[0]
    first.focus()
    await userEvent.tab({ shift: true })
    expect(document.activeElement).toBe(buttons[buttons.length - 1])
  })

  test('focuses first focusable on open by default', () => {
    render(<Harness />)
    const buttons = screen.getAllByRole('button')
    expect(document.activeElement).toBe(buttons[0])
  })

  test('does NOT restore focus when closed by Escape (avoids :focus-visible ring on trigger)', async () => {
    const trigger = document.createElement('button')
    trigger.textContent = 'Trigger'
    document.body.appendChild(trigger)
    trigger.focus()
    expect(document.activeElement).toBe(trigger)

    function Wrapper() {
      const [open, setOpen] = useState(true)
      return <Harness open={open} onClose={() => setOpen(false)} />
    }
    render(<Wrapper />)
    expect(document.activeElement).not.toBe(trigger)
    await userEvent.keyboard('{Escape}')
    expect(document.activeElement).not.toBe(trigger)

    document.body.removeChild(trigger)
  })

  test('does NOT restore focus when closed by backdrop click (avoids stale focus ring)', async () => {
    const trigger = document.createElement('button')
    trigger.textContent = 'Trigger'
    document.body.appendChild(trigger)
    trigger.focus()

    function Wrapper() {
      const [open, setOpen] = useState(true)
      return <Harness open={open} onClose={() => setOpen(false)} />
    }
    render(<Wrapper />)
    expect(document.activeElement).not.toBe(trigger)

    const backdrop = document.querySelector('[data-modal-backdrop]')
    await userEvent.click(backdrop)
    expect(document.activeElement).not.toBe(trigger)

    document.body.removeChild(trigger)
  })

  test('stack-aware: only the topmost modal responds to Escape', async () => {
    const onCloseOuter = vi.fn()
    const onCloseInner = vi.fn()
    render(
      <>
        <Modal open onClose={onCloseOuter}>
          <button>Outer</button>
        </Modal>
        <Modal open onClose={onCloseInner}>
          <button>Inner</button>
        </Modal>
      </>,
    )
    await userEvent.keyboard('{Escape}')
    expect(onCloseInner).toHaveBeenCalledTimes(1)
    expect(onCloseOuter).not.toHaveBeenCalled()
  })

  test('stack-aware: nested modals do not unlock scroll until all close', () => {
    const { rerender } = render(
      <>
        <Modal open onClose={vi.fn()}>
          <button>A</button>
        </Modal>
        <Modal open onClose={vi.fn()}>
          <button>B</button>
        </Modal>
      </>,
    )
    expect(document.body.style.overflow).toBe('hidden')

    // Close inner only
    rerender(
      <>
        <Modal open onClose={vi.fn()}>
          <button>A</button>
        </Modal>
        <Modal open={false} onClose={vi.fn()}>
          <button>B</button>
        </Modal>
      </>,
    )
    expect(document.body.style.overflow).toBe('hidden')

    // Close outer
    rerender(
      <>
        <Modal open={false} onClose={vi.fn()}>
          <button>A</button>
        </Modal>
        <Modal open={false} onClose={vi.fn()}>
          <button>B</button>
        </Modal>
      </>,
    )
    expect(document.body.style.overflow).toBe('')
  })

  test('backdrop carries data-animated and data-state="open" while open', () => {
    render(<Harness />)
    const backdrop = document.querySelector('[data-modal-backdrop]')
    expect(backdrop.hasAttribute('data-animated')).toBe(true)
    expect(backdrop.getAttribute('data-state')).toBe('open')
  })

  test('exit is deferred: closing keeps the DOM with data-state="closed", then unmounts', () => {
    vi.useFakeTimers()
    try {
      const { rerender } = render(<Harness />)
      rerender(<Harness open={false} />)
      const backdrop = document.querySelector('[data-modal-backdrop]')
      expect(backdrop).not.toBe(null)
      expect(backdrop.getAttribute('data-state')).toBe('closed')
      act(() => { vi.advanceTimersByTime(200) })
      expect(document.querySelector('[data-modal-backdrop]')).toBe(null)
    } finally {
      vi.useRealTimers()
    }
  })

  test('animated={false} renders no data-animated and unmounts immediately', () => {
    const { rerender } = render(<Harness animated={false} />)
    const backdrop = document.querySelector('[data-modal-backdrop]')
    expect(backdrop.hasAttribute('data-animated')).toBe(false)
    rerender(<Harness animated={false} open={false} />)
    expect(document.querySelector('[data-modal-backdrop]')).toBe(null)
  })

  test('scroll lock and inert release immediately on close, before the exit finishes', () => {
    vi.useFakeTimers()
    try {
      document.body.style.overflow = 'auto'
      const { rerender } = render(<Harness />)
      expect(document.body.style.overflow).toBe('hidden')
      rerender(<Harness open={false} />)
      // Exit animation still playing (DOM mounted), but locks are gone
      expect(document.querySelector('[data-modal-backdrop]')).not.toBe(null)
      expect(document.body.style.overflow).toBe('auto')
      expect(appRoot.hasAttribute('inert')).toBe(false)
      act(() => { vi.advanceTimersByTime(200) })
    } finally {
      vi.useRealTimers()
    }
  })
})
