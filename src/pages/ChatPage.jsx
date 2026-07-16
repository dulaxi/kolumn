import { useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useChatStore } from '../store/chatStore'
import ChatMessage from '../components/chat/ChatMessage'
import ChatInput from '../components/chat/ChatInput'
import TypingIndicator from '../components/chat/TypingIndicator'
import NotFoundState from '../components/ui/NotFoundState'

export default function ChatPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const conversation = useChatStore((s) => s.conversations[id])
  const messages = useChatStore((s) => s.messages[id]) || []
  const streamingId = useChatStore((s) => s.streamingConversationId)
  const addMessage = useChatStore((s) => s.addMessage)
  const sendMessage = useChatStore((s) => s.sendMessage)
  const messagesEndRef = useRef(null)

  useEffect(() => {
    useChatStore.getState().setActiveConversation(id)
    return () => useChatStore.getState().setActiveConversation(null)
  }, [id])

  useEffect(() => {
    const handler = () => navigate('/boards')
    window.addEventListener('kolumn:ai-navigate-board', handler)
    return () => window.removeEventListener('kolumn:ai-navigate-board', handler)
  }, [navigate])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length, streamingId])

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

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto px-4 py-6 subtle-scrollbar">
        <div className="mx-auto max-w-2xl">
          {messages.map((msg) => (
            <ChatMessage key={msg.id} message={msg} />
          ))}
          {streamingId === id && <TypingIndicator />}
          <div ref={messagesEndRef} />
        </div>
      </div>
      <ChatInput onSend={handleSend} autoFocus busy={streamingId === id} />
    </div>
  )
}
