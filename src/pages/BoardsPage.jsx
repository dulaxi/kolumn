import { useState } from 'react'
import { useBoardStore } from '../store/boardStore'
import BoardSelector from '../components/board/BoardSelector'
import BoardView from '../components/board/BoardView'
import CardModal from '../components/board/CardModal'

export default function BoardsPage() {
  const [editingCardId, setEditingCardId] = useState(null)
  const activeBoardId = useBoardStore((s) => s.activeBoardId)

  return (
    <div>
      <div className="mb-4">
        <BoardSelector />
      </div>

      {activeBoardId ? (
        <BoardView boardId={activeBoardId} onCardClick={setEditingCardId} />
      ) : (
        <div className="flex items-center justify-center h-[calc(100vh-10rem)] text-gray-400">
          Create a board to get started
        </div>
      )}

      {editingCardId && (
        <CardModal
          cardId={editingCardId}
          onClose={() => setEditingCardId(null)}
        />
      )}
    </div>
  )
}
