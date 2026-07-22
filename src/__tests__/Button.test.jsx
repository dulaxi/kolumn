import { describe, test, expect, vi, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useRef } from 'react'
import Button from '../components/ui/Button'

afterEach(() => cleanup())

describe('Button', () => {
  test('renders with default primary variant', () => {
    render(<Button>Save</Button>)
    const btn = screen.getByRole('button', { name: 'Save' })
    expect(btn).toBeTruthy()
    expect(btn.getAttribute('type')).toBe('button')
  })

  test('fires onClick when clicked', async () => {
    const onClick = vi.fn()
    render(<Button onClick={onClick}>Click me</Button>)
    await userEvent.click(screen.getByRole('button'))
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  test('disabled prop blocks clicks and sets aria state', async () => {
    const onClick = vi.fn()
    render(<Button disabled onClick={onClick}>Save</Button>)
    const btn = screen.getByRole('button')
    expect(btn.disabled).toBe(true)
    await userEvent.click(btn)
    expect(onClick).not.toHaveBeenCalled()
  })

  test('loading prop shows the letter wave and blocks clicks', async () => {
    const onClick = vi.fn()
    const { container } = render(<Button loading onClick={onClick}>Saving</Button>)
    const btn = screen.getByRole('button')
    expect(btn.getAttribute('aria-busy')).toBe('true')
    expect(btn.disabled).toBe(true)
    const wave = container.querySelector('.btn-wave')
    expect(wave).toBeTruthy()
    expect(wave.getAttribute('aria-hidden')).toBe('true')
    // one span per non-space character of the label
    expect(wave.querySelectorAll('span').length).toBe('Saving'.length)
    await userEvent.click(btn)
    expect(onClick).not.toHaveBeenCalled()
  })

  test('loadingText overrides children while loading', () => {
    render(<Button loading loadingText="Saving changes">Save</Button>)
    expect(screen.getByText('Saving changes')).toBeTruthy()
  })

  test('each variant produces distinct className', () => {
    const variants = ['primary', 'secondary', 'ghost', 'destructive']
    const classes = variants.map((v) => {
      const { container, unmount } = render(<Button variant={v}>X</Button>)
      const cn = container.querySelector('button').className
      unmount()
      return cn
    })
    // All five should be unique
    expect(new Set(classes).size).toBe(variants.length)
  })

  test('size="icon-md" renders square button with no horizontal padding', () => {
    const { container } = render(<Button size="icon-md" aria-label="more"><span>·</span></Button>)
    const cn = container.querySelector('button').className
    expect(cn).toMatch(/h-9 w-9/)
    expect(cn).toMatch(/p-0/)
  })

  test('asChild renders the child element with merged className and forwards onClick', async () => {
    const onClick = vi.fn()
    const { container } = render(
      <Button asChild onClick={onClick}>
        <a href="/x">Link</a>
      </Button>,
    )
    const link = container.querySelector('a')
    expect(link).toBeTruthy()
    expect(link.getAttribute('href')).toBe('/x')
    // The child gets the Button's className merged in
    expect(link.className).toMatch(/inline-flex/)
    await userEvent.click(link)
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  test('forwards ref to the underlying button', () => {
    let captured = null
    function Capture() {
      const ref = useRef(null)
      captured = ref
      return <Button ref={ref}>X</Button>
    }
    render(<Capture />)
    expect(captured.current?.tagName).toBe('BUTTON')
  })

  test('cursor-pointer is applied at rest, cursor-not-allowed when disabled', () => {
    const { container, rerender } = render(<Button>X</Button>)
    expect(container.querySelector('button').className).toMatch(/cursor-pointer/)
    rerender(<Button disabled>X</Button>)
    expect(container.querySelector('button').className).toMatch(/cursor-not-allowed/)
  })

  test('destructive variant uses red, not copper', () => {
    render(<Button variant="destructive">Delete</Button>)
    const btn = screen.getByRole('button', { name: 'Delete' })
    expect(btn.className).toContain('bg-[var(--color-red)]')
    expect(btn.className).not.toContain('copper')
  })

  test('renders xl size for full-width flow CTAs', () => {
    render(<Button size="xl">Continue</Button>)
    expect(screen.getByRole('button')).toHaveClass('h-11', 'text-base')
  })
})
