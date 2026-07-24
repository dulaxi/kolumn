// Activity feed vocabulary. Groups drive the modal's filter chips; every
// action logActivity can write MUST appear in exactly one group (the
// constants test enforces this).
export const PAGE_SIZE = 200

export const ACTIVITY_GROUPS = [
  { key: 'created', label: 'Created', actions: ['created', 'duplicated'] },
  { key: 'moved', label: 'Moved', actions: ['moved'] },
  { key: 'edited', label: 'Edited', actions: ['renamed', 'updated_priority', 'updated_assignee', 'updated_due_date', 'icon_changed', 'description_edited', 'checklist_added'] },
  { key: 'completed', label: 'Completed', actions: ['completed', 'reopened', 'checklist_completed'] },
  { key: 'deleted', label: 'Deleted', actions: ['deleted', 'archived', 'unarchived'] },
  { key: 'labels', label: 'Labels', actions: ['label_added', 'label_removed'] },
  { key: 'files', label: 'Files', actions: ['attached'] },
]

export const VERB_PHRASES = {
  created: 'created',
  duplicated: 'duplicated',
  moved: 'moved',
  renamed: 'renamed',
  updated_priority: 'set priority on',
  updated_assignee: 'assigned',
  updated_due_date: 'set deadline on',
  icon_changed: 'changed icon of',
  description_edited: 'edited description of',
  checklist_added: 'added checklist item to',
  completed: 'completed',
  reopened: 'reopened',
  checklist_completed: 'checked off item on',
  deleted: 'deleted',
  archived: 'archived',
  unarchived: 'restored',
  label_added: 'labeled',
  label_removed: 'unlabeled',
  attached: 'attached file to',
}
