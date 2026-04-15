import { useState } from 'react'

export function useCardEditState(card, { treatUntitledAsEmpty = false } = {}) {
  const [title, setTitle] = useState(() => {
    const t = card?.title || ''
    return treatUntitledAsEmpty && t === 'Untitled task' ? '' : t
  })
  const [description, setDescription] = useState(() => card?.description || '')
  const [priority, setPriority] = useState(() => card?.priority || 'medium')
  const [dueDate, setDueDate] = useState(() => card?.due_date || '')
  const [labels, setLabels] = useState(() => (card?.labels ? card.labels.map((l) => ({ ...l })) : []))
  const [assignees, setAssignees] = useState(() => {
    if (card?.assignees?.length) return [...card.assignees]
    return card?.assignee_name ? [card.assignee_name] : []
  })
  const [checklist, setChecklist] = useState(() =>
    card?.checklist ? card.checklist.map((item) => ({ ...item })) : []
  )

  return {
    title, setTitle,
    description, setDescription,
    priority, setPriority,
    dueDate, setDueDate,
    labels, setLabels,
    assignees, setAssignees,
    checklist, setChecklist,
  }
}
