import { CheckCircle, Minus } from '@phosphor-icons/react'

// Pricing spec §3.5: sticky header, ~52px rows with hairlines, ink filled
// check for yes, faint minus for no, mono strings for values. A real <table>
// so screen readers get row/column semantics; the header sticks under the
// 84px nav (72px on mobile).

function Cell({ value }) {
  if (value === true) {
    return <CheckCircle size={18} weight="fill" aria-label="Included" className="inline-block text-[var(--text-primary)]" />
  }
  if (value === false) {
    return <Minus size={16} weight="light" aria-label="Not included" className="inline-block text-[var(--text-faint)]" />
  }
  return <span className="font-mono text-xs text-[var(--text-secondary)]">{value}</span>
}

export default function CompareTable({ comparison }) {
  const { columns, rows, note } = comparison
  return (
    <div className="max-w-6xl mx-auto">
      <table aria-label="Compare plans" className="w-full border-collapse">
        <thead className="sticky top-[72px] sm:top-[84px] z-10 bg-[var(--surface-page)]">
          <tr className="border-b border-[var(--border-default)]">
            <th scope="col" className="sr-only">Feature</th>
            {columns.map((name) => (
              <th
                key={name}
                scope="col"
                className="font-heading font-[425] text-base sm:text-lg text-[var(--text-primary)] text-center py-3 px-2 w-[18%] sm:w-[16%]"
              >
                {name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.label} className="border-b border-[var(--border-subtle)]">
              <th scope="row" className="text-left font-normal text-sm text-[var(--text-primary)] py-3 pr-4 min-h-[52px]">
                {row.label}
              </th>
              {row.cells.map((cell, i) => (
                <td key={columns[i]} className="text-center py-3 px-2 align-middle">
                  <Cell value={cell} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {note && <p className="mt-3 text-xs text-[var(--text-muted)]">{note}</p>}
    </div>
  )
}
