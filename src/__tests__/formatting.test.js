import { describe, test, expect, vi } from 'vitest'
import {
  getInitials,
  getAvatarColor,
  getGreeting,
  AVATAR_COLORS,
  LABEL_BG,
  PRIORITY_DOT,
} from '../utils/formatting'

// ─── getInitials ──────────────────────────────────────────────

describe('getInitials', () => {
  test('returns first letters of two words, uppercased', () => {
    expect(getInitials('John Doe')).toBe('JD')
  })

  test('returns single letter for single word', () => {
    expect(getInitials('Alice')).toBe('A')
  })

  test('truncates to 2 characters for 3+ words', () => {
    expect(getInitials('Mary Jane Watson')).toBe('MJ')
  })

  test('handles already-uppercase input', () => {
    expect(getInitials('BOB SMITH')).toBe('BS')
  })

  test('handles lowercase input', () => {
    expect(getInitials('jane doe')).toBe('JD')
  })
})

// ─── getAvatarColor ───────────────────────────────────────────

describe('getAvatarColor', () => {
  test('returns a color from AVATAR_COLORS', () => {
    const color = getAvatarColor('Alice')
    expect(AVATAR_COLORS).toContain(color)
  })

  test('returns same color for same name (deterministic)', () => {
    expect(getAvatarColor('Bob')).toBe(getAvatarColor('Bob'))
  })

  test('returns different colors for different names', () => {
    // Not guaranteed for all pairs, but these specific names should differ
    const colors = new Set(['Alice', 'Bob', 'Charlie', 'Diana', 'Eve'].map(getAvatarColor))
    expect(colors.size).toBeGreaterThan(1)
  })
})

// ─── getGreeting ──────────────────────────────────────────────

describe('getGreeting', () => {
  test('returns "Good morning" before noon', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 2, 25, 9, 0, 0))
    expect(getGreeting()).toBe('Good morning')
    vi.useRealTimers()
  })

  test('returns "Good afternoon" between noon and 5pm', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 2, 25, 14, 0, 0))
    expect(getGreeting()).toBe('Good afternoon')
    vi.useRealTimers()
  })

  test('returns "Good evening" after 5pm', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 2, 25, 20, 0, 0))
    expect(getGreeting()).toBe('Good evening')
    vi.useRealTimers()
  })

  test('noon exactly is afternoon', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 2, 25, 12, 0, 0))
    expect(getGreeting()).toBe('Good afternoon')
    vi.useRealTimers()
  })

  test('5pm exactly is evening', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 2, 25, 17, 0, 0))
    expect(getGreeting()).toBe('Good evening')
    vi.useRealTimers()
  })
})

// ─── Constants ────────────────────────────────────────────────

describe('LABEL_BG', () => {
  test('has all 7 label colors', () => {
    expect(Object.keys(LABEL_BG)).toEqual(
      expect.arrayContaining(['red', 'blue', 'green', 'yellow', 'purple', 'pink', 'gray'])
    )
  })

  test('each value contains bg and text classes', () => {
    for (const val of Object.values(LABEL_BG)) {
      expect(val).toMatch(/bg-\[/)
      expect(val).toMatch(/text-\[/)
    }
  })
})

describe('PRIORITY_DOT', () => {
  test('has low, medium, high', () => {
    expect(Object.keys(PRIORITY_DOT)).toEqual(
      expect.arrayContaining(['low', 'medium', 'high'])
    )
  })
})
