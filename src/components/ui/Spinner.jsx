import { CircleNotch } from '@phosphor-icons/react'

function mergeClassNames(...parts) {
  return parts.filter(Boolean).join(' ')
}

/**
 * Spinner — small animated loading indicator (Phosphor CircleNotch, spun).
 * Use for route-level / page-level loading fallbacks. Leave PlanCard's
 * inline CircleNotch and all Skeleton usages alone — this is for the
 * "waiting for the whole view" case.
 *
 * <Spinner />
 * <Spinner size={32} />
 */
export default function Spinner({ size = 20, className = '' }) {
  return (
    <CircleNotch
      size={size}
      weight="bold"
      aria-label="Loading"
      className={mergeClassNames('animate-spin text-[var(--text-muted)]', className)}
    />
  )
}
