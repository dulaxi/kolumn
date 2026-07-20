import { useState } from 'react'

// Build the assignee edit-state (an array of { name, id } refs) from a card.
// Members carry their user id; free-text / legacy names carry id: null.
// Prefers the canonical assignee_refs, falling back to the legacy name mirror.
export function cardAssigneeRefs(card) {
  if (card?.assignee_refs?.length) {
    return card.assignee_refs.map((r) => ({ name: r.name, id: r.id || null }))
  }
  if (card?.assignees?.length) return card.assignees.map((n) => ({ name: n, id: null }))
  return card?.assignee_name ? [{ name: card.assignee_name, id: null }] : []
}

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
  // assignees is an array of { name, id } refs (id set = a real member, id null
  // = free-text). The picker captures the member id at pick time.
  const [assignees, setAssignees] = useState(() => cardAssigneeRefs(card))
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
