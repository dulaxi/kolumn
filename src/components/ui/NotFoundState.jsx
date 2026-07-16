import { Link } from 'react-router-dom'
import PixelKlay from '../klay/PixelKlay'
import KolumnLogo from '../layout/KolumnLogo'
import Button from './Button'

/**
 * NotFoundState — the app's single "it isn't here" surface
 * (decision: docs/design-mockups/notfound-klay-decisions.html, 1B + 2B).
 *
 * Klay's `look` animation is the shared signal for lost things; scale is
 * the only difference between the full-page 404 (headline treatment) and
 * in-app dead ends (quiet treatment). Every instance MUST offer a way
 * out — the workspace state used to be a dead end with no action at all.
 *
 * <NotFoundState
 *   eyebrow="404"
 *   title="This page wandered off"
 *   body="Klay looked everywhere. The link may be old, or the page moved."
 *   actions={[{ label: 'Back to Dashboard', to: '/dashboard' },
 *             { label: 'Go to Boards', to: '/boards', variant: 'ghost' }]}
 * />
 */
export default function NotFoundState({
  eyebrow,
  title,
  body,
  actions = [],
  klayScale = 5,
  size = 'inline',
  logo = false,
  className = '',
}) {
  const isPage = size === 'page'
  return (
    <div className={`flex flex-col items-center justify-center text-center px-6 ${className}`}>
      {/* Standalone pages (the 404) render outside the app chrome, so the
          logo has to come along — in-app states already sit under it. */}
      {logo && (
        <span className="flex items-center gap-2 mb-8">
          <KolumnLogo size={26} />
          <span className="text-[20px] font-[450] text-[var(--text-primary)] tracking-tight leading-none font-logo">
            Kolumn
          </span>
        </span>
      )}

      <PixelKlay animation="look" scale={klayScale} label="Klay looking around" />

      {eyebrow && (
        <span className="font-mono text-xs tracking-[0.14em] text-[var(--text-muted)] mt-4">
          {eyebrow}
        </span>
      )}

      <h1
        className={
          isPage
            ? 'font-heading text-[26px] font-normal text-[var(--text-primary)] mt-1.5 mb-1.5'
            : 'text-[15px] font-medium text-[var(--text-primary)] mt-2.5 mb-1'
        }
      >
        {title}
      </h1>

      {body && (
        <p
          className={`text-[var(--text-muted)] text-balance ${
            isPage ? 'text-sm mb-6 max-w-xl' : 'text-[13px] mb-3.5 max-w-sm'
          }`}
        >
          {body}
        </p>
      )}

      {actions.length > 0 && (
        <div className="flex flex-wrap items-center justify-center gap-2">
          {actions.map(({ label, to, variant = 'primary' }) => (
            <Button
              key={label}
              asChild
              variant={variant}
              size={isPage ? 'md' : 'sm'}
            >
              <Link to={to}>{label}</Link>
            </Button>
          ))}
        </div>
      )}
    </div>
  )
}
