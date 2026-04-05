import { supabase } from './supabase'

/**
 * Detects existing localStorage data and migrates it to Supabase
 * after a user's first login. Returns true if migration was performed.
 */
export async function migrateLocalData() {
  const boardsRaw = localStorage.getItem('kolumn-boards')
  const notesRaw = localStorage.getItem('kolumn-notes')

  if (!boardsRaw && !notesRaw) return false

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false

  let boardsMigrated = true
  let notesMigrated = true

  // Migrate boards
  if (boardsRaw) {
    try {
      const parsed = JSON.parse(boardsRaw)
      const state = parsed.state || parsed
      const boards = state.boards || {}
      const cards = state.cards || {}

      for (const board of Object.values(boards)) {
        // Create board
        const { data: newBoard, error: boardError } = await supabase
          .from('boards')
          .insert({
            name: board.name || 'Imported Board',
            icon: board.icon || null,
            owner_id: user.id,
            next_task_number: board.nextTaskNumber || 1,
          })
          .select()
          .single()

        if (boardError || !newBoard) {
          console.error('Failed to migrate board:', board.name, boardError)
          boardsMigrated = false
          continue
        }

        // Create columns
        const columns = board.columns || []
        for (let i = 0; i < columns.length; i++) {
          const col = columns[i]
          const { data: newCol, error: colError } = await supabase
            .from('columns')
            .insert({
              board_id: newBoard.id,
              title: col.title,
              position: i,
            })
            .select()
            .single()

          if (colError || !newCol) {
            console.error('Failed to migrate column:', col.title, colError)
            boardsMigrated = false
            continue
          }

          // Create cards in this column
          const cardIds = col.cardIds || []
          for (let j = 0; j < cardIds.length; j++) {
            const card = cards[cardIds[j]]
            if (!card) continue

            const { error: cardError } = await supabase.from('cards').insert({
              board_id: newBoard.id,
              column_id: newCol.id,
              position: j,
              task_number: card.taskNumber || 1,
              global_task_number: card.globalTaskNumber || 1,
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
            if (cardError) {
              console.error('Failed to migrate card:', card.title, cardError)
              boardsMigrated = false
            }
          }
        }
      }
    } catch (err) {
      console.error('Board migration error:', err)
      boardsMigrated = false
    }
  }

  // Migrate notes
  if (notesRaw) {
    try {
      const parsed = JSON.parse(notesRaw)
      const state = parsed.state || parsed
      const notes = state.notes || {}

      for (const note of Object.values(notes)) {
        const { error: noteError } = await supabase.from('notes').insert({
          user_id: user.id,
          title: note.title || 'Untitled',
          content: note.content || '',
        })
        if (noteError) {
          console.error('Failed to migrate note:', note.title, noteError)
          notesMigrated = false
        }
      }
    } catch (err) {
      console.error('Notes migration error:', err)
      notesMigrated = false
    }
  }

  // Only clear localStorage for sections that fully migrated
  if (boardsMigrated && boardsRaw) {
    localStorage.removeItem('kolumn-boards')
  }
  if (notesMigrated && notesRaw) {
    localStorage.removeItem('kolumn-notes')
  }

  return boardsMigrated && notesMigrated
}

/**
 * Check if there is local data that could be migrated
 */
export function hasLocalData() {
  return !!(localStorage.getItem('kolumn-boards') || localStorage.getItem('kolumn-notes'))
}
