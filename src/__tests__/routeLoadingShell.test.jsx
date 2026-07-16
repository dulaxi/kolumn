import { render, screen, act } from '@testing-library/react'
import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest'
import RouteLoadingShell from '../components/layout/RouteLoadingShell'

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('RouteLoadingShell (staged reload fallback)', () => {
  test('stage 1 renders chrome + skeletons instantly, without Klay', () => {
    render(<RouteLoadingShell />)
    expect(screen.getByText('Kolumn')).toBeInTheDocument()
    expect(screen.getByText('Loading Kolumn')).toBeInTheDocument()
    expect(screen.queryByRole('img', { name: /klay/i, hidden: true })).not.toBeInTheDocument()
  })

  test('Klay joins only after the delay — the wait has to be real', () => {
    render(<RouteLoadingShell />)
    act(() => {
      vi.advanceTimersByTime(599)
    })
    expect(screen.queryByRole('img', { name: /klay/i, hidden: true })).not.toBeInTheDocument()
    act(() => {
      vi.advanceTimersByTime(1)
    })
    expect(screen.getByRole('img', { name: /klay/i, hidden: true })).toBeInTheDocument()
  })

  test('klayDelayMs=0 shows the Klay stage immediately (sandbox mode)', () => {
    render(<RouteLoadingShell klayDelayMs={0} />)
    expect(screen.getByRole('img', { name: /klay/i, hidden: true })).toBeInTheDocument()
  })
})
