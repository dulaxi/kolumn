import { render, screen, act } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest'
import RouteLoadingShell from '../components/layout/RouteLoadingShell'
import { useSettingsStore } from '../store/settingsStore'

const renderAt = (path, props) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <RouteLoadingShell {...props} />
    </MemoryRouter>,
  )

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
  useSettingsStore.setState({ sidebarCollapsed: false })
})

describe('RouteLoadingShell (staged, destination-aware reload fallback)', () => {
  test('stage 1 renders chrome + skeletons instantly, without Klay', () => {
    renderAt('/boards')
    expect(screen.getByText('Kolumn')).toBeInTheDocument()
    expect(screen.getByText('Loading Kolumn')).toBeInTheDocument()
    expect(screen.queryByRole('img', { name: /klay/i, hidden: true })).not.toBeInTheDocument()
  })

  test('Klay joins only after the delay — the wait has to be real', () => {
    renderAt('/boards')
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
    renderAt('/boards', { klayDelayMs: 0 })
    expect(screen.getByRole('img', { name: /klay/i, hidden: true })).toBeInTheDocument()
  })

  test.each([
    ['/boards', 'skeleton-boards'],
    ['/boards/abc', 'skeleton-boards'],
    ['/chat/123', 'skeleton-chat'],
    ['/dashboard', 'skeleton-dashboard'],
    ['/chat', 'skeleton-page'],
    ['/settings', 'skeleton-page'],
    ['/workspace', 'skeleton-page'],
    ['/build', 'skeleton-page'],
  ])('the content skeleton matches the destination: %s → %s', (path, testid) => {
    renderAt(path)
    expect(screen.getByTestId(testid)).toBeInTheDocument()
  })

  test('honors the persisted collapsed sidebar — mark only, no wordmark', () => {
    useSettingsStore.setState({ sidebarCollapsed: true })
    const { container } = renderAt('/boards')
    expect(screen.queryByText('Kolumn')).not.toBeInTheDocument()
    expect(container.querySelector('aside svg')).toBeInTheDocument()
  })

  test('expanded sidebar shows the logo mark AND the wordmark', () => {
    const { container } = renderAt('/boards')
    expect(screen.getByText('Kolumn')).toBeInTheDocument()
    expect(container.querySelector('aside svg')).toBeInTheDocument()
  })
})
