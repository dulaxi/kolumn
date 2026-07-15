import { describe, test, expect, vi, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import InlineNotice from '../components/ui/InlineNotice'

afterEach(() => cleanup())

describe('InlineNotice', () => {
  test('renders children text', () => {
    render(<InlineNotice>Hello there</InlineNotice>)
    expect(screen.getByText('Hello there')).toBeTruthy()
  })

  test('error variant uses role="alert"', () => {
    render(<InlineNotice variant="error">Something broke</InlineNotice>)
    expect(screen.getByRole('alert')).toBeTruthy()
  })

  test('info variant uses role="status"', () => {
    render(<InlineNotice variant="info">Heads up</InlineNotice>)
    expect(screen.getByRole('status')).toBeTruthy()
  })

  test('success variant uses role="status"', () => {
    render(<InlineNotice variant="success">All good</InlineNotice>)
    expect(screen.getByRole('status')).toBeTruthy()
  })

  test('each variant produces distinct className', () => {
    const variants = ['info', 'error', 'success']
    const classes = variants.map((v) => {
      const { container, unmount } = render(<InlineNotice variant={v}>X</InlineNotice>)
      const cn = container.querySelector('[role]').className
      unmount()
      return cn
    })
    expect(new Set(classes).size).toBe(variants.length)
  })

  test('does not render a dismiss button when onDismiss is omitted', () => {
    render(<InlineNotice>No dismiss</InlineNotice>)
    expect(screen.queryByRole('button', { name: 'Dismiss' })).toBeNull()
  })

  test('renders a dismiss button and fires onDismiss when clicked', async () => {
    const onDismiss = vi.fn()
    render(<InlineNotice onDismiss={onDismiss}>Dismissable</InlineNotice>)
    const btn = screen.getByRole('button', { name: 'Dismiss' })
    await userEvent.click(btn)
    expect(onDismiss).toHaveBeenCalledTimes(1)
  })
})

describe('InlineNotice grammar upgrade', () => {
  it('error variant uses copper wash + default icon + role=alert', () => {
    const { container } = render(<InlineNotice variant="error">Nope</InlineNotice>)
    const notice = screen.getByRole('alert')
    expect(notice.className).toContain('bg-[var(--color-copper-wash)]')
    expect(notice.className).toContain('text-[var(--notice-error-text)]')
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('danger variant uses label-red tokens and role=alert', () => {
    render(<InlineNotice variant="danger">Careful</InlineNotice>)
    const notice = screen.getByRole('alert')
    expect(notice.className).toContain('bg-[var(--label-red-bg)]')
    expect(notice.className).toContain('border-[var(--label-red-text)]')
  })

  it('warn variant uses honey wash and role=status', () => {
    render(<InlineNotice variant="warn">Heads up</InlineNotice>)
    const notice = screen.getByRole('status')
    expect(notice.className).toContain('bg-[var(--color-honey-wash)]')
  })

  it('icon={false} suppresses the default icon', () => {
    const { container } = render(<InlineNotice variant="error" icon={false}>Nope</InlineNotice>)
    expect(container.querySelector('svg')).not.toBeInTheDocument()
  })

  it('renders an action node after the message', () => {
    render(<InlineNotice variant="error" action={<button>Retry</button>}>Nope</InlineNotice>)
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument()
  })
})
