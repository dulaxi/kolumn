// Visible "Scenario" label — required on every customer-story surface
// (hub tile, featured card, story hero) because Kolumn has no real
// customers yet and none of these stories may read as a genuine
// testimonial. `kind: 'customer'` is reserved for the day a real story
// exists; it renders "Customer story" instead, on a neutral surface
// instead of the lime wash.
export default function ScenarioTag({ kind = 'scenario', persona, className = '' }) {
  const isScenario = kind !== 'customer'
  return (
    <span
      className={`font-mono text-xs inline-flex items-center gap-1.5 h-7 px-2.5 rounded-full border ${
        isScenario
          ? 'border-[var(--color-lime-dark)]/30 bg-[var(--accent-lime-wash)] text-[var(--accent-lime-dark)]'
          : 'border-[var(--border-default)] bg-[var(--surface-raised)] text-[var(--text-secondary)]'
      } ${className}`}
    >
      {isScenario ? 'Scenario' : 'Customer story'}
      {persona && <span className="text-[var(--text-muted)]">· {persona}</span>}
    </span>
  )
}
