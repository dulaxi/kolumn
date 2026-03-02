import { supabase } from './supabase'

/**
 * Detects existing localStorage data and migrates it to Supabase
 * after a user's first login. Returns true if migration was performed.
 */
export async function migrateLocalData() {
  const boardsRaw = localStorage.getItem('gambit-boards')
  const notesRaw = localStorage.getItem('gambit-notes')

  if (!boardsRaw && !notesRaw) return false

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false

  let migrated = false

  // Migrate boards
  if (boardsRaw) {
    try {
      const parsed = JSON.parse(boardsRaw)
      const state = parsed.state || parsed
      const boards = state.boards || {}
      const cards = state.cards || {}

      for (const board of Object.values(boards)) {
        // Create board
        const { data: newBoard } = await supabase
          .from('boards')
          .insert({
            name: board.name || 'Imported Board',
            icon: board.icon || null,
            owner_id: user.id,
            next_task_number: board.nextTaskNumber || 1,
          })
          .select()
          .single()

        if (!newBoard) continue

        // Create columns
        const columns = board.columns || []
        for (let i = 0; i < columns.length; i++) {
          const col = columns[i]
          const { data: newCol } = await supabase
            .from('columns')
            .insert({
              board_id: newBoard.id,
              title: col.title,
              position: i,
            })
            .select()
            .single()

          if (!newCol) continue

          // Create cards in this column
          const cardIds = col.cardIds || []
          for (let j = 0; j < cardIds.length; j++) {
            const card = cards[cardIds[j]]
            if (!card) continue

            await supabase.from('cards').insert({
              board_id: newBoard.id,
              column_id: newCol.id,
              position: j,
              task_number: card.taskNumber || 0,
              global_task_number: card.globalTaskNumber || 0,
              title: card.title || 'Untitled',
              description: card.description || '',
              assignee_name: card.assignee || '',
              priority: card.priority || 'medium',
              due_date: card.dueDate || null,
              icon: card.icon || null,
              completed: card.completed || false,
              labels: card.labels || [],
              checklist: card.checklist || [],
            })
          }
        }
      }
      migrated = true
    } catch (err) {
      console.error('Board migration error:', err)
    }
  }

  // Migrate notes
  if (notesRaw) {
    try {
      const parsed = JSON.parse(notesRaw)
      const state = parsed.state || parsed
      const notes = state.notes || {}

      for (const note of Object.values(notes)) {
        await supabase.from('notes').insert({
          user_id: user.id,
          title: note.title || 'Untitled',
          content: note.content || '',
        })
      }
      migrated = true
    } catch (err) {
      console.error('Notes migration error:', err)
    }
  }

  // Clear localStorage after successful migration
  if (migrated) {
    localStorage.removeItem('gambit-boards')
    localStorage.removeItem('gambit-notes')
  }

  return migrated
}

/**
 * Check if there is local data that could be migrated
 */
export function hasLocalData() {
  return !!(localStorage.getItem('gambit-boards') || localStorage.getItem('gambit-notes'))
}
