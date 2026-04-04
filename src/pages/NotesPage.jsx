import { useState, useMemo, useEffect } from 'react'
import { capture } from '../lib/analytics'
import { useNoteStore } from '../store/noteStore'
import { format, parseISO } from 'date-fns'
import { Plus, Trash2, FileText, ArrowLeft } from 'lucide-react'
import { useIsMobile } from '../hooks/useMediaQuery'

export default function NotesPage() {
  const notes = useNoteStore((s) => s.notes)
  const addNote = useNoteStore((s) => s.addNote)
  const updateNote = useNoteStore((s) => s.updateNote)
  const deleteNote = useNoteStore((s) => s.deleteNote)
  const fetchNotes = useNoteStore((s) => s.fetchNotes)
  const [selectedNoteId, setSelectedNoteId] = useState(null)
  const isMobile = useIsMobile()
  const [showEditor, setShowEditor] = useState(false)

  const handleSelectNote = (noteId) => {
    setSelectedNoteId(noteId)
    if (isMobile) setShowEditor(true)
  }

  const handleBackToList = () => setShowEditor(false)

  useEffect(() => {
    fetchNotes()
  }, [])

  useEffect(() => { capture('feature_used', { feature: 'notes' }) }, [])

  const sortedNotes = useMemo(
    () =>
      Object.values(notes).sort(
        (a, b) => new Date(b.updated_at) - new Date(a.updated_at)
      ),
    [notes]
  )

  const selectedNote = selectedNoteId ? notes[selectedNoteId] : null

  const handleNewNote = async () => {
    const id = await addNote('Untitled')
    if (id) setSelectedNoteId(id)
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
      <div className={`${isMobile ? (showEditor ? 'hidden' : 'flex-1 rounded-2xl') : 'w-72 shrink-0 rounded-l-2xl'} bg-white border border-[#E0DBD5] shadow-sm flex flex-col`}>
        <div className="p-3 border-b border-[#E0DBD5] flex items-center justify-between">
          <h2 className="text-sm font-semibold text-[#1B1B18]">Notes</h2>
          <button
            onClick={handleNewNote}
            className="p-1.5 hover:bg-[#E8E2DB] rounded-lg cursor-pointer text-[#5C5C57] hover:text-[#1B1B18]"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {sortedNotes.length === 0 ? (
            <p className="text-sm text-[#8E8E89] p-4 text-center">
              No notes yet
            </p>
          ) : (
            sortedNotes.map((note) => (
              <button
                key={note.id}
                type="button"
                onClick={() => handleSelectNote(note.id)}
                className={`w-full text-left p-3 border-b border-[#E8E2DB] hover:bg-[#F2EDE8] cursor-pointer transition-colors group ${
                  selectedNoteId === note.id ? 'bg-[#F2EDE8]' : ''
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-[#1B1B18] truncate">
                      {note.title || 'Untitled'}
                    </p>
                    <p className="text-xs text-[#8E8E89] mt-0.5">
                      {note.updated_at && format(parseISO(note.updated_at), 'MMM d, yyyy')}
                    </p>
                  </div>
                  <button
                    onClick={(e) => handleDeleteNote(e, note.id)}
                    className="p-1 opacity-0 group-hover:opacity-100 hover:bg-[#E8E2DB] hover:text-[#7A5C44] rounded text-[#8E8E89] cursor-pointer transition-opacity"
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
      <div className={`${isMobile ? (showEditor ? 'flex-1 rounded-2xl border-l' : 'hidden') : 'flex-1 border-l-0 rounded-r-2xl'} bg-white border border-[#E0DBD5] shadow-sm flex flex-col`}>
        {selectedNote ? (
          <>
            <div className="p-4 border-b border-[#E0DBD5] flex items-center">
              {isMobile && (
                <button onClick={handleBackToList} className="p-1.5 rounded-lg hover:bg-[#E8E2DB] mr-2">
                  <ArrowLeft className="w-5 h-5 text-[#5C5C57]" />
                </button>
              )}
              <div className="flex-1">
              <input
                type="text"
                value={selectedNote.title}
                onChange={handleTitleChange}
                className="text-xl font-bold text-[#1B1B18] w-full outline-none bg-transparent placeholder-[#C4BFB8]"
                placeholder="Note title..."
              />
              <p className="text-xs text-[#8E8E89] mt-1">
                Last edited{' '}
                {selectedNote.updated_at && format(parseISO(selectedNote.updated_at), 'MMM d, yyyy h:mm a')}
              </p>
              </div>
            </div>
            <textarea
              value={selectedNote.content}
              onChange={handleContentChange}
              className="flex-1 p-4 text-sm text-[#5C5C57] outline-none resize-none bg-transparent leading-relaxed placeholder-[#C4BFB8]"
              placeholder="Start writing..."
            />
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-[#8E8E89]">
            <FileText className="w-12 h-12 mb-3" />
            <p className="text-sm">Select a note or create a new one</p>
          </div>
        )}
      </div>
    </div>
  )
}
