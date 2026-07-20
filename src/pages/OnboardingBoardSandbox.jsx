import { CheckCircle, CalendarDot, ListChecks } from '@phosphor-icons/react'
import DynamicIcon from '../components/board/DynamicIcon'
import { ONBOARDING_BOARD } from '../data/onboardingBoard'

// Static visual preview of the onboarding board. Used to iterate on
// copy + structure before deciding how to instantiate it (seed-on-
// signup, an "Add tour board" button in Settings, etc.). Mirrors the
// real Card.jsx visual vocabulary so what you see here is what the
// user will actually get in their dashboard.

export default function OnboardingBoardSandbox() {
  const { name, icon, description, columns, labels } = ONBOARDING_BOARD

  return (
    <div className="min-h-screen bg-[var(--surface-page)]">
      <div className="max-w-[1200px] mx-auto px-6 py-10">
        {/* Board header — matches BoardsPage.jsx title scale */}
        <header className="mb-8 flex items-start gap-3">
          <div className="w-11 h-11 rounded-2xl bg-[var(--surface-card)] border border-[var(--color-sand)] flex items-center justify-center shrink-0">
            <DynamicIcon name={icon} className="w-5 h-5 text-[var(--text-primary)]" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="font-heading font-[425] text-3xl tracking-tight text-[var(--text-primary)] leading-tight">
              {name}
            </h1>
            <p className="mt-1 text-sm text-[var(--text-secondary)] max-w-2xl leading-relaxed">
              {description}
            </p>
          </div>
        </header>

        {/* Columns */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-start">
          {columns.map((col) => (
            <ColumnPreview key={col.id} column={col} labels={labels} />
          ))}
        </div>
      </div>
    </div>
  )
}

function ColumnPreview({ column, labels }) {
  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-center gap-2 px-1 pb-1">
        <h2 className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
          {column.title}
        </h2>
        <span className="text-[10px] text-[var(--text-faint)] bg-[var(--surface-raised)] rounded px-1.5 py-0.5 font-medium">
          {column.cards.length}
        </span>
      </div>
      <div className="flex flex-col gap-2">
        {column.cards.map((card) => (
          <CardPreview key={card.id} card={card} labels={labels} />
        ))}
      </div>
    </div>
  )
}

// Mirrors Card.jsx 1:1 for the parts we care about visually:
// icon tile, title row with priority CheckCircle, /label inline text,
// description, due-date pill, checklist count.
function CardPreview({ card, labels }) {
  const isDone = !!card.completed
  const priorityColor =
    isDone                       ? 'text-[var(--color-lime-dark)]'
    : card.priority === 'high'   ? 'text-[var(--color-copper)]'
    : card.priority === 'low'    ? 'text-[var(--color-lime-dark)]'
    : 'text-[var(--color-honey)]'

  const checklistDone = card.checklist?.filter((c) => c.completed).length || 0
  const checklistTotal = card.checklist?.length || 0
  const hasChecklist = checklistTotal > 0
  const checklistComplete = hasChecklist && checklistDone === checklistTotal

  return (
    <article
      className={`group rounded-xl border border-[var(--color-sand)] bg-[var(--surface-card)] p-3 shadow-[0_2px_8px_rgba(27,27,24,0.03)] hover:shadow-[0_4px_16px_rgba(27,27,24,0.06)] transition-shadow ${
        isDone ? 'opacity-75' : ''
      }`}
    >
      <div className="flex items-start gap-2.5 mb-2">
        <div className="w-7 h-7 rounded-lg bg-[var(--surface-raised)] border border-[var(--color-sand)] flex items-center justify-center shrink-0 mt-px">
          <DynamicIcon name={card.icon} className="w-3.5 h-3.5 text-[var(--text-primary)]" />
        </div>
        <h3
          className={`flex-1 text-sm font-semibold leading-snug min-w-0 ${
            isDone ? 'line-through text-[var(--text-muted)]' : 'text-[var(--text-primary)]'
          }`}
        >
          {card.title}
        </h3>
        <CheckCircle
          weight={isDone ? 'fill' : 'regular'}
          className={`w-4 h-4 shrink-0 ${priorityColor}`}
        />
      </div>

      {/* Labels — same /text inline style as Card.jsx */}
      {card.labels?.length > 0 && (
        <div className="flex items-center gap-1.5 text-xs mb-2 flex-wrap">
          {card.labels.map((lid) => {
            const l = labels[lid]
            return l ? (
              <span key={lid} className="font-medium text-[var(--text-secondary)] lowercase">
                /{l.text}
              </span>
            ) : null
          })}
        </div>
      )}

      {card.description && (
        <p className="text-xs text-[var(--text-muted)] leading-relaxed line-clamp-3">
          {card.description}
        </p>
      )}

      {(card.dueDate || hasChecklist) && (
        <div className="flex items-center gap-2 mt-2.5">
          {card.dueDate && (
            <span className="font-semibold flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] bg-[var(--color-lime-wash)] text-[var(--color-lime-dark)]">
              <CalendarDot size={12} weight="bold" />
              {card.dueDate}
            </span>
          )}
          {hasChecklist && (
            <span
              className={`text-[10px] font-medium flex items-center gap-1 px-2 py-0.5 rounded-full ${
                checklistComplete
                  ? 'bg-[var(--color-lime-wash)] text-[var(--color-lime-dark)]'
                  : 'bg-[var(--surface-raised)] text-[var(--text-muted)]'
              }`}
            >
              <ListChecks size={12} weight="bold" />
              {checklistDone}/{checklistTotal}
            </span>
          )}
        </div>
      )}
    </article>
  )
}
