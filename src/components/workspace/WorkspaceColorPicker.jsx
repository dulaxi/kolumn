import { WORKSPACE_COLORS } from '../../constants/colors'
import Tooltip from '../ui/Tooltip'

export default function WorkspaceColorPicker({ value, onChange }) {
  return (
    <div className="grid grid-cols-7 gap-2 p-1">
      {WORKSPACE_COLORS.map((c) => {
        const selected = c.name === value
        return (
          <Tooltip key={c.name} content={c.name}>
            <button
              type="button"
              onClick={() => onChange(c.name)}
              aria-label={c.name}
              aria-pressed={selected}
              className={`h-6 w-6 rounded-full transition ${
                selected
                  ? 'ring-1 ring-[var(--text-primary)] ring-offset-2 ring-offset-[var(--surface-card)]'
                  : 'hover:opacity-90'
              }`}
              style={{ backgroundColor: c.hex }}
            />
          </Tooltip>
        )
      })}
    </div>
  )
}
