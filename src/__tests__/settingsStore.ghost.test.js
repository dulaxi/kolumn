import { describe, test, expect, beforeEach } from 'vitest'
import { useSettingsStore } from '../store/settingsStore'

describe('settingsStore ghost mode', () => {
  beforeEach(() => useSettingsStore.setState({ ghostBoards: {} }))

  test('defaults to disarmed', () => {
    expect(useSettingsStore.getState().isGhostArmed('b1')).toBe(false)
  })

  test('toggle arms then disarms a single board', () => {
    useSettingsStore.getState().toggleGhostMode('b1')
    expect(useSettingsStore.getState().isGhostArmed('b1')).toBe(true)
    useSettingsStore.getState().toggleGhostMode('b1')
    expect(useSettingsStore.getState().isGhostArmed('b1')).toBe(false)
  })

  test('armed state is independent per board', () => {
    useSettingsStore.getState().toggleGhostMode('b1')
    expect(useSettingsStore.getState().isGhostArmed('b1')).toBe(true)
    expect(useSettingsStore.getState().isGhostArmed('b2')).toBe(false)
  })
})
