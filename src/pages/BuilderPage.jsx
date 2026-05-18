import { Blueprint, CaretDown, MagnifyingGlass } from '@phosphor-icons/react'
import Button from '../components/ui/Button'

export default function BuilderPage() {
  return (
    <div className="flex flex-col w-full">
      <header className="sticky top-0 z-10 bg-[var(--surface-page)] flex items-end h-12 md:h-24 w-full md:pb-6">
        <div className="flex w-full items-center justify-between gap-4">
          <h1 className="font-heading text-2xl text-[var(--text-primary)] truncate">
            Builder
          </h1>
          <div className="flex items-center gap-2 shrink-0">
            <Button variant="ghost" size="md">
              <span className="inline-flex items-center gap-1.5">
                Sort by Activity
                <CaretDown className="w-3 h-3 opacity-60" weight="bold" />
              </span>
            </Button>
            <Button variant="primary" size="md">
              New build
            </Button>
          </div>
        </div>
      </header>

      <div className="pt-4 lg:pt-6 pb-2">
        <div className="flex items-center h-10 px-3 gap-2 rounded-lg bg-[var(--surface-raised)] border border-[var(--border-default)]">
          <MagnifyingGlass className="w-4 h-4 text-[var(--text-muted)] shrink-0" weight="light" />
          <input
            type="text"
            placeholder="Search builds..."
            disabled
            className="flex-1 min-w-0 bg-transparent border-none focus:outline-none text-sm placeholder-[var(--text-muted)] text-[var(--text-primary)] disabled:cursor-default"
          />
        </div>
      </div>

      <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
        <Blueprint className="w-24 h-24 text-[var(--text-muted)]" weight="light" />
        <h3 className="mt-2 text-base font-medium text-[var(--text-secondary)]">
          Looking to build a board?
        </h3>
        <p className="max-w-sm text-xs text-[var(--text-muted)]">
          Describe what you want to track and we&apos;ll set up columns, labels, and starter cards.
        </p>
        <Button variant="secondary" size="md" className="mt-2">
          New build
        </Button>
      </div>
    </div>
  )
}
