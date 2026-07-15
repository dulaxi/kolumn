import { describe, test, expect, vi, afterEach } from 'vitest'
import { useState } from 'react'
import { render, screen, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Menu from '../components/ui/Menu'

afterEach(() => cleanup())

function MenuHarness({ panel, initialOpen = true }) {
  const [open, setOpen] = useState(initialOpen)
  return (
    <Menu open={open} onOpenChange={setOpen} panel={panel}>
      <button type="button" onClick={() => setOpen((v) => !v)}>Trigger</button>
    </Menu>
  )
}

describe('Menu', () => {
  test('Menu.Item fires onSelect when clicked', async () => {
    const onSelect = vi.fn()
    render(
      <MenuHarness
        panel={<Menu.Item onSelect={onSelect}>Settings</Menu.Item>}
      />,
    )
    await userEvent.click(screen.getByText('Settings'))
    expect(onSelect).toHaveBeenCalledTimes(1)
  })

  test('Menu.Item destructive applies red styling', () => {
    render(
      <MenuHarness
        panel={<Menu.Item destructive onSelect={() => {}}>Delete</Menu.Item>}
      />,
    )
    const item = screen.getByText('Delete').closest('button')
    expect(item.className).toMatch(/text-\[var\(--label-red-text\)\]/)
  })

  test('Menu.Item selected (single-select) shows a trailing checkmark', () => {
    const { container } = render(
      <MenuHarness
        panel={<Menu.Item selected onSelect={() => {}}>Sort by date</Menu.Item>}
      />,
    )
    // The trailing check has weight="bold" w-3.5 h-3.5
    const svgs = container.querySelectorAll('svg')
    expect(svgs.length).toBeGreaterThan(0)
  })

  test('Menu.Item checkbox renders a leading checkbox glyph', () => {
    const { container } = render(
      <MenuHarness
        panel={<Menu.Item checkbox selected={false} onSelect={() => {}}>High</Menu.Item>}
      />,
    )
    // The checkbox span gets a 14px square with a border
    const checkbox = container.querySelector('.w-3\\.5.h-3\\.5.rounded.border')
    expect(checkbox).toBeTruthy()
  })

  test('Menu.Divider renders a 1px divider', () => {
    const { container } = render(
      <MenuHarness
        panel={
          <>
            <Menu.Item onSelect={() => {}}>One</Menu.Item>
            <Menu.Divider />
            <Menu.Item onSelect={() => {}}>Two</Menu.Item>
          </>
        }
      />,
    )
    const divider = container.querySelector('.h-px')
    expect(divider).toBeTruthy()
  })

  test('Menu.Label renders a section heading', () => {
    render(
      <MenuHarness
        panel={
          <>
            <Menu.Label>Section</Menu.Label>
            <Menu.Item onSelect={() => {}}>Item</Menu.Item>
          </>
        }
      />,
    )
    expect(screen.getByText('Section')).toBeTruthy()
  })
})
