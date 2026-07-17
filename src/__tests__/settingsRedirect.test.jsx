import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, cleanup, act } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import SettingsRedirect from '../components/settings/SettingsRedirect'

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

describe('SettingsRedirect', () => {
  test('does not dispatch kolumn:open-settings synchronously on mount', () => {
    const spy = vi.fn()
    window.addEventListener('kolumn:open-settings', spy)
    render(
      <MemoryRouter initialEntries={['/settings']}>
        <Routes>
          <Route path="/settings" element={<SettingsRedirect />} />
          <Route path="/dashboard" element={<div>dashboard</div>} />
        </Routes>
      </MemoryRouter>,
    )
    expect(spy).not.toHaveBeenCalled()
    window.removeEventListener('kolumn:open-settings', spy)
  })

  test('dispatches kolumn:open-settings after timers flush', () => {
    const spy = vi.fn()
    window.addEventListener('kolumn:open-settings', spy)
    render(
      <MemoryRouter initialEntries={['/settings']}>
        <Routes>
          <Route path="/settings" element={<SettingsRedirect />} />
          <Route path="/dashboard" element={<div>dashboard</div>} />
        </Routes>
      </MemoryRouter>,
    )
    expect(spy).not.toHaveBeenCalled()
    act(() => {
      vi.runAllTimers()
    })
    expect(spy).toHaveBeenCalledTimes(1)
    window.removeEventListener('kolumn:open-settings', spy)
  })
})
