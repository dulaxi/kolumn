// Popover — anchored overlay, non-portal mode renders the panel absolutely
// inside the anchor wrapper, so each cell reserves height for the open panel.
// Canonical story mirrors AssigneePicker.jsx (search + member list, board
// context); the sweep checks all four placements read correctly.
import { Popover, Button, Avatar, Input } from 'kolumn'
import { Check } from '@phosphor-icons/react'

const cell: React.CSSProperties = { minHeight: 280, paddingBottom: 8 }

const memberRow = (checked: boolean): React.CSSProperties => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 8,
  minHeight: 32,
  padding: '0 8px',
  borderRadius: 8,
  fontSize: 13,
  fontWeight: checked ? 500 : 400,
  color: 'var(--text-primary)',
})

const memberName: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
}

export const AssigneePicker = () => (
  <div style={cell}>
    <Popover
      open
      onOpenChange={() => {}}
      placement="bottom-start"
      panel={
        <>
          <div style={{ padding: '2px 4px 6px' }}>
            <Input placeholder="Search or type name..." defaultValue="" aria-label="Search members" />
          </div>
          <div style={memberRow(true)}>
            <span style={memberName}>
              <Avatar name="Priya Nair" size="sm" />
              Priya Nair
            </span>
            <Check size={14} color="var(--text-secondary)" />
          </div>
          <div style={memberRow(false)}>
            <span style={memberName}>
              <Avatar name="Marcus Lee" size="sm" />
              Marcus Lee
            </span>
          </div>
          <div style={memberRow(true)}>
            <span style={memberName}>
              <Avatar name="Dana Okafor" size="sm" />
              Dana Okafor
            </span>
            <Check size={14} color="var(--text-secondary)" />
          </div>
        </>
      }
      panelClassName="min-w-[224px]"
    >
      <Button variant="secondary">Assign to card</Button>
    </Popover>
  </div>
)

export const PlacementSweep = () => {
  const sweepCell: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
  }
  const grid: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 24,
    paddingTop: 120,
    paddingBottom: 120,
  }
  const miniPanel = (label: string) => (
    <div style={{ padding: '4px 8px', fontSize: 12, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
      {label}
    </div>
  )
  return (
    <div style={grid}>
      <div style={sweepCell}>
        <Popover open onOpenChange={() => {}} placement="top-start" panel={miniPanel('Move to Done')}>
          <Button variant="secondary" size="sm">top-start</Button>
        </Popover>
      </div>
      <div style={sweepCell}>
        <Popover open onOpenChange={() => {}} placement="top-end" panel={miniPanel('Move to Done')}>
          <Button variant="secondary" size="sm">top-end</Button>
        </Popover>
      </div>
      <div style={sweepCell}>
        <Popover open onOpenChange={() => {}} placement="bottom-start" panel={miniPanel('Move to Done')}>
          <Button variant="secondary" size="sm">bottom-start</Button>
        </Popover>
      </div>
      <div style={sweepCell}>
        <Popover open onOpenChange={() => {}} placement="bottom-end" panel={miniPanel('Move to Done')}>
          <Button variant="secondary" size="sm">bottom-end</Button>
        </Popover>
      </div>
    </div>
  )
}
