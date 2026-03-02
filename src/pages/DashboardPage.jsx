import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useBoardStore } from '../store/boardStore'
import { useAuthStore } from '../store/authStore'
import { isToday, isPast, parseISO, format, formatDistanceToNow } from 'date-fns'
import { ArrowRight, CheckCircle2, Plus } from 'lucide-react'
import DynamicIcon from '../components/board/DynamicIcon'

const LABEL_BG = {
  red: 'bg-[#FFE0DB] text-[#CF222E]',
  blue: 'bg-[#DAF0FF] text-[#3094FF]',
  green: 'bg-[#D1FDE0] text-[#08872B]',
  yellow: 'bg-[#FFF4D4] text-[#9A6700]',
  purple: 'bg-[#EDD8FD] text-[#8534F3]',
  pink: 'bg-[#FFD6EA] text-[#BF3989]',
  gray: 'bg-[#E4EBE6] text-[#909692]',
}

const PRIORITY_DOT = {
  low: 'bg-emerald-400',
  medium: 'bg-amber-400',
  high: 'bg-rose-400',
}

const SEGMENT_COLORS = [
  'bg-blue-400',
  'bg-amber-400',
  'bg-emerald-400',
  'bg-purple-400',
  'bg-rose-400',
  'bg-teal-400',
  'bg-pink-400',
  'bg-orange-400',
]

function getGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

/* ------------------------------------------------------------------ */
/*  TaskRow                                                            */
/* ------------------------------------------------------------------ */
function TaskRow({ card, boardName, isOverdue, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 bg-white rounded-xl border shadow-sm px-4 py-3 text-left cursor-pointer hover:shadow-md transition-shadow ${
        isOverdue ? 'border-red-200/80' : 'border-gray-200/80'
      }`}
    >
      {/* Priority dot */}
      <span
        className={`w-2 h-2 rounded-full shrink-0 ${
          PRIORITY_DOT[card.priority] || PRIORITY_DOT.medium
        }`}
      />

      {/* Task number */}
      <span className="text-[11px] font-mono font-medium text-gray-400 shrink-0">
        #GB-{card.global_task_number || card.task_number}
      </span>

      {/* Title */}
      <span className="text-sm font-medium text-gray-900 flex-1 truncate">
        {card.title}
      </span>

      {/* Labels (hidden on mobile, max 2) */}
      <div className="hidden sm:flex items-center gap-1 shrink-0">
        {(card.labels || []).slice(0, 2).map((label) => (
          <span
            key={label}
            className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
              LABEL_BG[label] || LABEL_BG.gray
            }`}
          >
            {label}
          </span>
        ))}
      </div>

      {/* Board name pill (hidden on mobile) */}
      {boardName && (
        <span className="hidden sm:inline-block text-[10px] font-medium text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full shrink-0">
          {boardName}
        </span>
      )}

      <ArrowRight className="w-3.5 h-3.5 text-gray-300 shrink-0" />
    </button>
  )
}

