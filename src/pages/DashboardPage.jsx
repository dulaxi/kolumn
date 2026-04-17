import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Sparkle } from '@phosphor-icons/react'
import { Plus, Search, Calendar, ClipboardList, Columns3, Bug, Zap } from 'lucide-react'
import { capture } from '../lib/analytics'
import { useAuthStore } from '../store/authStore'
import { useBoardStore } from '../store/boardStore'
import { useChatStore } from '../store/chatStore'
import ChatInput from '../components/chat/ChatInput'

const ACTIONS = [
  { label: 'Create a card', icon: Plus, prompt: 'Create a card: ' },
  { label: 'Find a task', icon: Search, prompt: 'Find tasks where ' },
  { label: 'Plan my week', icon: Calendar, prompt: 'Plan my week.' },
  { label: 'Stand-up notes', icon: ClipboardList, prompt: 'Draft stand-up notes from my recent activity.' },
]

const TEMPLATES = [
  {
    id: 'simple',
    name: 'Simple',
    icon: Columns3,
    columns: ['To Do', 'In Progress', 'Done'],
  },
  {
    id: 'bug-tracker',
    name: 'Bug Tracker',
    icon: Bug,
    columns: ['Reported', 'In Review', 'Fixing', 'Resolved'],
  },
  {
    id: 'sprint',
    name: 'Sprint',
    icon: Zap,
    columns: ['Backlog', 'To Do', 'In Progress', 'Review', 'Done'],
  },
]

const GREETINGS = {
  morning: ['Clear the board', 'Ship it', 'Fresh columns'],
  afternoon: ["Momentum's yours", 'Keep the flow', 'Halfway through'],
  evening: ['Close it out', 'Wrap the day', 'One more move'],
  night: ['Still at it', 'Locked in', 'The quiet hours'],
}

function getGreetingSlot(hour) {
  if (hour >= 5 && hour <= 11) return 'morning'
  if (hour >= 12 && hour <= 16) return 'afternoon'
  if (hour >= 17 && hour <= 20) return 'evening'
  return 'night'
}

function pickGreeting() {
  const slot = getGreetingSlot(new Date().getHours())
  const options = GREETINGS[slot]
  const dayIndex = Math.floor(Date.now() / 86400000)
  return options[dayIndex % options.length]
}

function triggerCreateBoard() {
  let attempts = 0
  let handled = false
  const onHandled = () => { handled = true }
  window.addEventListener('kolumn:create-board-ack', onHandled, { once: true })
  const dispatch = () => {
    if (handled) { window.removeEventListener('kolumn:create-board-ack', onHandled); return }
    window.dispatchEvent(new CustomEvent('kolumn:create-board'))
    if (++attempts < 10) setTimeout(dispatch, 100)
  }
  setTimeout(dispatch, 50)
}

