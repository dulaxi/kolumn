export default function AICardSkeleton() {
  return (
    <div className="w-full flex flex-col gap-3 rounded-2xl border p-4 text-left shadow-sm bg-[var(--surface-card)] border-[var(--color-mist)]">
      {/* Top row: icon + title skeleton */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 shrink-0 rounded-lg ai-skeleton-block" />
        <div className="flex-1 flex flex-col gap-1.5">
          <div className="h-4 w-3/4 ai-skeleton-block" />
          <div className="h-3 w-1/3 ai-skeleton-block" />
        </div>
      </div>
      {/* Description skeleton */}
      <div className="flex flex-col gap-1.5">
        <div className="h-3 w-full ai-skeleton-block" />
        <div className="h-3 w-2/3 ai-skeleton-block" />
      </div>
      {/* Bottom row skeleton */}
      <div className="flex items-center gap-2">
        <div className="h-5 w-16 rounded-full ai-skeleton-block" />
        <div className="h-5 w-12 rounded-full ai-skeleton-block" />
      </div>
    </div>
  )
}
