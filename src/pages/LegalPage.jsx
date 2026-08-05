import { Link } from 'react-router-dom'
import KolumnLockup from '../components/layout/KolumnLockup'

// Shell for static legal pages (/terms, /privacy). Public, light-only
// like the landing page. Content is written to be protective but plain;
// not a substitute for counsel review.
export default function LegalPage({ title, updated, children }) {
  return (
    <div className="min-h-screen bg-[var(--surface-page)]">
      <div className="max-w-2xl mx-auto px-6 py-14">
        <Link to="/" className="inline-flex mb-10">
          <KolumnLockup text={18} />
        </Link>
        <h1 className="text-[32px] font-light font-logo tracking-tight leading-[1.15] text-[var(--text-primary)] mb-1">{title}</h1>
        <p className="text-xs font-mono text-[var(--text-muted)] mb-10">Last updated {updated}</p>
        <div className="space-y-8 text-sm leading-relaxed text-[var(--text-secondary)] [&_h2]:text-base [&_h2]:font-semibold [&_h2]:text-[var(--text-primary)] [&_h2]:mb-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1">
          {children}
        </div>
      </div>
    </div>
  )
}
