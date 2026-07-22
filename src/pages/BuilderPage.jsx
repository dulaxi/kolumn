import { CaretDown, MagnifyingGlass } from '@phosphor-icons/react'
import EmptyState from '../components/ui/EmptyState'
import { PageHeader } from '../components/layout/headerSlot'
import { TOOLBAR_BTN, TOOLBAR_BTN_FILL, TOOLBAR_BTN_FILL_PRIMARY } from '../constants/buttonStyles'

export default function BuilderPage() {
  return (
    <div className="w-full py-6">
      {/* Header — desktop: portaled into the 64px bar; mobile: inline here */}
      <PageHeader align="narrow">
        <h1 className="font-heading font-[425] text-3xl tracking-tight text-[var(--text-primary)]">Builder</h1>
        <div className="flex items-center gap-2 shrink-0">
          <button type="button" className={`${TOOLBAR_BTN} ${TOOLBAR_BTN_FILL}`}>
            Sort by Activity
            <CaretDown className="w-3 h-3 opacity-60" weight="bold" />
          </button>
          <button type="button" className={`${TOOLBAR_BTN} ${TOOLBAR_BTN_FILL_PRIMARY}`}>
            New build
          </button>
        </div>
      </PageHeader>

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
        klay="blueprint"
        klayLabel="Klay drafting a board"
        title="Looking to build a board?"
        body="Describe what you want to track and we'll set up columns, labels, and starter cards."
        action={
          <button type="button" className={`${TOOLBAR_BTN} ${TOOLBAR_BTN_FILL_PRIMARY}`}>
            New build
          </button>
        }
      />
    </div>
  )
}
