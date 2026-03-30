const PASSTHROUGH_FIELDS = [
  'title', 'description', 'priority', 'labels', 'checklist',
  'icon', 'completed', 'column_id', 'position',
  'recurrence_interval', 'recurrence_unit', 'recurrence_next_due',
]

export function mapCardUpdates(updates) {
  const dbUpdates = {}
  if ('assignee' in updates) dbUpdates.assignee_name = updates.assignee
  if ('assignee_name' in updates) dbUpdates.assignee_name = updates.assignee_name
  if ('dueDate' in updates) dbUpdates.due_date = updates.dueDate
  if ('due_date' in updates) dbUpdates.due_date = updates.due_date
  for (const field of PASSTHROUGH_FIELDS) {
    if (field in updates) dbUpdates[field] = updates[field]
  }
  return dbUpdates
}
