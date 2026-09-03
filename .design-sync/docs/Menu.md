---
category: Primitives
---

Menu — dropdown menu built on Popover, with `Menu.Item`, `Menu.Divider`, and `Menu.Label` sub-components. Rows are 32px, text-sm, rounded-lg.

## Props

Menu itself takes every Popover prop (`open`, `onOpenChange`, `placement`, `panel`, `portal`, …). Compose the items inside `panel`.

- `Menu.Item`: `icon` (16px Phosphor node), `shortcut` (mono right-aligned hint, e.g. `"⌘E"`), `destructive` (red text + red hover wash), `selected` (trailing lime check — single-select), `checkbox` (leading checkbox replaces the icon slot — multi-select; combine with `selected`), `onSelect`, plus native button props.
- `Menu.Label`: uppercase 10px section header.
- `Menu.Divider`: 1px rule.

## Usage

```jsx
<Menu open={open} onOpenChange={setOpen} panel={
  <>
    <Menu.Label>Board options</Menu.Label>
    <Menu.Item icon={<PencilSimple size={16} />} shortcut="⌘E" onSelect={rename}>Rename board</Menu.Item>
    <Menu.Item icon={<Copy size={16} />} onSelect={duplicate}>Duplicate board</Menu.Item>
    <Menu.Divider />
    <Menu.Item icon={<Trash size={16} />} destructive onSelect={confirmDelete}>Delete board</Menu.Item>
  </>
}>
  <Button variant="secondary" size="icon-md" aria-label="Board options"><DotsThree size={16} /></Button>
</Menu>
```

## Rules

- Destructive rows use red (never copper — copper is failure, red is destructive intent).
- Single-select marks with the trailing check; multi-select uses `checkbox`. Don't mix in one group.
