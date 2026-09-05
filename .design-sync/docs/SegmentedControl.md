---
category: Primitives
---

SegmentedControl — radiogroup toggle with a sliding 1px-bordered thumb (claude.ai-style). One tab stop; arrow keys move AND select.

## Props

- `options`: `[{ value, label?, icon?, ariaLabel? }]` — icon-only segments must set `ariaLabel`. Phosphor icons automatically flip to `weight="fill"` when selected.
- `value` / `onChange` — controlled.
- `ariaLabel`: group label (always set it).

## Usage

```jsx
<SegmentedControl
  ariaLabel="Board view"
  value={view}
  onChange={setView}
  options={[
    { value: 'board', label: 'Board', icon: <SquaresFour size={16} /> },
    { value: 'list', label: 'List', icon: <ListBullets size={16} /> },
  ]}
/>
```

## Rules

- Use for 2–4 mutually exclusive view/mode switches; more than that wants a Menu.
- The selected segment is marked by the thumb + medium weight — don't add extra selected styling.
