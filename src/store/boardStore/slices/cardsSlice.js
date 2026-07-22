import { capture } from '../../../lib/analytics'
import { format } from 'date-fns'
import { showToast } from '../../../utils/toast'
import { supabase } from '../../../lib/supabase'
import { useAuthStore } from '../../authStore'
import { useNotificationStore } from '../../notificationStore'
import { addRecurrenceInterval } from '../../../utils/dateUtils'
import { createRateLimiter, sanitizeTitle, sanitizeDescription } from '../../../utils/rateLimit'
import { logError } from '../../../utils/logger'
import { cardInsertSchema } from '../../../utils/schemas'
import { _inFlightCards, pruneTempIdMap, undoableDelete, logActivity } from '../helpers'
import { buildLastMove } from '../../../lib/moveGhosts'

const cardCreateLimiter = createRateLimiter(10, 10000)   // 10 cards per 10s

export const createCardsSlice = (set, get) => ({
  cards: {},
  _isDragging: false,
  _tempIdMap: {},
  _completingCards: new Set(),

  // ============================================================
  // CARD ACTIONS
  // ============================================================
  addCard: async (boardId, columnId, cardData) => {
    if (!cardCreateLimiter()) { showToast.warn('Too many tasks created — slow down'); return null }
    const state = get()
    const board = state.boards[boardId]
    if (!board) {
      logError('addCard: board not found', boardId)
      return null
    }

    // Calculate positions
    const columnCards = Object.values(state.cards)
      .filter((c) => c.column_id === columnId)
    const position = columnCards.length

    // Optimistic local task numbers (best-guess, server reconciles)
    const localGlobalNumber = Object.values(state.cards).reduce((max, c) => Math.max(max, c.global_task_number || 0), 0) + 1
    const localTaskNumber = board.next_task_number || 1

    // Build optimistic card with temp ID
    const tempId = `temp-${crypto.randomUUID()}`
    const now = new Date().toISOString()
    const optimisticCard = {
      id: tempId,
      board_id: boardId,
      column_id: columnId,
      position,
      task_number: localTaskNumber,
      global_task_number: localGlobalNumber,
      title: sanitizeTitle(cardData.title) || 'Untitled task',
      description: sanitizeDescription(cardData.description) || '',
      assignees: (cardData.assignees || (cardData.assignee ? [cardData.assignee] : []))
        .map((n) => sanitizeTitle(n))
        .filter(Boolean),
      assignee_name: sanitizeTitle((cardData.assignees && cardData.assignees[0]) || cardData.assignee) || '',
      assignee_refs: [],
      due_date: cardData.dueDate || null,
      priority: cardData.priority || 'medium',
      icon: cardData.icon || null,
      completed: cardData.completed || false,
      checklist: cardData.checklist || [],
      created_at: now,
      updated_at: now,
      archived: false,
      _optimistic: true,
    }

    // Show card instantly
    set((s) => ({
      cards: { ...s.cards, [tempId]: optimisticCard },
      boards: { ...s.boards, [boardId]: { ...s.boards[boardId], next_task_number: localTaskNumber + 1 } },
    }))

    // Persist in background
    ;(async () => {
      try {
        // global_task_number is assigned authoritatively by a DB BEFORE-INSERT
        // trigger (atomic sequence) — the value we send is just an optimistic
        // placeholder the insert's returned row corrects on swap.
        const globalNumber = localGlobalNumber

        let taskNumber = localTaskNumber
        const { data: atomicNum, error: rpcError } = await supabase.rpc('next_task_number', { target_board_id: boardId })
        if (!rpcError && atomicNum != null) {
          taskNumber = atomicNum
        }

        const rawInsert = {
          board_id: boardId,
          column_id: columnId,
          position,
          task_number: taskNumber,
          global_task_number: globalNumber,
          title: optimisticCard.title,
          description: optimisticCard.description,
          assignee_name: optimisticCard.assignee_name,
          assignees: optimisticCard.assignees,
          due_date: optimisticCard.due_date,
          priority: optimisticCard.priority,
          icon: optimisticCard.icon,
          completed: optimisticCard.completed,
          checklist: optimisticCard.checklist,
        }

        const validated = cardInsertSchema.safeParse(rawInsert)
        if (!validated.success) {
          logError('Card validation failed:', validated.error.flatten())
          showToast.error('Invalid task data')
          set((s) => { const { [tempId]: _, ...rest } = s.cards; return { cards: rest } })
          return
        }

        const cardRes = await supabase.from('cards').insert(validated.data).select().single()
        if (cardRes.error || !cardRes.data) {
          logError('Failed to create card:', cardRes.error)
          showToast.error('Failed to create task')
          set((s) => { const { [tempId]: _, ...rest } = s.cards; return { cards: rest } })
          return
        }

        const realCard = cardRes.data
        capture('card_created', { board_id: boardId })

        // Swap temp card with real card; also apply any edits user made to the temp card
        set((s) => {
          const tempCurrent = s.cards[tempId]
          const merged = { ...realCard }
          // Preserve user edits made while insert was in flight
          if (tempCurrent && tempCurrent.updated_at !== optimisticCard.updated_at) {
            if (tempCurrent.title !== optimisticCard.title) merged.title = tempCurrent.title
            if (tempCurrent.description !== optimisticCard.description) merged.description = tempCurrent.description
            if (tempCurrent.assignee_name !== optimisticCard.assignee_name) merged.assignee_name = tempCurrent.assignee_name
            if (JSON.stringify(tempCurrent.assignees) !== JSON.stringify(optimisticCard.assignees)) merged.assignees = tempCurrent.assignees
            if (JSON.stringify(tempCurrent.assignee_refs || []) !== JSON.stringify(optimisticCard.assignee_refs || [])) merged.assignee_refs = tempCurrent.assignee_refs
            if (tempCurrent.priority !== optimisticCard.priority) merged.priority = tempCurrent.priority
            if (tempCurrent.due_date !== optimisticCard.due_date) merged.due_date = tempCurrent.due_date
            if (JSON.stringify(tempCurrent.checklist) !== JSON.stringify(optimisticCard.checklist)) merged.checklist = tempCurrent.checklist
          }
          const { [tempId]: _, ...restCards } = s.cards
          return {
            cards: { ...restCards, [realCard.id]: merged },
            boards: { ...s.boards, [boardId]: { ...s.boards[boardId], next_task_number: taskNumber + 1 } },
            _tempIdMap: pruneTempIdMap({ ...(s._tempIdMap || {}), [tempId]: realCard.id }),
          }
        })

        logActivity(realCard.id, 'created', null)
      } catch (err) {
        logError('addCard background persist failed:', err)
        showToast.error('Failed to create task')
        set((s) => { const { [tempId]: _, ...rest } = s.cards; return { cards: rest } })
      }
    })()

    return tempId
  },

  duplicateCard: async (cardId) => {
    const card = get().cards[cardId]
    if (!card) return null

    // Duplicate uses the source title verbatim — no "(copy)" suffix. The
    // user can rename via update_card if they want. Identical titles will
    // trigger the executor's ambiguity error on the next title-based
    // operation, which is an acceptable trade for clean titles by default.
    return get().addCard(card.board_id, card.column_id, {
      title: card.title,
      description: card.description || '',
      // Copy BOTH the modern multi-assignee array AND the legacy single name.
      // Without copying `assignees`, multi-assignee data is silently lost on
      // duplicate. addCard accepts either; passing both keeps it consistent
      // with how the source card looks.
      assignees: card.assignees && card.assignees.length ? [...card.assignees] : undefined,
      assignee: card.assignee_name || '',
      dueDate: card.due_date || null,
      priority: card.priority || 'medium',
      icon: card.icon || null,
      completed: false,
      checklist: card.checklist ? card.checklist.map((item) => ({ text: item.text, done: false })) : [],
    })
  },

  updateCard: async (cardId, updates) => {
    // Map frontend field names to DB column names
    const dbUpdates = {}
    if ('title' in updates) dbUpdates.title = sanitizeTitle(updates.title) || 'Untitled task'
    if ('description' in updates) dbUpdates.description = sanitizeDescription(updates.description)
    // Assignee writes take one of two paths:
    //  - assigneeRefs (from the picker): [{name,id}] — member assignments carry
    //    their user id, free-text is id null. Written to assignee_refs directly;
    //    the sync trigger derives the assignees/assignee_name name mirror.
    //  - assignee / assignee_name / assignees (AI, legacy, duplicate): names
    //    only — the trigger resolves them to member ids on write. (Writing
    //    assignee_name alone is reverted by the trigger, so singular inputs go
    //    through the array too.)
    if ('assigneeRefs' in updates) {
      const refs = (updates.assigneeRefs || [])
        .map((r) => ({ name: sanitizeTitle(r?.name), id: r?.id || null }))
        .filter((r) => r.name)
      dbUpdates.assignee_refs = refs
      dbUpdates.assignees = refs.map((r) => r.name)
      dbUpdates.assignee_name = refs[0]?.name || ''
    } else {
      let assigneesInput
      if ('assignees' in updates) assigneesInput = updates.assignees || []
      else if ('assignee' in updates) assigneesInput = updates.assignee ? [updates.assignee] : []
      else if ('assignee_name' in updates) assigneesInput = updates.assignee_name ? [updates.assignee_name] : []
      if (assigneesInput !== undefined) {
        const cleaned = assigneesInput.map((n) => sanitizeTitle(n)).filter(Boolean)
        dbUpdates.assignees = cleaned
        // Mirror first entry into assignee_name so optimistic local reads + the
        // assignment-notification diff below stay correct pre-echo.
        dbUpdates.assignee_name = cleaned[0] || ''
      }
    }
    if ('priority' in updates) dbUpdates.priority = updates.priority
    if ('dueDate' in updates) dbUpdates.due_date = updates.dueDate
    if ('due_date' in updates) dbUpdates.due_date = updates.due_date
    if ('checklist' in updates) dbUpdates.checklist = updates.checklist
    if ('icon' in updates) dbUpdates.icon = updates.icon
    if ('completed' in updates) dbUpdates.completed = updates.completed
    if ('column_id' in updates) dbUpdates.column_id = updates.column_id
    if ('position' in updates) dbUpdates.position = updates.position
    if ('recurrence_interval' in updates) dbUpdates.recurrence_interval = updates.recurrence_interval
    if ('recurrence_unit' in updates) dbUpdates.recurrence_unit = updates.recurrence_unit
    if ('recurrence_next_due' in updates) dbUpdates.recurrence_next_due = updates.recurrence_next_due

    // Optimistic update
    const prevCard = get().cards[cardId]
    set((state) => ({
      cards: {
        ...state.cards,
        [cardId]: { ...state.cards[cardId], ...dbUpdates, updated_at: new Date().toISOString() },
      },
    }))

    // Temp cards haven't been persisted yet — edits will be merged on swap
    if (typeof cardId === 'string' && cardId.startsWith('temp-')) return

    // Mark in-flight so a realtime echo can't clobber this (or a newer) edit
    _inFlightCards.add(cardId)
    const { error } = await supabase.from('cards').update(dbUpdates).eq('id', cardId)
    _inFlightCards.delete(cardId)
    if (error) {
      logError('Failed to update card:', error)
      // Rollback optimistic update
      if (prevCard) {
        set((state) => ({
          cards: { ...state.cards, [cardId]: prevCard },
        }))
      }
      showToast.error('Failed to save changes')
    } else if (prevCard) {
      // Log meaningful field changes (skip position-only updates)
      if ('priority' in dbUpdates && dbUpdates.priority !== prevCard.priority) {
        logActivity(cardId, 'updated_priority', `${prevCard.priority} → ${dbUpdates.priority}`)
      }
      if ('assignee_name' in dbUpdates && dbUpdates.assignee_name !== prevCard.assignee_name) {
        const from = prevCard.assignee_name || 'unassigned'
        const to = dbUpdates.assignee_name || 'unassigned'
        logActivity(cardId, 'updated_assignee', `${from} → ${to}`)

        // Notify the newly assigned user
        if (dbUpdates.assignee_name) {
          const { data: assigneeProfile } = await supabase
            .from('board_members')
            .select('user_id, profiles(id, display_name)')
            .eq('board_id', prevCard.board_id)
            .then(({ data }) => {
              const match = (data || []).find((m) => m.profiles?.display_name === dbUpdates.assignee_name)
              return { data: match?.profiles || null }
            })
          if (assigneeProfile) {
            const actorProfile = useAuthStore.getState().profile
            useNotificationStore.getState().notify({
              userId: assigneeProfile.id,
              type: 'assignment',
              title: 'assigned you a task',
              body: dbUpdates.title || prevCard.title,
              cardId,
              boardId: prevCard.board_id,
              actorName: actorProfile?.display_name || 'Someone',
            })
          }
        }
      }
      if ('due_date' in dbUpdates && dbUpdates.due_date !== prevCard.due_date) {
        logActivity(cardId, 'updated_due_date', dbUpdates.due_date ? dbUpdates.due_date.split('T')[0] : 'removed')
      }
      if ('title' in dbUpdates && dbUpdates.title !== prevCard.title) {
        logActivity(cardId, 'renamed', `${prevCard.title} → ${dbUpdates.title}`)
      }
    }
  },

  completeCard: async (cardId) => {
    // Prevent rapid double-clicks from toggling multiple times
    if (get()._completingCards.has(cardId)) return
    set((state) => ({ _completingCards: new Set([...state._completingCards, cardId]) }))

    const card = get().cards[cardId]
    if (!card) {
      set((state) => {
        const next = new Set(state._completingCards)
        next.delete(cardId)
        return { _completingCards: next }
      })
      return
    }

    const newCompleted = !card.completed

    set((state) => ({
      cards: {
        ...state.cards,
        [cardId]: { ...state.cards[cardId], completed: newCompleted, updated_at: new Date().toISOString() },
      },
    }))

    try {
      const { error } = await supabase.from('cards').update({ completed: newCompleted }).eq('id', cardId)
      if (error) {
        logError('Failed to toggle card completion:', error)
        set((state) => ({
          cards: { ...state.cards, [cardId]: card },
        }))
        showToast.error('Failed to update task')
        return
      }
      logActivity(cardId, newCompleted ? 'completed' : 'reopened', null)
    } finally {
      set((state) => {
        const next = new Set(state._completingCards)
        next.delete(cardId)
        return { _completingCards: next }
      })
    }
  },

  deleteCard: async (cardId) => {
    const prevCard = get().cards[cardId]
    if (!prevCard) return

    // Optimistic remove from UI
    set((state) => {
      const { [cardId]: _, ...restCards } = state.cards
      return { cards: restCards }
    })

    const shouldDelete = await undoableDelete('Task deleted — undo?')

    if (shouldDelete) {
      // Clean up storage files BEFORE cascade deletes card_attachments rows
      const { data: attachments } = await supabase
        .from('card_attachments')
        .select('storage_path')
        .eq('card_id', cardId)
      if (attachments?.length) {
        const paths = attachments.map((a) => a.storage_path)
        supabase.storage.from('attachments').remove(paths).catch(() => {})
      }

      const { error } = await supabase.from('cards').delete().eq('id', cardId)
      if (error) {
        set((state) => ({ cards: { ...state.cards, [cardId]: prevCard } }))
        showToast.error('Failed to delete task')
      }
    } else {
      // Verify card still exists in DB before restoring (prevents ghost cards after concurrent remote delete)
      const { data: exists } = await supabase.from('cards').select('id').eq('id', cardId).maybeSingle()
      if (exists) {
        set((state) => ({ cards: { ...state.cards, [cardId]: prevCard } }))
        showToast.restore('Task restored')
      } else {
        showToast.warn('Task was already deleted')
      }
    }
  },

  archiveCard: async (cardId) => {
    const card = get().cards[cardId]
    if (!card) return

    // Optimistic — mark archived
    set((state) => ({
      cards: { ...state.cards, [cardId]: { ...state.cards[cardId], archived: true } },
    }))

    const { error } = await supabase.from('cards').update({ archived: true }).eq('id', cardId)
    if (error) {
      logError('Failed to archive card:', error)
      set((state) => ({
        cards: { ...state.cards, [cardId]: { ...state.cards[cardId], archived: false } },
      }))
      showToast.error('Failed to archive task')
    } else {
      logActivity(cardId, 'archived', null)
      showToast.archive('Task archived')
    }
  },

  unarchiveCard: async (cardId) => {
    const card = get().cards[cardId]
    if (!card) return

    set((state) => ({
      cards: { ...state.cards, [cardId]: { ...state.cards[cardId], archived: false } },
    }))

    const { error } = await supabase.from('cards').update({ archived: false }).eq('id', cardId)
    if (error) {
      logError('Failed to unarchive card:', error)
      set((state) => ({
        cards: { ...state.cards, [cardId]: { ...state.cards[cardId], archived: true } },
      }))
      showToast.error('Failed to restore task')
    } else {
      logActivity(cardId, 'unarchived', null)
      showToast.restore('Task restored from archive')
    }
  },

  // ============================================================
  // DRAG HELPERS (local state only, no DB calls)
  // ============================================================
  setDragging: (isDragging) => set({ _isDragging: isDragging }),

  moveCardLocal: (boardId, fromColumnId, toColumnId, fromIndex, toIndex) => {
    const state = get()

    const fromCards = Object.values(state.cards)
      .filter((c) => c.column_id === fromColumnId)
      .sort((a, b) => a.position - b.position)

    const movedCard = fromCards[fromIndex]
    if (!movedCard) return

    if (fromColumnId === toColumnId) {
      const cards = [...fromCards]
      cards.splice(fromIndex, 1)
      cards.splice(toIndex, 0, movedCard)
      const updates = {}
      cards.forEach((card, i) => {
        if (card.position !== i) {
          updates[card.id] = { ...card, position: i }
        }
      })
      if (Object.keys(updates).length > 0) {
        set((s) => ({ cards: { ...s.cards, ...updates } }))
      }
    } else {
      const toCards = Object.values(state.cards)
        .filter((c) => c.column_id === toColumnId)
        .sort((a, b) => a.position - b.position)

      const newFromCards = fromCards.filter((c) => c.id !== movedCard.id)
      const newToCards = [...toCards]
      newToCards.splice(toIndex, 0, { ...movedCard, column_id: toColumnId })

      const updates = {}
      newFromCards.forEach((card, i) => {
        if (card.position !== i) {
          updates[card.id] = { ...card, position: i }
        }
      })
      newToCards.forEach((card, i) => {
        const isMovedCard = card.id === movedCard.id
        updates[card.id] = { ...card, column_id: toColumnId, position: i, ...(isMovedCard ? { completed: false } : {}) }
      })
      set((s) => ({ cards: { ...s.cards, ...updates } }))
    }
  },

  // Persist the current card positions to Supabase after drag ends
  persistCardPositions: async (cardIds, { movedCrossColumn = false } = {}) => {
    // Capture all positions upfront from a single state snapshot
    const state = get()
    const writes = cardIds
      .map((cardId) => {
        const card = state.cards[cardId]
        if (!card) return null
        return { id: cardId, column_id: card.column_id, position: card.position, completed: card.completed }
      })
      .filter(Boolean)

    // Parallel writes to minimize race window
    const results = await Promise.all(writes.map(({ id, ...rest }) =>
      supabase.from('cards').update(rest).eq('id', id)
        .then(({ error }) => {
          if (error) logError('Failed to persist card position:', error)
          return !error
        })
    ))
    const anyFailed = results.some((ok) => !ok)
    if (anyFailed) showToast.error('Some card moves failed to save — resyncing')

    // Refetch cards after cross-column moves to recover any realtime updates
    // that were silently dropped while _isDragging was true
    const boardId = state.activeBoardId
    if ((movedCrossColumn || anyFailed) && boardId && boardId !== '__all__') {
      const { data } = await supabase.from('cards').select('*').eq('board_id', boardId)
      if (data) {
        set((s) => {
          const cards = { ...s.cards }
          data.forEach((c) => { cards[c.id] = c })
          // Remove cards that no longer exist on this board
          Object.keys(cards).forEach((id) => {
            if (cards[id].board_id === boardId && !data.find((c) => c.id === id)) {
              delete cards[id]
            }
          })
          return { cards }
        })
      }
    }
  },

  logCardMove: (cardId, fromColumnId, toColumnId, fromPosition, toPosition) => {
    const state = get()
    const fromCol = state.columns[fromColumnId]
    const toCol = state.columns[toColumnId]
    const profile = useAuthStore.getState().profile

    const lastMove = buildLastMove(
      { columnId: fromColumnId, position: fromPosition },
      { columnId: toColumnId, position: toPosition },
      { id: profile?.id ?? null, name: profile?.display_name || 'Someone', color: profile?.color ?? null, at: new Date().toISOString() },
    )

    // Optimistic local update so the mover sees their own ghost immediately;
    // other clients receive it via the existing realtime cards subscription.
    set((s) => (s.cards[cardId]
      ? { cards: { ...s.cards, [cardId]: { ...s.cards[cardId], last_move: lastMove } } }
      : {}))

    // Fire-and-forget: persist to the card row (never blocks the drag).
    supabase.from('cards').update({ last_move: lastMove }).eq('id', cardId)
      .then(({ error }) => { if (error) logError('last_move write failed:', error) })

    // Append-only structured history (powers the future full-trail tier).
    logActivity(cardId, 'moved', `${fromCol?.title || 'Unknown'} → ${toCol?.title || 'Unknown'}`, {
      from_column_id: fromColumnId,
      from_position: fromPosition,
      to_column_id: toColumnId,
      to_position: toPosition,
    })
  },

  getAllCards: () => Object.values(get().cards),

  // ============================================================
  // RECURRING TASKS
  // ============================================================
  spawnRecurringTasks: async () => {
    const today = new Date().toISOString().split('T')[0]

    const { data: dueTasks, error } = await supabase
      .from('cards')
      .select('*')
      .eq('completed', true)
      .not('recurrence_next_due', 'is', null)
      .lte('recurrence_next_due', today)

    if (error || !dueTasks?.length) return

    for (const task of dueTasks) {
      const newDueDate = task.recurrence_next_due + 'T23:59:59'
      const nextDue = addRecurrenceInterval(
        new Date(task.recurrence_next_due),
        task.recurrence_interval,
        task.recurrence_unit
      )

      // Derive proper task numbers (same as addCard)
      const state = get()
      const board = state.boards[task.board_id]

      let globalNumber = Object.values(state.cards).reduce((max, c) => Math.max(max, c.global_task_number || 0), 0) + 1
      const { data: maxRow } = await supabase.from('cards').select('global_task_number').order('global_task_number', { ascending: false }).limit(1).single()
      if (maxRow?.global_task_number >= globalNumber) {
        globalNumber = maxRow.global_task_number + 1
      }

      let taskNumber = board?.next_task_number || 1
      const { data: atomicNum, error: rpcError } = await supabase.rpc('next_task_number', { target_board_id: task.board_id })
      if (!rpcError && atomicNum != null) {
        taskNumber = atomicNum
      }

      const newCard = {
        board_id: task.board_id,
        column_id: task.column_id,
        position: task.position,
        task_number: taskNumber,
        global_task_number: globalNumber,
        title: task.title,
        description: task.description || '',
        assignee_name: task.assignee_name || '',
        priority: task.priority || 'medium',
        due_date: newDueDate,
        icon: task.icon,
        completed: false,
        checklist: (task.checklist || []).map((item) => ({ ...item, done: false })),
        recurrence_interval: task.recurrence_interval,
        recurrence_unit: task.recurrence_unit,
        recurrence_next_due: format(nextDue, 'yyyy-MM-dd'),
      }

      const { data: created, error: insertError } = await supabase.from('cards').insert(newCard).select().single()
      if (insertError) {
        logError('Failed to spawn recurring task:', insertError)
        continue
      }

      // Only manually increment if the atomic RPC was not used
      if (rpcError && board) {
        await supabase.from('boards').update({ next_task_number: taskNumber + 1 }).eq('id', task.board_id)
      }

      if (created) {
        set((state) => ({
          cards: { ...state.cards, [created.id]: created },
        }))
      }

      // Clear recurrence on the completed original
      await supabase.from('cards').update({
        recurrence_interval: null,
        recurrence_unit: null,
        recurrence_next_due: null,
      }).eq('id', task.id)

      set((state) => ({
        cards: {
          ...state.cards,
          [task.id]: {
            ...state.cards[task.id],
            recurrence_interval: null,
            recurrence_unit: null,
            recurrence_next_due: null,
          },
        },
      }))
    }
  },
})
