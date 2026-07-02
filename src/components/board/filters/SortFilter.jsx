import Menu from '../../ui/Menu'
import FilterPill from './FilterPill'

const SORT_OPTIONS = [
  { value: 'manual', label: 'Manual' },
  { value: 'due_date', label: 'Due date' },
  { value: 'priority', label: 'Priority' },
  { value: 'created', label: 'Newest first' },
  { value: 'alpha', label: 'Alphabetical' },
]

export default function SortFilter({ sortBy, setSortBy }) {
  const current = SORT_OPTIONS.find((o) => o.value === sortBy)
  return (
    <FilterPill label={sortBy === 'manual' ? 'Sort' : current?.label} active={sortBy !== 'manual'}>
      {SORT_OPTIONS.map((opt) => (
        <Menu.Item
          key={opt.value}
          selected={sortBy === opt.value}
          onSelect={() => setSortBy(opt.value)}
        >
          {opt.label}
        </Menu.Item>
      ))}
    </FilterPill>
  )
}
