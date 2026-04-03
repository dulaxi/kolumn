import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useBoardStore } from '../store/boardStore'
import { useAuthStore } from '../store/authStore'
import { format, formatDistanceToNow } from 'date-fns'
import { Plus, Target, LayoutGrid, Users, BarChart3 } from 'lucide-react'
import DynamicIcon from '../components/board/DynamicIcon'
import { getGreeting } from '../utils/formatting'
import { computeBoardSummaries } from '../utils/cardStats'

const QUOTES = [
  { text: "The secret of getting ahead is getting started.", author: "Mark Twain" },
  { text: "It does not matter how slowly you go as long as you do not stop.", author: "Confucius" },
  { text: "Small deeds done are better than great deeds planned.", author: "Peter Marshall" },
  { text: "Focus on being productive instead of busy.", author: "Tim Ferriss" },
  { text: "The way to get started is to quit talking and begin doing.", author: "Walt Disney" },
  { text: "You don't have to see the whole staircase, just take the first step.", author: "Martin Luther King Jr." },
]

const SEGMENT_COLORS = ['#d2d6c5', '#a4b55b', '#8BA32E', '#7A5C44', '#5C5C57', '#3c402b', '#1B1B18']

function getDailyIndex(arr) {
  const day = Math.floor(Date.now() / 86400000)
  return day % arr.length
}

