import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, X } from 'lucide-react'
import { MagnifyingGlass, ChatsCircle } from '@phosphor-icons/react'
import { useChatStore } from '../store/chatStore'
import { formatDistanceToNow } from 'date-fns'

export default function ChatListPage() {
  const navigate = useNavigate()
  const conversations = useChatStore((s) => s.conversations)
  const deleteConversation = useChatStore((s) => s.deleteConversation)
  const [search, setSearch] = useState('')

  const sorted = useMemo(() => {
    const all = Object.values(conversations).sort((a, b) => b.updated_at.localeCompare(a.updated_at))
    if (!search.trim()) return all
    const q = search.trim().toLowerCase()
    return all.filter((c) => c.title.toLowerCase().includes(q))
  }, [conversations, search])

  return (
    <div className="w-full max-w-2xl mx-auto py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-heading text-2xl text-[var(--text-primary)]">Chat</h1>
        <button
          type="button"
          onClick={() => navigate('/dashboard')}
          className="inline-flex items-center gap-1.5 h-8 px-3 text-sm text-[var(--text-secondary)] border-[0.5px] border-[var(--border-default)] rounded-lg hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          New chat
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <MagnifyingGlass size={16} weight="regular" className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search conversations..."
          className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border-[0.5px] border-[var(--border-default)] bg-[var(--surface-page)] focus:outline-none focus:border-[var(--text-primary)] placeholder:text-[var(--text-faint)] transition-colors"
        />
      </div>

      {/* Conversation list */}
      {sorted.length > 0 ? (
        <div className="flex flex-col gap-1">
          {sorted.map((conv) => (
            <div
              key={conv.id}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left hover:bg-[var(--surface-hover)] transition-colors cursor-pointer group"
              onClick={() => navigate(`/chat/${conv.id}`)}
            >
              <ChatsCircle size={18} weight="regular" className="shrink-0 text-[var(--text-faint)] group-hover:text-[var(--text-muted)]" />
              <div className="flex-1 min-w-0">
                <div className="text-sm text-[var(--text-primary)] truncate">{conv.title}</div>
                <div className="text-[11px] text-[var(--text-faint)]">
                  {formatDistanceToNow(new Date(conv.updated_at), { addSuffix: true })}
                </div>
              </div>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); deleteConversation(conv.id) }}
                className="shrink-0 p-1 rounded-md opacity-0 group-hover:opacity-100 text-[var(--text-faint)] hover:text-[#C27A4A] hover:bg-[var(--surface-raised)] transition-all"
                aria-label="Delete conversation"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      ) : search.trim() ? (
        <div className="text-center py-12 text-sm text-[var(--text-muted)]">
          No conversations matching "{search}"
        </div>
      ) : (
        <div className="text-center py-12">
          <ChatsCircle size={32} weight="regular" className="mx-auto mb-3 text-[var(--text-faint)]" />
          <p className="text-sm text-[var(--text-muted)] mb-4">No conversations yet</p>
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            className="inline-flex items-center gap-1.5 h-8 px-3 text-sm font-medium text-white bg-[var(--text-primary)] rounded-lg hover:opacity-90 transition-opacity cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Start a conversation
          </button>
        </div>
      )}
    </div>
  )
}
