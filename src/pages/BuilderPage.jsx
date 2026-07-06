import { Blueprint, CaretDown, MagnifyingGlass, Plus } from '@phosphor-icons/react'
import EmptyState from '../components/ui/EmptyState'
import Button from '../components/ui/Button'

export default function BuilderPage() {
  return (
    <div className="w-full py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-heading text-3xl tracking-tight text-[var(--text-primary)]">Builder</h1>
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="secondary" size="sm">
            Sort by Activity
            <CaretDown className="w-3 h-3 opacity-60" weight="bold" />
          </Button>
          <Button variant="accent" size="sm">
            <Plus className="w-4 h-4" />
            New build
          </Button>
        </div>
      </div>

      <div className="relative mb-4">
        <MagnifyingGlass size={16} weight="regular" className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
        <input
          type="text"
          placeholder="Search builds..."
          aria-label="Search builds"
          disabled
          className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border-[0.5px] border-[var(--border-default)] bg-[var(--surface-page)] focus:outline-none focus:border-[var(--text-primary)] placeholder:text-[var(--text-faint)] transition-colors disabled:cursor-default"
        />
      </div>

      <EmptyState
        icon={Blueprint}
        title="Looking to build a board?"
        body="Describe what you want to track and we'll set up columns, labels, and starter cards."
        action={
          <Button variant="accent" size="sm">
            <Plus className="w-4 h-4" />
            New build
          </Button>
        }
      />
    </div>
  )
}