export default function DashboardPage() {
  const navigate = useNavigate()
  const boards = useBoardStore((s) => s.boards)
  const columns = useBoardStore((s) => s.columns)
  const cards = useBoardStore((s) => s.cards)
  const loading = useBoardStore((s) => s.loading)
  const setActiveBoard = useBoardStore((s) => s.setActiveBoard)
  const addBoard = useBoardStore((s) => s.addBoard)
  const profile = useAuthStore((s) => s.profile)

  const [creatingBoard, setCreatingBoard] = useState(false)
  const displayName = profile?.display_name || 'there'

  const boardSummaries = useMemo(
    () => computeBoardSummaries(boards, columns, cards, profile?.display_name),
    [boards, columns, cards, profile]
  )


  const quote = QUOTES[getDailyIndex(QUOTES)]
  const boardCount = Object.keys(boards).length

  async function handleNewBoard() {
    if (creatingBoard) return
    setCreatingBoard(true)
    try {
      const id = await addBoard('New Board')
      if (id) {
        setActiveBoard(id)
        navigate('/boards')
      }
    } finally {
      setCreatingBoard(false)
    }
  }

  return (
    <div className="w-full flex flex-col overflow-hidden" style={{ height: 'calc(100vh - 7rem)' }}>
      {/* ─── Content ─── */}
      <div className="flex-1 flex flex-col items-center justify-center">
        {/* Header — centered */}
        <div className="text-center mb-6">
          <div className="text-[11px] tracking-[1.5px] uppercase text-[#8E8E89] mb-1">
            {format(new Date(), 'EEEE, MMMM d')}
          </div>
          <h1 className="text-[26px] sm:text-[30px] font-bold text-[#1B1B18] leading-tight">
            <span className="font-logo">{boardCount === 0 ? 'Welcome' : getGreeting()},</span> <span className="text-[#A8BA32] font-heading">{displayName}</span>
          </h1>
          <p className="text-[14px] text-[#5C5C57] font-heading italic mt-0.5">
            {boardCount === 0 ? "Let's get you set up." : 'Here\u2019s your home base.'}
          </p>
        </div>
        {boardCount === 0 ? (
          <>
            <div className="w-14 h-14 rounded-2xl bg-[#EEF2D6] flex items-center justify-center mb-5">
              <Target className="w-7 h-7 text-[#A8BA32]" />
            </div>
            <h2 className="text-lg font-bold text-[#1B1B18] mb-1.5 font-logo">Your dashboard lives here</h2>
            <p className="text-sm text-[#8E8E89] text-center max-w-sm mb-6">
              Stats, calendar, timeline, and activity will fill in as you create boards and complete tasks.
            </p>
            <button
              onClick={handleNewBoard}
              disabled={creatingBoard}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#1B1B18] text-white text-sm font-medium rounded-xl hover:bg-[#333] transition-colors cursor-pointer disabled:opacity-50"
            >
              <Plus className="w-4 h-4" />
              {creatingBoard ? 'Creating...' : 'Create your first board'}
            </button>
          </>
        ) : (
          <>
            <h2 className="text-lg font-bold text-[#1B1B18] mb-1.5 font-logo">Your boards</h2>
            <p className="text-sm text-[#8E8E89] text-center max-w-sm mb-6">
              Jump into a board, or create a new one.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-lg w-full mb-6">
              {boardSummaries.map((board) => (
                <button
                  key={board.id}
                  onClick={() => { setActiveBoard(board.id); navigate('/boards') }}
                  className="bg-white border border-[#E0DBD5] rounded-xl p-4 text-left cursor-pointer hover:shadow-sm hover:border-[#C4BFB8] transition-all"
                >
                  <div className="flex items-center gap-2 mb-2">
                    {board.icon && <DynamicIcon name={board.icon} className="w-[18px] h-[18px] text-[#5C5C57]" />}
                    <span className="text-[13px] font-bold text-[#1B1B18] flex-1 truncate">{board.name}</span>
                    <span className="text-[11px] text-[#8E8E89]">{board.totalCards}</span>
                  </div>
                  {board.totalCards > 0 && (
                    <div className="h-1 rounded-full overflow-hidden flex bg-[#E8E2DB] mb-2">
                      {board.columns.map((col, i) =>
                        col.count > 0 ? (
                          <div key={col.id} className="h-full" style={{ width: `${(col.count / board.totalCards) * 100}%`, background: SEGMENT_COLORS[i % SEGMENT_COLORS.length] }} />
                        ) : null
                      )}
                    </div>
                  )}
                  {board.lastUpdated && (
                    <div className="text-[10px] font-mono text-[#C4BFB8]">
                      {formatDistanceToNow(new Date(board.lastUpdated), { addSuffix: true })}
                    </div>
                  )}
                </button>
              ))}
            </div>
            <button
              onClick={handleNewBoard}
              disabled={creatingBoard}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-[#5C5C57] bg-white border border-[#E0DBD5] rounded-xl hover:border-[#C4BFB8] transition-colors cursor-pointer disabled:opacity-50"
            >
              <Plus className="w-4 h-4" />
              {creatingBoard ? 'Creating...' : 'New Board'}
            </button>
          </>
        )}

        {/* Feature hints — always visible */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-10 max-w-lg w-full">
          <div className="bg-white border border-[#E0DBD5] rounded-xl p-4 text-center">
            <LayoutGrid className="w-5 h-5 text-[#A8BA32] mx-auto mb-2" />
            <div className="text-[12px] font-semibold text-[#1B1B18] mb-0.5">Boards</div>
            <div className="text-[11px] text-[#8E8E89]">Organize tasks into columns</div>
          </div>
          <div className="bg-white border border-[#E0DBD5] rounded-xl p-4 text-center">
            <Users className="w-5 h-5 text-[#D4A843] mx-auto mb-2" />
            <div className="text-[12px] font-semibold text-[#1B1B18] mb-0.5">Collaborate</div>
            <div className="text-[11px] text-[#8E8E89]">Invite your team to boards</div>
          </div>
          <div className="bg-white border border-[#E0DBD5] rounded-xl p-4 text-center">
            <BarChart3 className="w-5 h-5 text-[#C27A4A] mx-auto mb-2" />
            <div className="text-[12px] font-semibold text-[#1B1B18] mb-0.5">Track</div>
            <div className="text-[11px] text-[#8E8E89]">Stats and streaks appear here</div>
          </div>
        </div>
      </div>

      {/* ─── Footer ─── */}
      <div className="flex items-center justify-center pt-3 border-t border-[#E8E2DB] shrink-0">
        <span className="text-[12px] text-[#C4BFB8] font-heading italic">
          "{quote.text}" — {quote.author}
        </span>
      </div>
    </div>
  )
}
