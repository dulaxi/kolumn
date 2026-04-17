import { useEffect, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useChatStore } from '../store/chatStore'
import ChatMessage from '../components/chat/ChatMessage'
import ChatInput from '../components/chat/ChatInput'
import TypingIndicator from '../components/chat/TypingIndicator'

export default function ChatPage() {
  const { id } = useParams()
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
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length, streamingId])

  if (!conversation) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 text-[var(--text-muted)]">
        <p className="text-sm">Conversation not found</p>
        <Link to="/dashboard" className="text-sm text-[#8BA32E] hover:underline">Back to Home</Link>
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
      <ChatInput onSend={handleSend} autoFocus />
    </div>
  )
}
