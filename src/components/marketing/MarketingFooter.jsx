import { Link } from 'react-router-dom'
import KolumnLockup from '../layout/KolumnLockup'
import { CONTACT_EMAIL, FOOTER_GROUPS, FOOTER_TAGLINE } from '../../content/marketing-nav'

// Chrome spec §3.2: ink footer, 80/48 padding, brand column (4/12) + link
// groups (2/12 each), mono 11px group headings, 13px links at 27px pitch,
// hairline bottom row. Light-on-ink colors use the theme-stable
// --text-on-ink / --border-on-ink tokens. No social row yet (handles are an
// open question); no theme control (marketing routes are light-only).

const CONTAINER = 'max-w-[90rem] mx-auto'
const CONTAINER_STYLE = { width: 'calc(100% - (2 * clamp(2rem, 1.43rem + 2.86vw, 4rem)))' }

function FooterLink({ link }) {
  const className = 'inline-block py-1 text-[13px] leading-[19px] text-[var(--text-on-ink)] hover:underline underline-offset-[3px] decoration-[var(--text-on-ink-muted)]'
  if (link.to.startsWith('/#') || link.to.startsWith('mailto:')) {
    return <a href={link.to} className={className}>{link.label}</a>
  }
  return <Link to={link.to} className={className}>{link.label}</Link>
}

export default function MarketingFooter() {
  return (
    <footer className="bg-[var(--color-ink)] pt-14 pb-10 sm:pt-20 sm:pb-12">
      <div className={CONTAINER} style={CONTAINER_STYLE}>
        <div className="grid grid-cols-2 gap-x-8 gap-y-12 sm:grid-cols-3 lg:grid-cols-12">
          <div className="col-span-2 sm:col-span-3 lg:col-span-4 flex flex-col">
            <KolumnLockup text={32} wordClassName="text-[var(--text-on-ink)]" />
            <p className="mt-3 text-sm text-[var(--text-on-ink-muted)]">{FOOTER_TAGLINE}</p>
          </div>
          {FOOTER_GROUPS.map((group) => (
            <div key={group.heading} className="lg:col-span-2">
              <h2 className="font-mono text-[11px] uppercase tracking-[0.06em] text-[var(--text-on-ink-muted)] mb-3">
                {group.heading}
              </h2>
              <ul className="flex flex-col">
                {group.links.map((link) => (
                  <li key={link.to}><FooterLink link={link} /></li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-12 pt-4 border-t border-[var(--border-on-ink)] flex items-center justify-between gap-4 min-h-14">
          <p className="font-mono text-[11px] leading-[17px] text-[var(--text-on-ink-muted)]">
            © {new Date().getFullYear()} Kolumn
          </p>
          <a href={`mailto:${CONTACT_EMAIL}`} className="font-mono text-[11px] text-[var(--text-on-ink-muted)] hover:text-[var(--text-on-ink)] transition-colors">
            {CONTACT_EMAIL}
          </a>
        </div>
      </div>
    </footer>
  )
}
