import { describe, test, expect, beforeEach, afterEach } from 'vitest'
import { renderHook, act, cleanup } from '@testing-library/react'
import { resolveMotion, applyMotion } from '../utils/motion'
import { useSettingsStore } from '../store/settingsStore'
import useReducedMotion from '../hooks/useReducedMotion'

afterEach(() => {
  cleanup()
  document.documentElement.removeAttribute('data-motion')
  useSettingsStore.setState({ motion: 'system' })
})

describe('resolveMotion', () => {
  test('passes through the two explicit values', () => {
    expect(resolveMotion('full')).toBe('full')
    expect(resolveMotion('reduced')).toBe('reduced')
  })

  test('anything else resolves to system', () => {
    expect(resolveMotion('system')).toBe('system')
    expect(resolveMotion(undefined)).toBe('system')
    expect(resolveMotion('bogus')).toBe('system')
  })
})

describe('applyMotion', () => {
  test('stamps data-motion for explicit values', () => {
    applyMotion('reduced')
    expect(document.documentElement.getAttribute('data-motion')).toBe('reduced')
    applyMotion('full')
    expect(document.documentElement.getAttribute('data-motion')).toBe('full')
  })

  test('removes the attribute for system (media query takes over)', () => {
    applyMotion('reduced')
    applyMotion('system')
    expect(document.documentElement.hasAttribute('data-motion')).toBe(false)
  })
})

describe('settingsStore.motion', () => {
  test('defaults to system', () => {
    expect(useSettingsStore.getState().motion).toBe('system')
  })

  test('setMotion updates state and stamps the attribute', () => {
    useSettingsStore.getState().setMotion('reduced')
    expect(useSettingsStore.getState().motion).toBe('reduced')
    expect(document.documentElement.getAttribute('data-motion')).toBe('reduced')
  })
})

describe('useReducedMotion', () => {
  test('reduced setting forces true', () => {
    act(() => { useSettingsStore.getState().setMotion('reduced') })
    const { result } = renderHook(() => useReducedMotion())
    expect(result.current).toBe(true)
  })

  test('full setting forces false', () => {
    act(() => { useSettingsStore.getState().setMotion('full') })
    const { result } = renderHook(() => useReducedMotion())
    expect(result.current).toBe(false)
  })

  test('system falls back to the media query (mocked to false in setup)', () => {
    const { result } = renderHook(() => useReducedMotion())
    expect(result.current).toBe(false)
  })
})
