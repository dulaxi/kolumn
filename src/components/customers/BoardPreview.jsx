// Static mini-board illustration drawn from a story's `boardPreview` data
// (columns + a few card titles each). No dnd-kit, nothing interactive —
// stands in for the customer logo the source page would show, since
// Kolumn's scenarios have no logo to render. Card slabs mirror
// src/components/board/Card.jsx's rounded-2xl / 1px-border language at a
// smaller scale so the preview still reads as "the app."
export default function BoardPreview({ columns, size = 'sm' }) {
  const compact = size === 'sm'
  return (
    <div className={`flex gap-2 overflow-x-auto ${compact ? 'p-3' : 'p-5'}`}>
      {columns.map((col) => (
        <div key={col.title} className={`flex flex-col gap-1.5 shrink-0 ${compact ? 'w-24' : 'w-40'}`}>
          <p className={`font-mono uppercase tracking-wide text-[var(--text-muted)] truncate ${compact ? 'text-[9px]' : 'text-[11px]'}`}>
            {col.title}
          </p>
          <div className="flex flex-col gap-1.5">
            {col.cards.map((card) => (
              <div
                key={card}
                className={`bg-[var(--surface-card)] border border-[var(--border-default)] rounded-lg ${compact ? 'h-5 px-1.5' : 'h-8 px-2.5 flex items-center'}`}
              >
                {!compact && (
                  <span className="text-[11px] text-[var(--text-secondary)] truncate">{card}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
