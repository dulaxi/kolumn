import { describe, test, expect } from 'vitest'

// The module we'll create — doesn't exist yet, so tests will fail
import {
  cardInsertSchema,
  cardUpdateSchema,
  boardInsertSchema,
  columnInsertSchema,
  commentInsertSchema,
  noteInsertSchema,
  noteUpdateSchema,
} from '../utils/schemas'

// ─────────────────────────────────────────────
// Card Insert Schema
// ─────────────────────────────────────────────
describe('cardInsertSchema', () => {
  test('validates a minimal valid card', () => {
    const input = {
      board_id: 'abc-123',
      column_id: 'col-456',
      position: 0,
      task_number: 1,
      global_task_number: 1,
      title: 'My task',
    }
    const result = cardInsertSchema.safeParse(input)
    expect(result.success).toBe(true)
    expect(result.data.title).toBe('My task')
    expect(result.data.priority).toBe('medium') // default
    expect(result.data.completed).toBe(false) // default
    expect(result.data.labels).toEqual([]) // default
  })

  test('validates a full card with all optional fields', () => {
    const input = {
      board_id: 'abc-123',
      column_id: 'col-456',
      position: 2,
      task_number: 5,
      global_task_number: 42,
      title: 'Full task',
      description: 'A description',
      assignee_name: 'Alice',
      labels: [{ text: 'bug', color: '#CF222E' }, { text: 'urgent', color: '#9A6700' }],
      due_date: '2026-04-10',
      priority: 'high',
      icon: 'AlertCircle',
      completed: true,
      checklist: [{ text: 'Step 1', done: false }],
    }
    const result = cardInsertSchema.safeParse(input)
    expect(result.success).toBe(true)
    expect(result.data.priority).toBe('high')
    expect(result.data.checklist).toHaveLength(1)
  })

  test('accepts object labels with text and color (C1 bug)', () => {
    const input = {
      board_id: 'abc-123',
      column_id: 'col-456',
      position: 0,
      task_number: 1,
      global_task_number: 1,
      title: 'Labeled task',
      labels: [
        { text: 'bug', color: '#CF222E' },
        { text: 'feature', color: '#3094FF' },
      ],
    }
    const result = cardInsertSchema.safeParse(input)
    expect(result.success).toBe(true)
    expect(result.data.labels).toEqual([
      { text: 'bug', color: '#CF222E' },
      { text: 'feature', color: '#3094FF' },
    ])
  })

  test('rejects missing required fields', () => {
    const result = cardInsertSchema.safeParse({ title: 'No IDs' })
    expect(result.success).toBe(false)
  })

  test('rejects invalid priority value', () => {
    const input = {
      board_id: 'abc',
      column_id: 'col',
      position: 0,
      task_number: 1,
      global_task_number: 1,
      title: 'Bad priority',
      priority: 'critical', // not a valid enum
    }
    const result = cardInsertSchema.safeParse(input)
    expect(result.success).toBe(false)
  })

  test('rejects empty title', () => {
    const input = {
      board_id: 'abc',
      column_id: 'col',
      position: 0,
      task_number: 1,
      global_task_number: 1,
      title: '',
    }
    const result = cardInsertSchema.safeParse(input)
    expect(result.success).toBe(false)
  })

  test('rejects negative position', () => {
    const input = {
      board_id: 'abc',
      column_id: 'col',
      position: -1,
      task_number: 1,
      global_task_number: 1,
      title: 'Neg pos',
    }
    const result = cardInsertSchema.safeParse(input)
    expect(result.success).toBe(false)
  })

  test('trims title whitespace', () => {
    const input = {
      board_id: 'abc',
      column_id: 'col',
      position: 0,
      task_number: 1,
      global_task_number: 1,
      title: '  padded  ',
    }
    const result = cardInsertSchema.safeParse(input)
    expect(result.success).toBe(true)
    expect(result.data.title).toBe('padded')
  })

  test('truncates title exceeding 200 chars', () => {
    const input = {
      board_id: 'abc',
      column_id: 'col',
      position: 0,
      task_number: 1,
      global_task_number: 1,
      title: 'x'.repeat(250),
    }
    const result = cardInsertSchema.safeParse(input)
    expect(result.success).toBe(true)
    expect(result.data.title.length).toBeLessThanOrEqual(200)
  })
})

