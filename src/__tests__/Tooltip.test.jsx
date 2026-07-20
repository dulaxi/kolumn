import { describe, test, expect, afterEach, vi, beforeEach } from 'vitest'
import { render, screen, cleanup, act, fireEvent } from '@testing-library/react'
import Tooltip from '../components/ui/Tooltip'

beforeEach(() => vi.useFakeTimers())
afterEach(() => {
  vi.useRealTimers()
  cleanup()
})

describe('Tooltip', () => {
  test('does not render content at rest', () => {
    render(<Tooltip content="Hint"><button type="button">trigger</button></Tooltip>)
    expect(screen.queryByRole('tooltip')).toBe(null)
  })

  test('shows content after the delay on hover', () => {
    render(<Tooltip content="Hint" delay={300}><button type="button">trigger</button></Tooltip>)
    fireEvent.mouseEnter(screen.getByText('trigger'))
    // Before the delay elapses, no tooltip
    expect(screen.queryByRole('tooltip')).toBe(null)
    act(() => { vi.advanceTimersByTime(310) })
    expect(screen.getByRole('tooltip').textContent).toContain('Hint')
  })

  test('hides content on mouseleave', () => {
    render(<Tooltip content="Hint" delay={50}><button type="button">trigger</button></Tooltip>)
    const trigger = screen.getByText('trigger')
    fireEvent.mouseEnter(trigger)
    act(() => { vi.advanceTimersByTime(60) })
    expect(screen.getByRole('tooltip')).toBeTruthy()
    fireEvent.mouseLeave(trigger)
    expect(screen.queryByRole('tooltip')).toBe(null)
  })

  test('disabled=true suppresses the tooltip entirely', () => {
    render(<Tooltip content="Hint" disabled><button type="button">trigger</button></Tooltip>)
    fireEvent.mouseEnter(screen.getByText('trigger'))
    act(() => { vi.advanceTimersByTime(500) })
    expect(screen.queryByRole('tooltip')).toBe(null)
  })

  test('null content suppresses the tooltip', () => {
    render(<Tooltip content={null}><button type="button">trigger</button></Tooltip>)
    fireEvent.mouseEnter(screen.getByText('trigger'))
    act(() => { vi.advanceTimersByTime(500) })
    expect(screen.queryByRole('tooltip')).toBe(null)
  })

  test('escapes overflow ancestors — tip is portaled out of the trigger subtree', () => {
    render(
      <div style={{ overflow: 'hidden', width: 40 }}>
        <Tooltip content="A very long assignee name" delay={50}>
          <button type="button">trigger</button>
        </Tooltip>
      </div>,
    )
    const trigger = screen.getByText('trigger')
    fireEvent.mouseEnter(trigger)
    act(() => { vi.advanceTimersByTime(60) })
    const tip = screen.getByRole('tooltip')
    // The tip must NOT live inside the trigger's wrapper — an in-place
    // absolute tip gets clipped by any overflow ancestor (kanban cards).
    expect(trigger.parentElement.contains(tip)).toBe(false)
    expect(document.body.contains(tip)).toBe(true)
  })

  test('forwards focus events through to the child', () => {
    const onFocus = vi.fn()
    render(
      <Tooltip content="Hint" delay={50}>
        <button type="button" onFocus={onFocus}>trigger</button>
      </Tooltip>,
    )
    fireEvent.focus(screen.getByText('trigger'))
    expect(onFocus).toHaveBeenCalled()
  })
})
