import Menu from '../../ui/Menu'
import FilterPill from '../../ui/FilterPill'

const DUE_OPTIONS = [
  { value: 'overdue', label: 'Overdue' },
  { value: 'today', label: 'Today' },
  { value: 'this_week', label: 'This week' },
  { value: 'no_date', label: 'No date' },
]

export default function DueFilter({ filters, setFilters }) {
  const selected = filters?.due || null

  const select = (value) => {
    setFilters({ ...filters, due: selected === value ? null : value })
  }

  return (
    <FilterPill label="Due" active={!!selected}>
      {DUE_OPTIONS.map((opt) => (
        <Menu.Item
          key={opt.value}
          selected={selected === opt.value}
          onSelect={() => select(opt.value)}
        >
          {opt.label}
        </Menu.Item>
      ))}
    </FilterPill>
  )
}
