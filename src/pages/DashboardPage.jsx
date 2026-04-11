import { useMemo, useEffect } from 'react'
import { capture } from '../lib/analytics'
import { useNavigate } from 'react-router-dom'
import { useBoardStore } from '../store/boardStore'
import { useAuthStore } from '../store/authStore'
import { format, formatDistanceToNow } from 'date-fns'
import { Plus, Target, LayoutGrid, Users, BarChart3, Kanban, Sparkles, FileText } from 'lucide-react'
import DynamicIcon from '../components/board/DynamicIcon'
import ActionCard from '../components/ActionCard'
import { getGreeting } from '../utils/formatting'
import { computeBoardSummaries } from '../utils/cardStats'
import { SEGMENT_COLORS } from '../constants/colors'

// Prefetch the boards route during idle time — users almost always navigate here next
const prefetchBoards = () => { import('./BoardsPage') }

const QUOTES = [
  { text: "The secret of getting ahead is getting started.", author: "Mark Twain" },
  { text: "It does not matter how slowly you go as long as you do not stop.", author: "Confucius" },
  { text: "Small deeds done are better than great deeds planned.", author: "Peter Marshall" },
  { text: "Focus on being productive instead of busy.", author: "Tim Ferriss" },
  { text: "The way to get started is to quit talking and begin doing.", author: "Walt Disney" },
  { text: "You don't have to see the whole staircase, just take the first step.", author: "Martin Luther King Jr." },
]

function getDailyIndex(arr) {
  const day = Math.floor(Date.now() / 86400000)
  return day % arr.length
}

