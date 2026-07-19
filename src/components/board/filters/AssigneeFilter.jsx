import Menu from '../../ui/Menu'
import FilterPill from './FilterPill'

export default function AssigneeFilter({ filters, setFilters, assignees }) {
  const selected = filters?.assignee || null

  const select = (value) => {
    setFilters({ ...filters, assignee: selected === value ? null : value })
  }

  return (
    <FilterPill label="Assignee" active={!!selected}>
      {assignees.length === 0 ? (
        <div className="px-2.5 py-2 text-xs text-[var(--text-muted)]">No assignees</div>
      ) : (
        assignees.map((name) => (
          <Menu.Item
            key={name}
            selected={selected === name}
            onSelect={() => select(name)}
            icon={
              <span className="w-4 h-4 rounded-full bg-[var(--color-sand)] flex items-center justify-center text-[9px] font-medium text-[var(--text-secondary)]">
                {name.charAt(0).toUpperCase()}
              </span>
            }
          >
            {name}
          </Menu.Item>
        ))
      )}
    </FilterPill>
  )
}