export default function DashboardPage() {
  const navigate = useNavigate()
  const profile = useAuthStore((s) => s.profile)
  const fullName = profile?.display_name || ''
  const firstName = fullName.split(' ')[0] || 'there'

  const setActiveBoard = useBoardStore((s) => s.setActiveBoard)
  const addBoard = useBoardStore((s) => s.addBoard)
  const createConversation = useChatStore((s) => s.createConversation)
  const addMessage = useChatStore((s) => s.addMessage)
  const sendMessage = useChatStore((s) => s.sendMessage)

  useEffect(() => { capture('feature_used', { feature: 'home' }) }, [])

  const handleSubmit = (text) => {
    if (!text) return
    const convId = createConversation('New chat')
    addMessage(convId, { role: 'user', text })
    navigate(`/chat/${convId}`)
    sendMessage(convId, text)
  }

  const handleNewBoard = () => {
    navigate('/boards')
    triggerCreateBoard()
  }

  const handleCreateFromTemplate = async (template) => {
    const newBoardId = await addBoard(template.name, null, template.columns)
    if (newBoardId) {
      setActiveBoard(newBoardId)
      navigate('/boards')
    }
  }

  return (
    <div className="w-full h-full flex flex-col items-center gap-7 pt-[10vh] md:pt-[18vh] px-4 md:px-8">
      <div className="mx-auto flex w-full max-w-2xl flex-col items-center gap-6">

        {/* Greeting */}
        <div className="w-full flex justify-center">
          <div className="flex items-center gap-3 text-[var(--text-primary)]" style={{ fontFamily: "'Clash Grotesk', -apple-system, BlinkMacSystemFont, system-ui, sans-serif", fontWeight: 400, lineHeight: 1.5, fontSize: 'clamp(1.875rem, 1.2rem + 2vw, 2.5rem)' }}>
            <Sparkle size={32} weight="fill" className="shrink-0 text-[#D4B8C8]" />
            <span className="whitespace-nowrap select-none">{pickGreeting()}, <span className="text-[#8BA32E]">{firstName}</span></span>
          </div>
        </div>

        {/* Chat input */}
        <div className="w-full">
          <ChatInput onSend={handleSubmit} />
        </div>

        {/* Kanban-action pills */}
        <div className="w-full">
          <ul className="flex flex-wrap justify-center gap-2" aria-label="Quick actions">
            {ACTIONS.map(({ label, icon: Icon, prompt }) => (
              <li key={label}>
                <button
                  type="button"
                  onClick={() => handleSubmit(prompt)}
                  className="inline-flex items-center gap-1.5 h-8 px-2.5 text-sm text-[var(--text-secondary)] bg-[var(--surface-page)] border-[0.5px] border-[var(--border-default)] rounded-lg hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] transition-all duration-75 cursor-pointer"
                >
                  <Icon className="w-4 h-4 text-[var(--text-muted)] -ml-0.5" />
                  <span className="whitespace-nowrap">{label}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>

        {/* Board template tiles */}
        <div className="w-full pt-2">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {TEMPLATES.map((t) => {
              const Icon = t.icon
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => handleCreateFromTemplate(t)}
                  className="w-full flex flex-col gap-2 rounded-2xl border-[0.5px] border-[var(--border-default)] bg-[var(--surface-page)] p-3 text-left transition-all cursor-pointer hover:bg-[var(--surface-hover)] hover:border-[var(--text-muted)]"
                >
                  <div className="flex items-center gap-3 w-full min-w-0">
                    <div className="flex w-9 h-9 shrink-0 items-center justify-center rounded-lg border-0.5 border-[var(--border-default)] bg-[var(--surface-raised)]">
                      <Icon className="w-4 h-4 text-[var(--text-primary)]" />
                    </div>
                    <span className="flex-1 min-w-0 text-sm font-medium text-[var(--text-primary)] truncate">{t.name}</span>
                  </div>
                  <span className="w-full text-[11px] font-medium text-[var(--text-secondary)] lowercase truncate">
                    {t.columns.map((c) => `/${c}`).join(' ')}
                  </span>
                </button>
              )
            })}
            <button
              type="button"
              onClick={handleNewBoard}
              className="w-full flex flex-col gap-2 rounded-2xl border-[0.5px] border-dashed border-[var(--border-default)] bg-[var(--surface-page)] p-3 text-left transition-all cursor-pointer hover:bg-[var(--surface-hover)] hover:border-[var(--text-muted)]"
            >
              <div className="flex items-center gap-3 w-full min-w-0">
                <div className="flex w-9 h-9 shrink-0 items-center justify-center rounded-lg border-0.5 border-[var(--border-default)] bg-[var(--surface-raised)]">
                  <Plus className="w-4 h-4 text-[var(--text-muted)]" />
                </div>
                <span className="flex-1 min-w-0 text-sm font-medium text-[var(--text-secondary)] truncate">New board</span>
              </div>
              <span className="w-full text-[11px] text-[var(--text-faint)] truncate">Start from scratch</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}
