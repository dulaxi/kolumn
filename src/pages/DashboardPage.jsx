import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bug, Calendar, ClipboardText, Columns, Lightning, MagnifyingGlass, Plus, Sparkle } from '@phosphor-icons/react'

import { capture } from '../lib/analytics'
import { useAuthStore } from '../store/authStore'
import { useBoardStore } from '../store/boardStore'
import { useChatStore } from '../store/chatStore'
import ChatInput from '../components/chat/ChatInput'
import PixelKlay from '../components/klay/PixelKlay'
import { getGreetingSlot, pickGreeting, KLAY_BY_SLOT } from '../utils/greeting'
import Button from '../components/ui/Button'

const ACTIONS = [
  { label: 'Create a card', icon: Plus, prompt: 'Create a card: ' },
  { label: 'Find a task', icon: MagnifyingGlass, prompt: 'Find tasks where ' },
  { label: 'Plan my week', icon: Calendar, prompt: 'Plan my week.' },
  { label: 'Stand-up notes', icon: ClipboardText, prompt: 'Draft stand-up notes from my recent activity.' },
]

const TEMPLATES = [
  {
    id: 'simple',
    name: 'Simple',
    icon: Columns,
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
    icon: Lightning,
    columns: ['Backlog', 'To Do', 'In Progress', 'Review', 'Done'],
  },
]

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

  // One clock read drives both the words and Klay's posture.
  const slot = getGreetingSlot(new Date().getHours())

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
          <div className="flex items-center gap-3 text-[var(--text-primary)]" style={{ fontFamily: 'var(--font-logo)', fontWeight: 400, lineHeight: 1.5, fontSize: 'clamp(1.875rem, 1.2rem + 2vw, 2.5rem)' }}>
            <Sparkle size={32} weight="fill" className="shrink-0 text-[var(--accent-sparkle)]" />
            <span className="whitespace-nowrap select-none">{pickGreeting(slot)}, <span className="text-[var(--color-logo)]">{firstName}</span></span>
          </div>
        </div>

        {/* Chat input — Klay perches on its shoulder, reading the same
            clock as the greeting words (decision: dashboard-klay-options-v2,
            C). The input's top edge is his FLOOR: BASE feet (grid rows 0-7,
            8×6px at scale 6) sit flush on it via -top-12, and the card is
            painted in front of him (it comes later in the DOM with its own
            positioning context), so bobbing frames dip BEHIND the edge
            instead of sliding onto the control. pointer-events-none: he
            never costs a click. */}
        <div className="w-full relative">
          <PixelKlay
            animation={KLAY_BY_SLOT[slot]}
            scale={6}
            label={`Klay (${slot})`}
            className="absolute right-8 -top-12 pointer-events-none select-none"
          />
          <div className="relative">
            <ChatInput onSend={handleSubmit} docked={false} />
          </div>
        </div>

        {/* Kanban-action pills */}
        <div className="w-full">
          <ul className="flex flex-wrap justify-center gap-2" aria-label="Quick actions">
            {ACTIONS.map(({ label, icon: Icon, prompt }) => (
              <li key={label}>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleSubmit(prompt)}
                  className="!bg-[var(--surface-page)]"
                >
                  <Icon className="w-4 h-4 text-[var(--text-muted)] -ml-0.5" />
                  <span className="whitespace-nowrap">{label}</span>
                </Button>
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
                  className="w-full flex flex-col gap-2 rounded-xl border-[0.5px] border-[var(--border-default)] bg-[var(--surface-page)] p-3 text-left transition-all cursor-pointer hover:bg-[var(--surface-hover)] hover:border-[var(--text-muted)]"
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
              className="w-full flex flex-col gap-2 rounded-xl border-[0.5px] border-dashed border-[var(--border-default)] bg-[var(--surface-page)] p-3 text-left transition-all cursor-pointer hover:bg-[var(--surface-hover)] hover:border-[var(--text-muted)]"
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
