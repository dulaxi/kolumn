// SegmentedControl — radiogroup toggle with sliding thumb, selected icon
// flips to Phosphor fill weight.
import { useState } from 'react'
import { SegmentedControl } from 'kolumn'
import { SquaresFour, ListBullets, CalendarBlank, Cube, CubeFocus } from '@phosphor-icons/react'

const stack: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'flex-start' }

export const BoardView = () => {
  const [value, setValue] = useState('board')
  return (
    <div style={stack}>
      <SegmentedControl
        ariaLabel="Board view"
        value={value}
        onChange={setValue}
        options={[
          { value: 'board', label: 'Board', icon: <SquaresFour /> },
          { value: 'list', label: 'List', icon: <ListBullets /> },
          { value: 'calendar', label: 'Calendar', icon: <CalendarBlank /> },
        ]}
      />
    </div>
  )
}

export const WorkspaceScope = () => {
  const [value, setValue] = useState('personal')
  return (
    <div style={stack}>
      <SegmentedControl
        ariaLabel="Workspace scope"
        value={value}
        onChange={setValue}
        options={[
          { value: 'all', ariaLabel: 'All workspaces', icon: <CubeFocus /> },
          { value: 'personal', ariaLabel: 'Personal', icon: <Cube /> },
        ]}
      />
    </div>
  )
}

export const LabelsOnly = () => {
  const [value, setValue] = useState('week')
  return (
    <div style={stack}>
      <SegmentedControl
        ariaLabel="Activity range"
        value={value}
        onChange={setValue}
        options={[
          { value: 'week', label: 'This week' },
          { value: 'month', label: 'This month' },
          { value: 'all', label: 'All time' },
        ]}
      />
    </div>
  )
}
