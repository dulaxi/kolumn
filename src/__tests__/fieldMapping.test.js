import { describe, test, expect } from 'vitest'
import { mapCardUpdates } from '../utils/fieldMapping'

describe('mapCardUpdates', () => {
  test('maps frontend "assignee" to DB "assignee_name"', () => {
    expect(mapCardUpdates({ assignee: 'Alice' })).toEqual({ assignee_name: 'Alice' })
  })

  test('maps frontend "dueDate" to DB "due_date"', () => {
    expect(mapCardUpdates({ dueDate: '2026-03-25' })).toEqual({ due_date: '2026-03-25' })
  })

  test('passes through DB column names unchanged', () => {
    expect(mapCardUpdates({ assignee_name: 'Bob', due_date: '2026-03-25' }))
      .toEqual({ assignee_name: 'Bob', due_date: '2026-03-25' })
  })

  test('maps multiple fields at once', () => {
    const result = mapCardUpdates({
      title: 'New Title',
      assignee: 'Alice',
      priority: 'high',
      labels: [{ text: 'bug', color: 'red' }],
    })
    expect(result).toEqual({
      title: 'New Title',
      assignee_name: 'Alice',
      priority: 'high',
      labels: [{ text: 'bug', color: 'red' }],
    })
  })

  test('ignores unknown fields', () => {
    expect(mapCardUpdates({ unknownField: 'value' })).toEqual({})
  })

  test('maps recurrence fields', () => {
    expect(mapCardUpdates({
      recurrence_interval: 7,
      recurrence_unit: 'days',
      recurrence_next_due: '2026-04-01',
    })).toEqual({
      recurrence_interval: 7,
      recurrence_unit: 'days',
      recurrence_next_due: '2026-04-01',
    })
  })
})
