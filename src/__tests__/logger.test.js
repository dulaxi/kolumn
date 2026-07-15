import { describe, test, expect } from 'vitest'
import { formatLogArgs } from '../utils/logger'

describe('formatLogArgs', () => {
  test('stringifies error-like objects by message + code, not [object Object]', () => {
    const pg = { message: 'duplicate key value', code: '23505', details: 'Key exists' }
    const out = formatLogArgs(['Failed to rename label:', pg])
    expect(out).toBe('Failed to rename label: duplicate key value (23505)')
    expect(out).not.toContain('[object Object]')
  })

  test('plain strings pass through joined', () => {
    expect(formatLogArgs(['a', 'b'])).toBe('a b')
  })
})