export default function DashboardPage() {
  const navigate = useNavigate()
  const boards = useBoardStore((s) => s.boards)
  const columns = useBoardStore((s) => s.columns)
  const cards = useBoardStore((s) => s.cards)
  const setActiveBoard = useBoardStore((s) => s.setActiveBoard)
  const profile = useAuthStore((s) => s.profile)
  const displayName = profile?.display_name || 'there'

  const boardSummaries = useMemo(
    () => computeBoardSummaries(boards, columns, cards, profile?.display_name),
    [boards, columns, cards, profile]
  )


  useEffect(() => { capture('feature_used', { feature: 'dashboard' }) }, [])

  useEffect(() => {
    if ('requestIdleCallback' in window) {
      const id = requestIdleCallback(prefetchBoards)
      return () => cancelIdleCallback(id)
    } else {
      const id = setTimeout(prefetchBoards, 200)
      return () => clearTimeout(id)
    }
  }, [])

  const quote = QUOTES[getDailyIndex(QUOTES)]
  const boardCount = Object.keys(boards).length

  function handleNewBoard() {
    navigate('/boards')
    let attempts = 0
    let handled = false
    const onHandled = () => { handled = true }
    window.addEventListener('kolumn:create-board-ack', onHandled, { once: true })
    const tryDispatch = () => {
      if (handled) { window.removeEventListener('kolumn:create-board-ack', onHandled); return }
      window.dispatchEvent(new CustomEvent('kolumn:create-board'))
      if (++attempts < 10) setTimeout(tryDispatch, 100)
    }
    setTimeout(tryDispatch, 50)
  }

  return (
    <div className="w-full flex flex-col">
      {/* Greeting */}
      <div className={`mb-8 ${boardCount === 0 ? 'text-center' : ''}`}>
        <div className="text-[11px] tracking-[1.5px] uppercase text-[var(--text-muted)] mb-1">
          {format(new Date(), 'EEEE, MMMM d')}
        </div>
        <h1 className="text-[26px] sm:text-[30px] font-normal text-[var(--text-primary)] leading-tight">
          <span className="font-heading">{boardCount === 0 ? 'Welcome' : getGreeting()},</span> <span className="text-[#A8BA32] font-heading">{displayName}</span>
        </h1>
        <p className="text-[14px] text-[var(--text-secondary)] font-heading italic mt-0.5">
          {boardCount === 0 ? "Let's get you set up." : 'Here\u2019s your home base.'}
        </p>
      </div>

      {/* New user hero — centered welcome block */}
      {boardCount === 0 && (
        <div className="flex flex-col items-center text-center mb-12">
          <div className="w-16 h-16 rounded-2xl bg-[var(--accent-lime-wash)] flex items-center justify-center mb-5">
            <Target className="w-8 h-8 text-[#8BA32E]" />
          </div>
          <h2 className="text-xl font-normal text-[var(--text-primary)] mb-2 font-heading">Your dashboard lives here</h2>
          <p className="text-sm text-[var(--text-secondary)] max-w-md mb-6">
            Stats, calendar, timeline, and activity will fill in as you create boards and complete tasks.
          </p>
          <button
            onClick={handleNewBoard}
            className="group inline-flex items-center gap-2 px-5 py-2.5 bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] text-sm font-medium rounded-xl hover:bg-[var(--btn-primary-hover)] transition-all duration-75 active:scale-[0.995] cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Create your first board
          </button>
        </div>
      )}

      {/* ActionCards — below hero for new users, at top for existing */}
      <div className="flex w-full flex-col gap-3 mb-10">
        <ActionCard
          icon={Plus}
          title="Create a board"
          description="Set up columns and start organizing your tasks."
          onClick={handleNewBoard}
        />
        <ActionCard
          icon={Sparkles}
          title="Import from notes"
          description="Turn your rough notes into structured kanban cards."
          onClick={handleNewBoard}
        />
        <ActionCard
          icon={Users}
          title="Invite your team"
          description="Share boards by email and collaborate in real time."
          to="/workspace"
        />
      </div>

      {boardCount === 0 ? null : (
        <div className="mb-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="inline-flex items-center gap-1.5 text-lg font-normal text-[var(--text-primary)] font-logo"><Kanban className="w-4.5 h-4.5 text-[#A8BA32]" />Your boards</h2>
            <button
              onClick={handleNewBoard}
              className="inline-flex items-center gap-1.5 h-8 px-2.5 text-sm text-[var(--text-secondary)] bg-[var(--surface-card)] border-[0.5px] border-[var(--border-default)] rounded-lg hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] transition-all duration-75 cursor-pointer"
            >
              <Plus className="w-4 h-4 -ml-0.5" />
              New Board
            </button>
          </div>
          <div className="grid gap-3 w-full grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              {boardSummaries.slice(0, 3).map((board) => (
                <button
                  key={board.id}
                  onClick={() => { setActiveBoard(board.id); navigate('/boards') }}
                  className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-3xl p-5 shadow-sm text-left cursor-pointer hover:bg-[var(--surface-raised)] transition-colors"
                >
                  <div className="flex items-center gap-2 mb-2">
                    {board.icon ? (
                      <DynamicIcon name={board.icon} className="w-4 h-4 text-[var(--text-secondary)]" />
                    ) : (
                      <Kanban className="w-4 h-4 text-[var(--text-muted)]" />
                    )}
                    <span className="text-[13px] font-normal text-[var(--text-primary)] flex-1 truncate">{board.name}</span>
                    <span className="text-[11px] text-[var(--text-muted)]">{board.totalCards}</span>
                  </div>
                  {board.totalCards > 0 && (
                    <div className="h-1 rounded-full overflow-hidden flex bg-[var(--surface-hover)] mb-2">
                      {board.columns.map((col, i) =>
                        col.count > 0 ? (
                          <div key={col.id} className="h-full" style={{ width: `${(col.count / board.totalCards) * 100}%`, background: SEGMENT_COLORS[i % SEGMENT_COLORS.length] }} />
                        ) : null
                      )}
                    </div>
                  )}
                  {board.lastUpdated && (
                    <div className="text-[10px] font-mono text-[var(--text-faint)]">
                      {formatDistanceToNow(new Date(board.lastUpdated), { addSuffix: true })}
                    </div>
                  )}
                </button>
              ))}
          </div>
        </div>
      )}

      {/* Feature hints — always visible */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full mb-10">
        <div className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-3xl p-5 shadow-sm">
          <LayoutGrid className="w-5 h-5 text-[#A8BA32] mb-2" />
          <div className="text-[13px] font-semibold text-[var(--text-primary)] mb-0.5">Boards</div>
          <div className="text-[11px] text-[var(--text-muted)]">Organize tasks into columns</div>
        </div>
        <div className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-3xl p-5 shadow-sm">
          <Users className="w-5 h-5 text-[#D4A843] mb-2" />
          <div className="text-[13px] font-semibold text-[var(--text-primary)] mb-0.5">Collaborate</div>
          <div className="text-[11px] text-[var(--text-muted)]">Invite your team to boards</div>
        </div>
        <div className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-3xl p-5 shadow-sm">
          <BarChart3 className="w-5 h-5 text-[#C27A4A] mb-2" />
          <div className="text-[13px] font-semibold text-[var(--text-primary)] mb-0.5">Track</div>
          <div className="text-[11px] text-[var(--text-muted)]">Stats and streaks appear here</div>
        </div>
      </div>

      {/* Daily quote footer */}
      <div className="pt-4 border-t border-[var(--border-subtle)]">
        <span className="text-[12px] text-[var(--text-faint)] font-heading italic">
          "{quote.text}" — {quote.author}
        </span>
      </div>
    </div>
  )
}
