// Section of the settings modal: serif-free small heading + hairline-divided
// rows. No card borders — the row grammar carries the structure.
export default function SettingsSection({ title, children }) {
  return (
    <section className="mb-8 last:mb-0">
      <h3 className="mb-1 text-sm font-semibold text-[var(--text-primary)]">{title}</h3>
      <div className="divide-y divide-[var(--border-subtle)]">{children}</div>
    </section>
  )
}
