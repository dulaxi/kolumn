import Menu from '../../ui/Menu'
import FilterPill from './FilterPill'
import { LABEL_OUTLINE } from '../../../utils/formatting'

export default function LabelFilter({ filters, setFilters, labels }) {
  const selected = filters?.label || []

  const toggle = (value) => {
    const next = selected.includes(value)
      ? selected.filter((v) => v !== value)
      : [...selected, value]
    setFilters({ ...filters, label: next })
  }

  return (
    <FilterPill label="Label" active={selected.length > 0}>
      {labels.length === 0 ? (
        <div className="px-2.5 py-2 text-xs text-[var(--text-muted)]">No labels</div>
      ) : (
        labels.map((lbl) => (
          <Menu.Item
            key={lbl.text}
            selected={selected.includes(lbl.text)}
            onSelect={() => toggle(lbl.text)}
          >
            {/* Same outline chip the card renders (LABEL_OUTLINE style) */}
            <span className={`inline-flex text-xs font-medium leading-[1.4] py-px px-1.5 border-[0.5px] rounded-md capitalize ${LABEL_OUTLINE[lbl.color] || LABEL_OUTLINE.gray}`}>
              {lbl.text}
            </span>
          </Menu.Item>
        ))
      )}
    </FilterPill>
  )
}
