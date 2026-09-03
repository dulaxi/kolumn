import { useMemo, useState } from 'react'
import { Article, Bug } from '@phosphor-icons/react'
import SegmentedControl from '../../components/ui/SegmentedControl'
import ChangelogEntryRow from '../../components/changelog/ChangelogEntryRow'
import { CHANGELOG_ENTRIES, CHANGELOG_TAGS, changelogMonthGroups } from '../../content/changelog'

// /changelog — single page, entries are anchors (/changelog#<id>). Spec:
// docs/superpowers/specs/marketing/changelog.md §3. Every entry is a real,
// dated, user-facing change verified against `git log --oneline` before it
// shipped — see the source-of-truth comment at the top of
// src/content/changelog.js. No version numbers: Kolumn is a web app, and
// the version you have is the one that's live.

const SECTION = 'px-6 sm:px-10 max-w-6xl mx-auto'
const CHIP_OPTIONS = [{ value: 'all', label: 'All' }, ...CHANGELOG_TAGS.map((t) => ({ value: t.id, label: t.label }))]

export default function ChangelogPage() {
  const [tag, setTag] = useState('all')
  const latest = CHANGELOG_ENTRIES[0]

  const filtered = useMemo(
    () => (tag === 'all' ? CHANGELOG_ENTRIES : CHANGELOG_ENTRIES.filter((e) => e.tag === tag)),
    [tag],
  )
  const groups = useMemo(() => {
    const all = changelogMonthGroups()
    if (tag === 'all') return all
    return all.map((g) => ({ ...g, entries: g.entries.filter((e) => e.tag === tag) })).filter((g) => g.entries.length > 0)
  }, [tag])

  return (
    <>
      <section className={`${SECTION} pt-16 pb-8`}>
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-8">
          <div>
            <h1 className="font-heading font-[425] text-4xl sm:text-5xl tracking-tight text-[var(--text-primary)] mb-3">
              Changelog
            </h1>
            <p className="text-lg text-[var(--text-secondary)] max-w-2xl">
              Every change you&rsquo;d notice, dated and tagged. No version numbers — Kolumn is a web app; the version
              you have is the one that&rsquo;s live.
            </p>
          </div>
          <dl className="font-mono text-xs lg:w-[360px] shrink-0 flex flex-col">
            <div className="flex items-center justify-between gap-4 py-2.5 border-t border-[var(--border-subtle)]">
              <dt className="flex items-center gap-2 text-[var(--text-primary)]"><Article size={14} /> Longer write-ups</dt>
              <dd className="text-[var(--text-muted)]">/blog</dd>
            </div>
            <div className="flex items-center justify-between gap-4 py-2.5 border-t border-b border-[var(--border-subtle)]">
              <dt className="flex items-center gap-2 text-[var(--text-primary)]"><Bug size={14} /> Something broken?</dt>
              <dd className="text-[var(--text-muted)]">/security</dd>
            </div>
          </dl>
        </div>
      </section>

      <section className={`${SECTION} py-10 border-b border-[var(--border-subtle)]`}>
        <p className="font-mono text-xs text-[var(--text-muted)] mb-4">Latest</p>
        <h2 className="sr-only">Latest change</h2>
        <ChangelogEntryRow entry={latest} large />
      </section>

      <section className={`${SECTION} pb-20`}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-10 mb-2">
          <h2 className="font-heading font-[425] text-2xl text-[var(--text-primary)] tracking-tight">All changes</h2>
          <SegmentedControl ariaLabel="Filter by type" options={CHIP_OPTIONS} value={tag} onChange={setTag} />
        </div>
        <div className="max-w-[880px]">
          {groups.map((group) => (
            <div key={group.key}>
              <p className="font-mono text-xs uppercase tracking-wide text-[var(--text-muted)] pt-8 pb-2">{group.label}</p>
              {group.entries.map((entry) => (
                <ChangelogEntryRow key={`${entry.date}-${entry.title}`} entry={entry} />
              ))}
            </div>
          ))}
          {filtered.length === 0 && (
            <p className="text-sm text-[var(--text-secondary)] py-8">Nothing tagged that way yet.</p>
          )}
        </div>
      </section>
    </>
  )
}