// ─────────────────────────────────────────────
// Card Update Schema (partial — all fields optional)
// ─────────────────────────────────────────────
describe('cardUpdateSchema', () => {
  test('validates partial update with single field', () => {
    const result = cardUpdateSchema.safeParse({ title: 'New title' })
    expect(result.success).toBe(true)
  })

  test('validates empty update (no fields)', () => {
    const result = cardUpdateSchema.safeParse({})
    expect(result.success).toBe(true)
  })

  test('accepts object labels in update (C1 bug)', () => {
    const result = cardUpdateSchema.safeParse({
      labels: [{ text: 'urgent', color: '#CF222E' }],
    })
    expect(result.success).toBe(true)
    expect(result.data.labels[0]).toEqual({ text: 'urgent', color: '#CF222E' })
  })

  test('rejects invalid priority in update', () => {
    const result = cardUpdateSchema.safeParse({ priority: 'ultra' })
    expect(result.success).toBe(false)
  })

  test('accepts null due_date (clearing)', () => {
    const result = cardUpdateSchema.safeParse({ due_date: null })
    expect(result.success).toBe(true)
    expect(result.data.due_date).toBeNull()
  })

  test('accepts null assignee_name (unassigning)', () => {
    const result = cardUpdateSchema.safeParse({ assignee_name: null })
    expect(result.success).toBe(true)
  })
})

// ─────────────────────────────────────────────
// Board Insert Schema
// ─────────────────────────────────────────────
describe('boardInsertSchema', () => {
  test('validates a valid board', () => {
    const result = boardInsertSchema.safeParse({
      id: 'board-1',
      name: 'My Board',
      owner_id: 'user-1',
    })
    expect(result.success).toBe(true)
    expect(result.data.icon).toBeNull() // default
  })

  test('rejects missing name', () => {
    const result = boardInsertSchema.safeParse({
      id: 'board-1',
      owner_id: 'user-1',
    })
    expect(result.success).toBe(false)
  })

  test('rejects empty name', () => {
    const result = boardInsertSchema.safeParse({
      id: 'board-1',
      name: '',
      owner_id: 'user-1',
    })
    expect(result.success).toBe(false)
  })

  test('trims board name', () => {
    const result = boardInsertSchema.safeParse({
      id: 'board-1',
      name: '  Sprint 3  ',
      owner_id: 'user-1',
    })
    expect(result.success).toBe(true)
    expect(result.data.name).toBe('Sprint 3')
  })
})

// ─────────────────────────────────────────────
// Column Insert Schema
// ─────────────────────────────────────────────
describe('columnInsertSchema', () => {
  test('validates a valid column', () => {
    const result = columnInsertSchema.safeParse({
      board_id: 'board-1',
      title: 'To Do',
      position: 0,
    })
    expect(result.success).toBe(true)
  })

  test('rejects missing board_id', () => {
    const result = columnInsertSchema.safeParse({
      title: 'To Do',
      position: 0,
    })
    expect(result.success).toBe(false)
  })

  test('rejects negative position', () => {
    const result = columnInsertSchema.safeParse({
      board_id: 'board-1',
      title: 'Col',
      position: -1,
    })
    expect(result.success).toBe(false)
  })
})

// ─────────────────────────────────────────────
// Comment Insert Schema
// ─────────────────────────────────────────────
describe('commentInsertSchema', () => {
  test('validates a valid comment', () => {
    const result = commentInsertSchema.safeParse({
      card_id: 'card-1',
      user_id: 'user-1',
      author_name: 'Alice',
      text: 'Looks good!',
    })
    expect(result.success).toBe(true)
  })

  test('rejects empty text', () => {
    const result = commentInsertSchema.safeParse({
      card_id: 'card-1',
      user_id: 'user-1',
      author_name: 'Alice',
      text: '',
    })
    expect(result.success).toBe(false)
  })

  test('truncates text exceeding 2000 chars', () => {
    const result = commentInsertSchema.safeParse({
      card_id: 'card-1',
      user_id: 'user-1',
      author_name: 'Alice',
      text: 'x'.repeat(2500),
    })
    expect(result.success).toBe(true)
    expect(result.data.text.length).toBeLessThanOrEqual(2000)
  })
})

// ─────────────────────────────────────────────
// Note Schemas
// ─────────────────────────────────────────────
describe('noteInsertSchema', () => {
  test('validates a valid note', () => {
    const result = noteInsertSchema.safeParse({
      user_id: 'user-1',
      title: 'My Note',
      content: '',
    })
    expect(result.success).toBe(true)
  })

  test('defaults title to Untitled', () => {
    const result = noteInsertSchema.safeParse({
      user_id: 'user-1',
      title: '',
      content: '',
    })
    expect(result.success).toBe(true)
    expect(result.data.title).toBe('Untitled')
  })
})

describe('noteUpdateSchema', () => {
  test('validates partial note update', () => {
    const result = noteUpdateSchema.safeParse({ title: 'Renamed' })
    expect(result.success).toBe(true)
  })

  test('validates content-only update', () => {
    const result = noteUpdateSchema.safeParse({ content: '# Hello' })
    expect(result.success).toBe(true)
  })
})
