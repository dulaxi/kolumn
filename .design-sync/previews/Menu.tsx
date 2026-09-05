// Menu — Popover wrapper with Item/Divider/Label sub-components.
// Non-portal panels render absolutely below the trigger, so each cell
// reserves height for the open panel.
import { Menu, Button } from 'kolumn'
import { PencilSimple, Copy, Archive, Trash, SquaresFour, Cube } from '@phosphor-icons/react'

const cell: React.CSSProperties = { minHeight: 260, paddingBottom: 8 }

export const OpenMenu = () => (
  <div style={cell}>
    <Menu
      open
      onOpenChange={() => {}}
      placement="bottom-start"
      panel={
        <>
          <Menu.Label>Board options</Menu.Label>
          <Menu.Item icon={<PencilSimple size={16} />} shortcut="⌘E">
            Rename board
          </Menu.Item>
          <Menu.Item icon={<Copy size={16} />}>Duplicate board</Menu.Item>
          <Menu.Item icon={<Archive size={16} />}>Archive done cards</Menu.Item>
          <Menu.Divider />
          <Menu.Item icon={<Trash size={16} />} destructive>
            Delete board
          </Menu.Item>
        </>
      }
    >
      <Button variant="secondary">Board options</Button>
    </Menu>
  </div>
)

export const Selection = () => (
  <div style={{ ...cell, minHeight: 230 }}>
    <Menu
      open
      onOpenChange={() => {}}
      placement="bottom-start"
      panel={
        <>
          <Menu.Label>Workspace</Menu.Label>
          <Menu.Item icon={<SquaresFour size={16} />} selected>
            All workspaces
          </Menu.Item>
          <Menu.Item icon={<Cube size={16} />}>Personal</Menu.Item>
          <Menu.Divider />
          <Menu.Label>Show columns</Menu.Label>
          <Menu.Item checkbox selected>
            In progress
          </Menu.Item>
          <Menu.Item checkbox>Done</Menu.Item>
        </>
      }
    >
      <Button variant="secondary">View</Button>
    </Menu>
  </div>
)
