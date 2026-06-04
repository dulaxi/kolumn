import { WORKSPACE_COLORS } from '../../constants/colors'

export default function WorkspaceColorPicker({ value, onChange }) {
  return (
    <div className="grid grid-cols-7 gap-2 p-1">
      {WORKSPACE_COLORS.map((c) => {
        const selected = c.name === value
        return (
          <button
            key={c.name}
            type="button"
            onClick={() => onChange(c.name)}
            aria-label={c.name}
            aria-pressed={selected}
            title={c.name}
            className={`h-6 w-6 rounded-full transition ${
              selected
                ? 'ring-1 ring-[var(--text-primary)] ring-offset-2 ring-offset-[var(--surface-card)]'
                : 'hover:opacity-90'
            }`}
            style={{ backgroundColor: c.hex }}
          />
        )
      })}
    </div>
  )
}
