import { supabase } from './supabase'
import { useBoardStore } from '../store/boardStore'

// Instantiate a starter template (src/data/starterBoards.js) for a new
// user. Same RLS-aware insert pattern as seedOnboardingBoard.js: no
// .select() after insert (the boards SELECT policy snapshot predates the
// auto-add-owner trigger), client-owned UUIDs, store synced at the end.
export async function seedStarterBoard(userId, template) {
  const boardId = crypto.randomUUID()
  const board = {
    id: boardId,
    name: template.name,
    icon: template.icon || null,
    owner_id: userId,
    next_task_number: 1,
    created_at: new Date().toISOString(),
  }
  const { error: boardErr } = await supabase.from('boards').insert(board)
  if (boardErr) throw boardErr

  const columnInserts = template.columns.map((col, i) => ({
    id: crypto.randomUUID(),
    board_id: boardId,
    title: col.title,
    position: i,
  }))
  const { error: colErr } = await supabase.from('columns').insert(columnInserts)
  if (colErr) throw colErr

  let taskCounter = 1
  const cardInserts = []
  template.columns.forEach((colDef, colIdx) => {
    colDef.cards.forEach((cardDef, cardIdx) => {
      cardInserts.push({
        id: crypto.randomUUID(),
        board_id: boardId,
        column_id: columnInserts[colIdx].id,
        position: cardIdx,
        task_number: taskCounter,
        global_task_number: taskCounter, // ignored — DB trigger assigns atomically
        title: cardDef.title,
        description: cardDef.description || '',
        priority: cardDef.priority || 'medium',
        icon: cardDef.icon || null,
        completed: false,
        checklist: cardDef.checklist || [],
      })
      taskCounter++
    })
  })
  if (cardInserts.length > 0) {
    const { error: cardErr } = await supabase.from('cards').insert(cardInserts)
    if (cardErr) throw cardErr
  }

  await supabase.from('boards').update({ next_task_number: taskCounter }).eq('id', boardId)

  useBoardStore.setState((s) => ({
    boards: { ...s.boards, [boardId]: { ...board, next_task_number: taskCounter } },
    columns: { ...s.columns, ...Object.fromEntries(columnInserts.map((c) => [c.id, c])) },
    cards: { ...s.cards, ...Object.fromEntries(cardInserts.map((c) => [c.id, c])) },
  }))

  return boardId
}
