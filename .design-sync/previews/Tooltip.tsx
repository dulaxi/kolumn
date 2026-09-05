// Tooltip — hover/focus only, no controlled `open` prop (see Tooltip.jsx:
// state is internal, tip is portaled to document.body on a timer). A static
// capture can't trigger hover, so these stories render the trigger
// compositions only — the bubble itself never appears in this sheet. Grade
// on whether the trigger markup (icon buttons / truncated text) is styled
// and plausible, matching GhostToggle.jsx and SessionsList.jsx usage.
import { Tooltip } from 'kolumn'
import { Ghost, Archive, Copy } from '@phosphor-icons/react'

const note: React.CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: 11,
  color: 'var(--text-faint)',
  marginBottom: 10,
}

const toolbarRow: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
}

const iconBtn: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  height: 32,
  width: 32,
  borderRadius: 8,
  background: 'var(--surface-raised)',
  color: 'var(--text-primary)',
  border: 'none',
  boxShadow: '0 1px 2px rgba(27,27,24,0.05)',
  cursor: 'pointer',
}

export const ToolbarTriggers = () => (
  <div>
    <div style={note}>Tooltip — icon-button triggers (board toolbar pattern)</div>
    <div style={toolbarRow}>
      <Tooltip content="Show where cards were last moved from">
        <button type="button" aria-label="Ghost mode" style={iconBtn}>
          <Ghost size={16} />
        </button>
      </Tooltip>
      <Tooltip content="Archive done cards">
        <button type="button" aria-label="Archive done cards" style={iconBtn}>
          <Archive size={16} />
        </button>
      </Tooltip>
      <Tooltip content="Duplicate board">
        <button type="button" aria-label="Duplicate board" style={iconBtn}>
          <Copy size={16} />
        </button>
      </Tooltip>
    </div>
  </div>
)

export const TruncatedTextTrigger = () => (
  <div>
    <div style={note}>Tooltip — truncated text trigger (SessionsList pattern)</div>
    <div style={{ maxWidth: 200, fontSize: 13, color: 'var(--text-primary)' }}>
      <Tooltip content="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Chrome/128.0">
        <span
          style={{
            display: 'block',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          Chrome (macOS Sonoma, dulahassan&apos;s MacBook Pro)
        </span>
      </Tooltip>
    </div>
  </div>
)
