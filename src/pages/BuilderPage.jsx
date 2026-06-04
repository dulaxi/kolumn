import { Blueprint, CaretDown, MagnifyingGlass, Plus } from '@phosphor-icons/react'

export default function BuilderPage() {
  return (
    <div className="w-full py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-heading text-3xl tracking-tight text-[var(--text-primary)]">Builder</h1>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            className="inline-flex items-center gap-1.5 h-8 px-3 text-sm text-[var(--text-secondary)] border-[0.5px] border-[var(--border-default)] rounded-lg hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] transition-all cursor-pointer"
          >
            Sort by Activity
            <CaretDown className="w-3 h-3 opacity-60" weight="bold" />
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-1.5 h-8 px-3 text-sm text-[var(--text-secondary)] border-[0.5px] border-[var(--border-default)] rounded-lg hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            New build
          </button>
        </div>
      </div>

      <div className="relative mb-4">
        <MagnifyingGlass size={16} weight="regular" className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
        <input
          type="text"
          placeholder="Search builds..."
          disabled
          className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border-[0.5px] border-[var(--border-default)] bg-[var(--surface-page)] focus:outline-none focus:border-[var(--text-primary)] placeholder:text-[var(--text-faint)] transition-colors disabled:cursor-default"
        />
      </div>

      <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
        <Blueprint className="w-24 h-24 text-[var(--text-muted)]" weight="light" />
        <h3 className="mt-2 text-base font-medium text-[var(--text-secondary)]">
          Looking to build a board?
        </h3>
        <p className="max-w-sm text-xs text-[var(--text-muted)]">
          Describe what you want to track and we&apos;ll set up columns, labels, and starter cards.
        </p>
        <button
          type="button"
          className="mt-2 inline-flex items-center gap-1.5 h-8 px-3 text-sm text-[var(--text-secondary)] border-[0.5px] border-[var(--border-default)] rounded-lg hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          New build
        </button>
      </div>
    </div>
  )
}
