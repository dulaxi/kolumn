import { useState, useMemo } from 'react'
import { useNoteStore } from '../store/noteStore'
import { format, parseISO } from 'date-fns'
import { Plus, Trash2, FileText } from 'lucide-react'

export default function NotesPage() {
  const notes = useNoteStore((s) => s.notes)
  const addNote = useNoteStore((s) => s.addNote)
  const updateNote = useNoteStore((s) => s.updateNote)
  const deleteNote = useNoteStore((s) => s.deleteNote)
  const [selectedNoteId, setSelectedNoteId] = useState(null)

  const sortedNotes = useMemo(
    () =>
      Object.values(notes).sort(
        (a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)
      ),
    [notes]
  )

  const selectedNote = selectedNoteId ? notes[selectedNoteId] : null

  const handleNewNote = () => {
    const id = addNote('Untitled')
    setSelectedNoteId(id)
  }

  const handleDeleteNote = (e, noteId) => {
    e.stopPropagation()
    deleteNote(noteId)
    if (selectedNoteId === noteId) {
      setSelectedNoteId(null)
    }
  }

  const handleTitleChange = (e) => {
    if (!selectedNoteId) return
    updateNote(selectedNoteId, { title: e.target.value })
  }

  const handleContentChange = (e) => {
    if (!selectedNoteId) return
    updateNote(selectedNoteId, { content: e.target.value })
  }

  return (
    <div className="flex gap-0 h-[calc(100vh-7rem)]">
      {/* Notes List */}
      <div className="w-72 shrink-0 bg-white rounded-l-xl border border-gray-200 flex flex-col">
        <div className="p-3 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-900">Notes</h2>
          <button
            onClick={handleNewNote}
            className="p-1.5 hover:bg-gray-100 rounded-lg cursor-pointer text-gray-500 hover:text-gray-700"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {sortedNotes.length === 0 ? (
            <p className="text-sm text-gray-400 p-4 text-center">
              No notes yet
            </p>
          ) : (
            sortedNotes.map((note) => (
              <button
                key={note.id}
                type="button"
                onClick={() => setSelectedNoteId(note.id)}
                className={`w-full text-left p-3 border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors group ${
                  selectedNoteId === note.id ? 'bg-primary-50' : ''
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {note.title || 'Untitled'}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {format(parseISO(note.updatedAt), 'MMM d, yyyy')}
                    </p>
                  </div>
                  <button
                    onClick={(e) => handleDeleteNote(e, note.id)}
                    className="p-1 opacity-0 group-hover:opacity-100 hover:bg-red-50 hover:text-red-500 rounded text-gray-400 cursor-pointer transition-opacity"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 bg-white rounded-r-xl border-t border-r border-b border-gray-200 flex flex-col">
        {selectedNote ? (
          <>
            <div className="p-4 border-b border-gray-200">
              <input
                type="text"
                value={selectedNote.title}
                onChange={handleTitleChange}
                className="text-xl font-bold text-gray-900 w-full outline-none bg-transparent"
                placeholder="Note title..."
              />
              <p className="text-xs text-gray-400 mt-1">
                Last edited{' '}
                {format(parseISO(selectedNote.updatedAt), 'MMM d, yyyy h:mm a')}
              </p>
            </div>
            <textarea
              value={selectedNote.content}
              onChange={handleContentChange}
              className="flex-1 p-4 text-sm text-gray-700 outline-none resize-none bg-transparent leading-relaxed"
              placeholder="Start writing..."
            />
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
            <FileText className="w-12 h-12 mb-3" />
            <p className="text-sm">Select a note or create a new one</p>
          </div>
        )}
      </div>
    </div>
  )
}
