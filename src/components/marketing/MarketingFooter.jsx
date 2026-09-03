import { Link } from 'react-router-dom'
import KolumnLockup from '../layout/KolumnLockup'
import { CONTACT_EMAIL, FOOTER_GROUPS, FOOTER_TAGLINE } from '../../content/marketing-nav'

// Chrome spec §3.2: ink footer, 80/48 padding, brand column (4/12) + 4 link
// columns (2/12 each — Resources and Company stacked ~48px apart in the
// third column so 5 groups fit 4 columns), mono 11px group headings, 13px
// links at 27px pitch, hairline bottom row. Light-on-ink colors use the
// theme-stable --text-on-ink / --border-on-ink tokens. No social row yet
// (handles are an open question); no theme control (marketing routes are
// light-only).

const CONTAINER = 'max-w-[90rem] mx-auto'
const CONTAINER_STYLE = { width: 'calc(100% - (2 * clamp(2rem, 1.43rem + 2.86vw, 4rem)))' }

// §3.2: col 1 = Product, col 2 = Solutions, col 3 = Resources + Company
// stacked, col 4 = Legal. Group Resources/Company by heading (rather than
// slicing by index) so the layout stays correct if FOOTER_GROUPS is reordered.
function groupFooterColumns(groups) {
  const columns = []
  let pendingResources = null
  for (const group of groups) {
    if (group.heading === 'Resources') {
      pendingResources = group
      continue
    }
    if (group.heading === 'Company' && pendingResources) {
      columns.push([pendingResources, group])
      pendingResources = null
      continue
    }
    columns.push([group])
  }
  if (pendingResources) columns.push([pendingResources])
  return columns
}

function FooterLink({ link }) {
  const className = 'inline-block py-1 text-[13px] leading-[19px] text-[var(--text-on-ink)] hover:underline underline-offset-[3px] decoration-[var(--text-on-ink-muted)]'
  if (link.to.startsWith('/#') || link.to.startsWith('mailto:')) {
    return <a href={link.to} className={className}>{link.label}</a>
  }
  return <Link to={link.to} className={className}>{link.label}</Link>
}

function FooterGroup({ group }) {
  return (
    <div>
      <h2 className="font-mono text-[11px] uppercase tracking-[0.06em] text-[var(--text-on-ink-muted)] mb-3">
        {group.heading}
      </h2>
      <ul className="flex flex-col">
        {group.links.map((link) => (
          <li key={link.to}><FooterLink link={link} /></li>
        ))}
      </ul>
    </div>
  )
}

const FOOTER_COLUMNS = groupFooterColumns(FOOTER_GROUPS)

export default function MarketingFooter() {
  return (
    <footer className="bg-[var(--color-ink)] pt-14 pb-10 sm:pt-20 sm:pb-12">
      <div className={CONTAINER} style={CONTAINER_STYLE}>
        <div className="grid grid-cols-2 gap-x-8 gap-y-12 sm:grid-cols-3 lg:grid-cols-12">
          <div className="col-span-2 sm:col-span-3 lg:col-span-4 flex flex-col">
            <KolumnLockup text={32} wordClassName="text-[var(--text-on-ink)]" />
            <p className="mt-3 text-sm text-[var(--text-on-ink-muted)]">{FOOTER_TAGLINE}</p>
          </div>
          {FOOTER_COLUMNS.map((columnGroups) => (
            <div key={columnGroups[0].heading} className="lg:col-span-2">
              {columnGroups.map((group, i) => (
                <div key={group.heading} className={i > 0 ? 'mt-12' : undefined}>
                  <FooterGroup group={group} />
                </div>
              ))}
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
