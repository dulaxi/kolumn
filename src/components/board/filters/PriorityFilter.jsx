import Menu from '../../ui/Menu'
import FilterPill from './FilterPill'
import { PRIORITY_OPTIONS } from '../../../constants/colors'

export default function PriorityFilter({ filters, setFilters }) {
  const priorities = PRIORITY_OPTIONS.map((o) => ({ value: o.value, label: o.label, color: o.dot }))
  const selected = filters?.priority || []

  const toggle = (value) => {
    const next = selected.includes(value)
      ? selected.filter((v) => v !== value)
      : [...selected, value]
    setFilters({ ...filters, priority: next })
  }

  return (
    <FilterPill label="Priority" active={selected.length > 0}>
      {priorities.map((p) => (
        <Menu.Item
          key={p.value}
          selected={selected.includes(p.value)}
          onSelect={() => toggle(p.value)}
        >
          <span className={`w-2 h-2 rounded-full inline-block mr-2 ${p.color}`} />
          {p.label}
        </Menu.Item>
      ))}
    </FilterPill>
  )
}
