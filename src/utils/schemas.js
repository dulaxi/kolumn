import { z } from 'zod'

// Reusable field transformers
const trimmedString = (maxLength) =>
  z.string().transform((s) => s.trim().slice(0, maxLength))

const requiredTrimmedString = (maxLength) =>
  trimmedString(maxLength).pipe(z.string().min(1))

// ─────────────────────────────────────────────
// Card schemas
// ─────────────────────────────────────────────
export const cardInsertSchema = z.object({
  board_id: z.string().min(1),
  column_id: z.string().min(1),
  position: z.number().int().min(0),
  task_number: z.number().int().min(1),
  global_task_number: z.number().int().min(1),
  title: requiredTrimmedString(200),
  description: trimmedString(5000).default(''),
  assignee_name: trimmedString(200).default(''),
  labels: z.array(z.string()).default([]),
  due_date: z.string().nullable().default(null),
  priority: z.enum(['low', 'medium', 'high']).default('medium'),
  icon: z.string().nullable().default(null),
  completed: z.boolean().default(false),
  checklist: z.array(z.object({
    text: z.string(),
    done: z.boolean(),
  })).default([]),
})

export const cardUpdateSchema = z.object({
  title: requiredTrimmedString(200).optional(),
  description: trimmedString(5000).optional(),
  assignee_name: z.string().nullable().optional(),
  labels: z.array(z.string()).optional(),
  due_date: z.string().nullable().optional(),
  priority: z.enum(['low', 'medium', 'high']).optional(),
  icon: z.string().nullable().optional(),
  completed: z.boolean().optional(),
  column_id: z.string().optional(),
  position: z.number().int().optional(),
  checklist: z.array(z.object({
    text: z.string(),
    done: z.boolean(),
  })).optional(),
  recurrence_interval: z.number().int().nullable().optional(),
  recurrence_unit: z.string().nullable().optional(),
  recurrence_next_due: z.string().nullable().optional(),
}).strict()

// ─────────────────────────────────────────────
// Board schemas
// ─────────────────────────────────────────────
export const boardInsertSchema = z.object({
  id: z.string().min(1),
  name: requiredTrimmedString(200),
  owner_id: z.string().min(1),
  icon: z.string().nullable().default(null),
})

// ─────────────────────────────────────────────
// Column schemas
// ─────────────────────────────────────────────
export const columnInsertSchema = z.object({
  board_id: z.string().min(1),
  title: requiredTrimmedString(200),
  position: z.number().int().min(0),
})

// ─────────────────────────────────────────────
// Comment schemas
// ─────────────────────────────────────────────
export const commentInsertSchema = z.object({
  card_id: z.string().min(1),
  user_id: z.string().min(1),
  author_name: z.string().min(1),
  text: requiredTrimmedString(2000),
})

// ─────────────────────────────────────────────
// Note schemas
// ─────────────────────────────────────────────
const noteTitle = trimmedString(200).transform((s) => s || 'Untitled')

export const noteInsertSchema = z.object({
  user_id: z.string().min(1),
  title: noteTitle,
  content: z.string().default(''),
})

export const noteUpdateSchema = z.object({
  title: trimmedString(200).optional(),
  content: z.string().optional(),
}).strict()
