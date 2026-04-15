import { useEffect, useState } from 'react'
import { Sparkle } from '@phosphor-icons/react'
import { Plus, Search, Calendar, ClipboardList, ArrowUp } from 'lucide-react'
import { capture } from '../lib/analytics'
import { useAuthStore } from '../store/authStore'

const ACTIONS = [
  { label: 'Create a card', icon: Plus, prompt: 'Create a card: ' },
  { label: 'Find a task', icon: Search, prompt: 'Find tasks where ' },
  { label: 'Plan my week', icon: Calendar, prompt: 'Plan my week.' },
  { label: 'Stand-up notes', icon: ClipboardList, prompt: 'Draft stand-up notes from my recent activity.' },
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

export default function DashboardPage() {
  const profile = useAuthStore((s) => s.profile)
  const fullName = profile?.display_name || ''
  const firstName = fullName.split(' ')[0] || 'there'
  const [input, setInput] = useState('')

  useEffect(() => { capture('feature_used', { feature: 'home' }) }, [])

  const handleSubmit = () => {
    // AI hook-up point — noop for now
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const handleActionClick = (prompt) => {
    setInput(prompt)
    const el = document.querySelector('textarea[placeholder="How can I help you today?"]')
    if (el) {
      el.focus()
      el.setSelectionRange(prompt.length, prompt.length)
    }
  }

  return (
    <div className="w-full h-full flex flex-col items-center gap-8 pt-[10vh] md:pt-[20vh] px-4 md:px-8">
      <div className="mx-auto flex w-full max-w-2xl flex-col items-center gap-7">
        {/* Greeting */}
        <div className="w-full flex justify-center">
          <div className="flex items-center gap-3 text-[var(--text-primary)]" style={{ fontFamily: 'Sentient, Georgia, serif', fontWeight: 300, lineHeight: 1.5, fontSize: 'clamp(1.875rem, 1.2rem + 2vw, 2.5rem)' }}>
            <Sparkle size={32} weight="fill" className="shrink-0 text-[#D4B8C8]" />
            <span className="whitespace-nowrap select-none">{pickGreeting()}, <span className="text-[#8BA32E]">{firstName}</span></span>
          </div>
        </div>

        {/* Chat input */}
        <div className="w-full">
          <div className="flex flex-col bg-[var(--surface-card)] rounded-[20px] border border-transparent shadow-[0_0.25rem_1.25rem_rgba(0,0,0,0.035),0_0_0_0.5px_rgba(224,219,213,0.6)] hover:shadow-[0_0.25rem_1.25rem_rgba(0,0,0,0.035),0_0_0_0.5px_rgba(174,170,164,0.6)] focus-within:shadow-[0_0.25rem_1.25rem_rgba(0,0,0,0.075),0_0_0_0.5px_rgba(174,170,164,0.6)] transition-all duration-200">
            <div className="flex flex-col m-3.5 gap-3">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="How can I help you today?"
                rows={1}
                className="w-full resize-none bg-transparent text-[15px] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none min-h-[1.5rem] max-h-96 pl-1.5 pt-1"
                onInput={(e) => {
                  e.target.style.height = 'auto'
                  e.target.style.height = e.target.scrollHeight + 'px'
                }}
              />

              <div className="flex items-center gap-2">
                <button type="button" aria-label="Add files, connectors, and more" className="h-8 w-8 rounded-lg flex items-center justify-center hover:bg-[var(--surface-hover)] text-[var(--text-secondary)] transition-colors cursor-pointer">
                  <Plus className="w-5 h-5" />
                </button>

                <div className="flex-1" />

                {input.trim() ? (
                  <button
                    type="button"
                    onClick={handleSubmit}
                    aria-label="Send message"
                    className="h-8 w-8 rounded-lg flex items-center justify-center bg-[var(--text-primary)] text-[var(--surface-card)] hover:opacity-90 transition-opacity cursor-pointer"
                  >
                    <ArrowUp className="w-4 h-4" strokeWidth={2.5} />
                  </button>
                ) : (
                  <button type="button" aria-label="Use voice mode" className="h-8 px-1.5 rounded-lg flex items-center justify-center hover:bg-[var(--surface-hover)] text-[var(--text-secondary)] transition-colors cursor-pointer">
                    <svg width="20" height="20" viewBox="0 0 21 21" fill="none" className="block">
                      <rect x="0" y="7.5" height="6" fill="currentColor" width="1" rx="0.5" />
                      <rect x="4" y="5.5" height="10" fill="currentColor" width="1" rx="0.5" />
                      <rect x="8" y="2.5" height="16" fill="currentColor" width="1" rx="0.5" />
                      <rect x="12" y="5.5" height="10" fill="currentColor" width="1" rx="0.5" />
                      <rect x="16" y="2.5" height="16" fill="currentColor" width="1" rx="0.5" />
                      <rect x="20" y="7.5" height="6" fill="currentColor" width="1" rx="0.5" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Kanban-action pills */}
        <div className="w-full">
          <ul className="flex flex-wrap justify-center gap-2" aria-label="Quick actions">
            {ACTIONS.map(({ label, icon: Icon, prompt }) => (
              <li key={label}>
                <button
                  type="button"
                  onClick={() => handleActionClick(prompt)}
                  className="inline-flex items-center gap-1.5 h-8 px-2.5 text-sm text-[var(--text-secondary)] bg-[var(--surface-card)] border-[0.5px] border-[var(--border-default)] rounded-lg hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] transition-all duration-75 cursor-pointer"
                >
                  <Icon className="w-4 h-4 text-[var(--text-muted)] -ml-0.5" />
                  <span className="whitespace-nowrap">{label}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}