/* ------------------------------------------------------------------ */
/*  DashboardPage                                                      */
/* ------------------------------------------------------------------ */
export default function DashboardPage() {
  const navigate = useNavigate()
  const boards = useBoardStore((s) => s.boards)
  const columns = useBoardStore((s) => s.columns)
  const cards = useBoardStore((s) => s.cards)
  const loading = useBoardStore((s) => s.loading)
  const setActiveBoard = useBoardStore((s) => s.setActiveBoard)
  const addBoard = useBoardStore((s) => s.addBoard)
  const profile = useAuthStore((s) => s.profile)

  const displayName = profile?.display_name || 'there'

  // ---- Computed data ------------------------------------------------
  const {
    dueToday,
    overdue,
    inProgress,
    completed,
    dueTodayCards,
    overdueCards,
  } = useMemo(() => {
    const allCards = Object.values(cards)
    const allColumns = Object.values(columns)

    const doneColumnIds = new Set(
      allColumns
        .filter((col) => col.title.toLowerCase() === 'done')
        .map((col) => col.id)
    )
    const inProgressColumnIds = new Set(
      allColumns
        .filter((col) => col.title.toLowerCase() === 'in progress')
        .map((col) => col.id)
    )

    let dueTodayCount = 0
    let overdueCount = 0
    let inProgressCount = 0
    let completedCount = 0
    const dueTodayArr = []
    const overdueArr = []

    for (const card of allCards) {
      const isDone = doneColumnIds.has(card.column_id)

      if (isDone) {
        completedCount++
        continue
      }

      if (inProgressColumnIds.has(card.column_id)) {
        inProgressCount++
      }

      if (card.due_date) {
        const due = parseISO(card.due_date)
        if (isToday(due)) {
          dueTodayCount++
          dueTodayArr.push(card)
        } else if (isPast(due)) {
          overdueCount++
          overdueArr.push(card)
        }
      }
    }

    return {
      dueToday: dueTodayCount,
      overdue: overdueCount,
      inProgress: inProgressCount,
      completed: completedCount,
      dueTodayCards: dueTodayArr,
      overdueCards: overdueArr,
    }
  }, [cards, columns])

  const boardSummaries = useMemo(() => {
    const allBoards = Object.values(boards)
    return allBoards.map((board) => {
      const boardCols = Object.values(columns)
        .filter((c) => c.board_id === board.id)
        .sort((a, b) => a.position - b.position)
      const boardCards = Object.values(cards).filter(
        (c) => c.board_id === board.id
      )
      const totalCards = boardCards.length

      // Per-column card counts
      const colCounts = boardCols.map((col) => ({
        id: col.id,
        title: col.title,
        count: boardCards.filter((c) => c.column_id === col.id).length,
      }))

      // Last activity
      const lastUpdated = boardCards.reduce((latest, c) => {
        const ts = c.updated_at ? new Date(c.updated_at).getTime() : 0
        return ts > latest ? ts : latest
      }, 0)

      return {
        ...board,
        columns: colCounts,
        totalCards,
        lastUpdated: lastUpdated || null,
      }
    })
  }, [boards, columns, cards])

  // ---- Helpers -------------------------------------------------------
  function navigateToCard(card) {
    setActiveBoard(card.board_id)
    navigate('/boards')
  }

  function getBoardName(boardId) {
    return boards[boardId]?.name || ''
  }

  async function handleNewBoard() {
    const id = await addBoard('New Board')
    if (id) {
      setActiveBoard(id)
      navigate('/boards')
    }
  }

  // ---- Loading state ------------------------------------------------
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400 text-sm">
        Loading...
      </div>
    )
  }

  // ---- Render -------------------------------------------------------
  const hasFocusCards = dueToday > 0 || overdue > 0

  return (
    <div className="max-w-4xl mx-auto">
      {/* 1. Greeting Banner */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          {getGreeting()},{' '}
          <span className="bg-gradient-to-r from-[#103783] to-[#9BAFD9] bg-clip-text text-transparent">
            {displayName}
          </span>
        </h1>
        <p className="text-sm text-gray-400 mt-1">
          {format(new Date(), 'EEEE, MMMM d')}
        </p>

        {/* Summary pill */}
        {hasFocusCards && (
          <span className="inline-flex items-center gap-2 mt-3 px-3 py-1.5 rounded-full bg-white border border-gray-200 shadow-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs text-gray-600">
              {dueToday > 0 && (
                <>
                  <span className="font-medium">{dueToday}</span> due today
                </>
              )}
              {dueToday > 0 && overdue > 0 && <span className="mx-1">&middot;</span>}
              {overdue > 0 && (
                <>
                  <span className="font-medium text-red-500">{overdue}</span>{' '}
                  <span className="text-red-500">overdue</span>
                </>
              )}
            </span>
          </span>
        )}
      </div>

      {/* 2. Stat tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-10">
        {[
          { label: 'Due Today', value: dueToday, color: 'text-gray-900' },
          { label: 'Overdue', value: overdue, color: overdue > 0 ? 'text-red-600' : 'text-gray-900' },
          { label: 'In Progress', value: inProgress, color: 'text-gray-900' },
          { label: 'Completed', value: completed, color: 'text-gray-900' },
        ].map((stat) => (
          <div key={stat.label} className="bg-white rounded-xl border border-gray-200/80 px-4 py-3">
            <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wide">{stat.label}</p>
            <p className={`text-2xl font-bold mt-0.5 ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* 3. Focus Cards - Due Today */}
      {dueTodayCards.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-3">
            <h2 className="text-sm font-semibold text-gray-900">Due Today</h2>
            <span className="text-[10px] font-semibold bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">
              {dueTodayCards.length}
            </span>
          </div>
          <div className="space-y-2">
            {dueTodayCards.map((card) => (
              <TaskRow
                key={card.id}
                card={card}
                boardName={getBoardName(card.board_id)}
                isOverdue={false}
                onClick={() => navigateToCard(card)}
              />
            ))}
          </div>
        </div>
      )}

      {/* 4. Focus Cards - Overdue */}
      {overdueCards.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-3">
            <h2 className="text-sm font-semibold text-red-500">Overdue</h2>
            <span className="text-[10px] font-semibold bg-red-50 text-red-500 px-1.5 py-0.5 rounded-full">
              {overdueCards.length}
            </span>
          </div>
          <div className="space-y-2">
            {overdueCards.map((card) => (
              <TaskRow
                key={card.id}
                card={card}
                boardName={getBoardName(card.board_id)}
                isOverdue
                onClick={() => navigateToCard(card)}
              />
            ))}
          </div>
        </div>
      )}

      {/* 5. Empty state */}
      {!hasFocusCards && (
        <div className="flex items-center justify-center gap-2 mb-10 py-6 text-gray-400 text-sm">
          <CheckCircle2 className="w-4 h-4" />
          <span>Nothing due today &mdash; you&rsquo;re all clear</span>
        </div>
      )}

      {/* 6. Board Summary Grid */}
      <div className="mb-10">
        <h2 className="text-sm font-semibold text-gray-900 mb-4">Your Boards</h2>

        {boardSummaries.length === 0 ? (
          <div className="text-center py-10">
            <p className="text-gray-400 text-sm mb-4">
              Create your first board to get started
            </p>
            <button
              onClick={handleNewBoard}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              New Board
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {boardSummaries.map((board) => (
              <button
                key={board.id}
                onClick={() => {
                  setActiveBoard(board.id)
                  navigate('/boards')
                }}
                className="bg-white rounded-2xl border border-gray-200/80 shadow-sm p-4 text-left cursor-pointer hover:shadow-md transition-shadow"
              >
                {/* Board header */}
                <div className="flex items-center gap-2.5 mb-3">
                  <span className="text-lg shrink-0">
                    {board.icon ? (
                      <DynamicIcon name={board.icon} className="w-5 h-5 text-gray-600" />
                    ) : (
                      <span>&#128203;</span>
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-gray-900 truncate">
                      {board.name}
                    </p>
                    <p className="text-[11px] text-gray-400">
                      {board.totalCards} task{board.totalCards !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>

                {/* Progress bar */}
                {board.totalCards > 0 && (
                  <div className="h-1.5 rounded-full overflow-hidden bg-gray-100 flex mb-2">
                    {board.columns.map((col, i) =>
                      col.count > 0 ? (
                        <div
                          key={col.id}
                          className={`${SEGMENT_COLORS[i % SEGMENT_COLORS.length]}`}
                          style={{
                            width: `${(col.count / board.totalCards) * 100}%`,
                          }}
                        />
                      ) : null
                    )}
                  </div>
                )}

                {/* Column labels with dots */}
                {board.columns.length > 0 && (
                  <div className="flex flex-wrap gap-x-3 gap-y-1 mb-2">
                    {board.columns.map((col, i) => (
                      <span
                        key={col.id}
                        className="flex items-center gap-1 text-[10px] text-gray-400"
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            SEGMENT_COLORS[i % SEGMENT_COLORS.length]
                          }`}
                        />
                        {col.title}
                      </span>
                    ))}
                  </div>
                )}

                {/* Updated ago */}
                {board.lastUpdated && (
                  <p className="text-[10px] text-gray-300">
                    Updated{' '}
                    {formatDistanceToNow(new Date(board.lastUpdated), {
                      addSuffix: true,
                    })}
                  </p>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
