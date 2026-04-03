import { describe, test, expect } from 'vitest'

import {
  LABEL_COLORS,
  COLOR_DOT_CLASSES,
  PRIORITY_OPTIONS,
  PROFILE_COLORS,
  SEGMENT_COLORS,
  DOT_COLORS,
  EVENT_ACCENT,
} from '../constants/colors'

// ─────────────────────────────────────────────
// LABEL_COLORS
// ─────────────────────────────────────────────
describe('LABEL_COLORS', () => {
  test('contains exactly 7 label color names', () => {
    expect(LABEL_COLORS).toHaveLength(7)
  })

  test('contains the expected color names', () => {
    expect(LABEL_COLORS).toEqual(['red', 'blue', 'green', 'yellow', 'purple', 'pink', 'gray'])
  })
})

// ─────────────────────────────────────────────
// COLOR_DOT_CLASSES
// ─────────────────────────────────────────────
describe('COLOR_DOT_CLASSES', () => {
  test('has a Tailwind class for every label color', () => {
    for (const color of LABEL_COLORS) {
      expect(COLOR_DOT_CLASSES).toHaveProperty(color)
      expect(COLOR_DOT_CLASSES[color]).toMatch(/^bg-\[#[A-Fa-f0-9]{6}\]$/)
    }
  })

  test('has no extra keys beyond label colors', () => {
    expect(Object.keys(COLOR_DOT_CLASSES).sort()).toEqual([...LABEL_COLORS].sort())
  })
})

// ─────────────────────────────────────────────
// PRIORITY_OPTIONS
// ─────────────────────────────────────────────
describe('PRIORITY_OPTIONS', () => {
  test('has 3 priority levels', () => {
    expect(PRIORITY_OPTIONS).toHaveLength(3)
  })

  test('each option has value, label, and dot keys', () => {
    for (const opt of PRIORITY_OPTIONS) {
      expect(opt).toHaveProperty('value')
      expect(opt).toHaveProperty('label')
      expect(opt).toHaveProperty('dot')
    }
  })

  test('contains low, medium, high in order', () => {
    expect(PRIORITY_OPTIONS.map((o) => o.value)).toEqual(['low', 'medium', 'high'])
  })
})

// ─────────────────────────────────────────────
// PROFILE_COLORS
// ─────────────────────────────────────────────
describe('PROFILE_COLORS', () => {
  test('has at least 6 profile colors', () => {
    expect(PROFILE_COLORS.length).toBeGreaterThanOrEqual(6)
  })

  test('each entry has value (Tailwind class) and hex', () => {
    for (const c of PROFILE_COLORS) {
      expect(c).toHaveProperty('value')
      expect(c).toHaveProperty('hex')
      expect(c.value).toMatch(/^bg-\[#[A-Fa-f0-9]{6}\]$/)
      expect(c.hex).toMatch(/^#[A-Fa-f0-9]{6}$/)
    }
  })
})

// ─────────────────────────────────────────────
// SEGMENT_COLORS
// ─────────────────────────────────────────────
describe('SEGMENT_COLORS', () => {
  test('is a non-empty array of hex strings', () => {
    expect(SEGMENT_COLORS.length).toBeGreaterThan(0)
    for (const hex of SEGMENT_COLORS) {
      expect(hex).toMatch(/^#[A-Fa-f0-9]{6}$/)
    }
  })
})

// ─────────────────────────────────────────────
// DOT_COLORS & EVENT_ACCENT (calendar)
// ─────────────────────────────────────────────
describe('DOT_COLORS', () => {
  test('has entries for low, medium, high', () => {
    expect(DOT_COLORS).toHaveProperty('low')
    expect(DOT_COLORS).toHaveProperty('medium')
    expect(DOT_COLORS).toHaveProperty('high')
  })
})

describe('EVENT_ACCENT', () => {
  test('has border-l classes for low, medium, high', () => {
    for (const key of ['low', 'medium', 'high']) {
      expect(EVENT_ACCENT[key]).toMatch(/^border-l-\[#[A-Fa-f0-9]{6}\]$/)
    }
  })
})
