import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { DotsThree, PencilSimple, Star, Trash } from '@phosphor-icons/react'
import { useChatStore } from '../store/chatStore'
import { useBoardStore } from '../store/boardStore'
import { groupExchanges } from '../lib/chatExchanges'
import ChatMessage from '../components/chat/ChatMessage'
import ChatInput from '../components/chat/ChatInput'
import TypingIndicator from '../components/chat/TypingIndicator'
import CardRail from '../components/chat/CardRail'
import ConfirmModal from '../components/board/ConfirmModal'
import NotFoundState from '../components/ui/NotFoundState'
import Menu from '../components/ui/Menu'
import Button from '../components/ui/Button'

export default function ChatPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const conversation = useChatStore((s) => s.conversations[id])
  const messages = useChatStore((s) => s.messages[id]) || []
  const streamingId = useChatStore((s) => s.streamingConversationId)
  const addMessage = useChatStore((s) => s.addMessage)
  const sendMessage = useChatStore((s) => s.sendMessage)
  const renameConversation = useChatStore((s) => s.renameConversation)
  const toggleStarred = useChatStore((s) => s.toggleStarred)
  const deleteConversation = useChatStore((s) => s.deleteConversation)

  const [menuOpen, setMenuOpen] = useState(false)
  const [renaming, setRenaming] = useState(false)
  const [draft, setDraft] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)

  useEffect(() => {
    useChatStore.getState().setActiveConversation(id)
    return () => useChatStore.getState().setActiveConversation(null)
  }, [id])

  useEffect(() => {
    const handler = () => navigate('/boards')
    window.addEventListener('kolumn:ai-navigate-board', handler)
    return () => window.removeEventListener('kolumn:ai-navigate-board', handler)
  }, [navigate])

  // Mention resolution + the card rail need every board's cards, not just
  // the active board's (boot only loads the active board) — mirrors the
  // same call in AllBoardsView.jsx.
  useEffect(() => {
    useBoardStore.getState().ensureAllCardsLoaded()
  }, [])

  const exchanges = useMemo(() => groupExchanges(messages), [messages])
  const firstUserText = useMemo(() => messages.find((m) => m.role === 'user')?.text, [messages])

  // Sticky offset for the rail. While the rail fits the scrollport it pins
  // 16px from the top; once taller, the offset goes negative so the rail
  // scrolls with the conversation until its bottom is in view, then locks.
  const railRef = useRef(null)
  const [railTop, setRailTop] = useState(16)
  useEffect(() => {
    const el = railRef.current
    if (!el) return
    const update = () => {
      const scroller = el.closest('main') || document.documentElement
      setRailTop(Math.min(16, scroller.clientHeight - el.offsetHeight - 16))
    }
    update()
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(update) : null
    ro?.observe(el)
    window.addEventListener('resize', update)
    return () => {
      ro?.disconnect()
      window.removeEventListener('resize', update)
    }
  }, [])

  if (!conversation) {
    return (
      <div className="flex h-full items-center justify-center">
        <NotFoundState
          title="This conversation is gone"
          body="It may have been deleted on another device."
          actions={[{ label: 'Back to chats', to: '/chat' }]}
        />
      </div>
    )
  }

  const handleSend = (text) => {
    addMessage(id, { role: 'user', text })
    sendMessage(id, text)
  }

  const commitRename = () => {
    renameConversation(id, draft)
    setRenaming(false)
  }

  return (
    <div className="mt-2 grid w-full grid-cols-7 xl:grid-cols-12 lg:mt-4">
      {/* Left column: header, composer, conversation */}
      <div className="col-span-7 flex flex-col">
        {/* Header */}
        <div className="mb-3">
          <div className="mb-2 flex items-start gap-3">
            {renaming ? (
              <input
                autoFocus
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') commitRename()
                  if (e.key === 'Escape') setRenaming(false)
                }}
                onBlur={commitRename}
                aria-label="Rename conversation"
                className="mt-0.5 min-w-0 flex-1 border-b border-[var(--border-focus)] bg-transparent font-heading font-[425] text-3xl tracking-tight text-[var(--text-primary)] focus:outline-none"
              />
            ) : (
              <h1 className="mt-0.5 min-w-0 font-heading font-[425] text-3xl tracking-tight text-[var(--text-primary)] line-clamp-2 break-words">
                {conversation.title}
              </h1>
            )}
            <div className="ml-auto flex shrink-0 items-center gap-1">
              <Menu
                open={menuOpen}
                onOpenChange={setMenuOpen}
                placement="bottom-end"
                panelClassName="w-44"
                panel={
                  <>
                    <Menu.Item
                      icon={<PencilSimple size={16} />}
                      onSelect={() => {
                        setMenuOpen(false)
                        setDraft(conversation.title)
                        setRenaming(true)
                      }}
                    >
                      Rename
                    </Menu.Item>
                    <Menu.Divider />
                    <Menu.Item
                      icon={<Trash size={16} />}
                      destructive
                      onSelect={() => {
                        setMenuOpen(false)
                        setConfirmDelete(true)
                      }}
                    >
                      Delete
                    </Menu.Item>
                  </>
                }
              >
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Conversation options"
                  onClick={() => setMenuOpen((o) => !o)}
                >
                  <DotsThree size={20} weight="bold" />
                </Button>
              </Menu>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={conversation.starred ? 'Unstar conversation' : 'Star conversation'}
                aria-pressed={!!conversation.starred}
                onClick={() => toggleStarred(id)}
              >
                <Star
                  size={18}
                  weight={conversation.starred ? 'fill' : 'regular'}
                  className={conversation.starred ? 'text-[var(--color-honey)]' : ''}
                />
              </Button>
            </div>
          </div>
          {firstUserText && (
            <p className="text-[15px] text-[var(--text-secondary)] line-clamp-2 break-words">{firstUserText}</p>
          )}
        </div>

        {/* Composer */}
        <ChatInput onSend={handleSend} autoFocus docked={false} busy={streamingId === id} />

        {/* Conversation — newest exchange first */}
        <div className="mt-6 flex flex-col pb-8">
          {exchanges.map((exchange, i) => (
            <div key={exchange.key} className={i > 0 ? 'mt-5 border-t border-[var(--border-subtle)] pt-5' : ''}>
              {exchange.user && <ChatMessage message={exchange.user} />}
              {exchange.replies.map((msg) => (
                <ChatMessage key={msg.id} message={msg} />
              ))}
              {i === 0 && streamingId === id && <TypingIndicator />}
            </div>
          ))}
        </div>
      </div>

      {/* Right rail: mentioned cards. Stacks below the conversation until xl.
          On xl it's sticky against the page scroller (self-start so the grid
          doesn't stretch it); the measured `top` lets a tall rail scroll in
          sync with the conversation until its bottom is visible, then lock. */}
      <div
        ref={railRef}
        style={{ top: railTop }}
        className="col-span-7 mt-4 xl:col-span-5 xl:mt-0 xl:pl-12 xl:pr-2 xl:sticky xl:self-start"
      >
        <CardRail messages={messages} />
      </div>

      {confirmDelete && (
        <ConfirmModal
          title="Delete conversation?"
          message="This permanently removes the conversation and its messages."
          onConfirm={() => {
            deleteConversation(id)
            navigate('/chat')
          }}
          onCancel={() => setConfirmDelete(false)}
        />
      )}
    </div>
  )
}
