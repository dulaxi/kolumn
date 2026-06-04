import { useState } from 'react'

export function useCardEditState(card, { treatUntitledAsEmpty = false } = {}) {
  const [title, setTitle] = useState(() => {
    const t = card?.title || ''
    return treatUntitledAsEmpty && t === 'Untitled task' ? '' : t
  })
  const [description, setDescription] = useState(() => card?.description || '')
  const [priority, setPriority] = useState(() => card?.priority || 'medium')
  const [dueDate, setDueDate] = useState(() => card?.due_date || '')
  // pendingLabels: local-only list for new-card mode (flushed via addLabelToCard after persist).
  // For existing cards, labels come directly from selectCardLabels in the component.
  const [pendingLabels, setPendingLabels] = useState([])
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
    pendingLabels, setPendingLabels,
    assignees, setAssignees,
    checklist, setChecklist,
  }
}
