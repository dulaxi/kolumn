import Skeleton from '../ui/Skeleton'

// First-load ghost board — shown by BoardsPage while boardStore.loading
// is true (the initial fetch), instead of flashing the "Create your
// first board" empty state at users who have boards.
//
// Geometry mirrors the real board so nothing jumps when data lands:
// container matches BoardView's column row, column width matches
// Column.jsx, card ghosts use the kanban 16px radius exception.
export default function BoardSkeleton() {
  return (
    <div aria-hidden="true" className="flex gap-3 sm:gap-5 overflow-x-hidden h-full">
      {GHOST_COLUMNS.map((col, i) => (
        <div key={i} className="flex flex-col gap-2.5 w-[calc(100vw-3.5rem)] sm:w-[260px] lg:w-[290px] shrink-0">
          <Skeleton variant="line" width={col.title} className="mb-1" />
          {col.cards.map((cardHeight, j) => (
            <Skeleton key={j} variant="block" height={cardHeight} className="w-full" style={{ borderRadius: 16 }} />
          ))}
        </div>
      ))}
    </div>
  )
}

// Mirrors the "Welcome to Kolumn" tour board (src/data/onboardingBoard.js)
// — the board most first-loads resolve into. Column title widths track the
// real labels (To do / In progress / Done); card heights track real card
// anatomy: ~112px for icon+title+description, ~148px when a meta pill row
// (due date, checklist) is present.
const GHOST_COLUMNS = [
  { title: 44, cards: [148, 148, 148, 122] }, // To do
  { title: 80, cards: [136, 136] },           // In progress
  { title: 44, cards: [122, 158, 122] },      // Done
]
