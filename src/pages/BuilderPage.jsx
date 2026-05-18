import { Blueprint } from '@phosphor-icons/react'

export default function BuilderPage() {
  return (
    <div className="flex flex-col items-center justify-center h-full px-6">
      <div className="flex flex-col items-center text-center bg-[var(--surface-card)] border border-[var(--border-default)] rounded-[12px] px-8 py-10 max-w-[360px]">
        <Blueprint className="w-8 h-8 text-[var(--text-muted)]" weight="light" />
        <h1 className="mt-4 text-base font-medium text-[var(--text-primary)]">
          Builder is coming soon.
        </h1>
        <p className="mt-2 text-sm text-[var(--text-muted)]">
          AI-generated boards will live here.
        </p>
      </div>
    </div>
  )
}
