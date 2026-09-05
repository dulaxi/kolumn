---
category: Primitives
---

Popover — anchored overlay panel with click-outside and Escape dismissal. The base under Menu; use it directly for non-menu panels (date pickers, filter panes).

## Props

- `open`, `onOpenChange` — controlled. The trigger is `children`; the panel content is `panel`.
- `placement`: `'bottom-start' | 'bottom-end' | 'top-start' | 'top-end'` (default `bottom-start`).
- `portal`: boolean — render the panel in a body-level portal, fixed-positioned from the anchor (use inside scrolling/clipping containers where an absolute panel would be cut off). Default renders absolutely below/above the trigger, in flow.
- `panelClassName`, `closeOnEscape`, `closeOnOutsideClick` (default true).

Panel chrome is built in: min-w 200px, card surface, 1px mist border, 10px radius, soft shadow, z-50.

## Usage

```jsx
<Popover
  open={open}
  onOpenChange={setOpen}
  placement="bottom-start"
  panel={<div className="p-2 text-sm">Filter options…</div>}
>
  <Button variant="secondary" onClick={() => setOpen(!open)}>Filter</Button>
</Popover>
```

For menus (items, dividers, labels), reach for `Menu` instead — it wraps this component.
