---
category: Primitives
---

Tooltip — hover/focus tip on an ink pill, portaled to the body so overflow ancestors never clip it. Replaces `title=` attributes app-wide.

## Props

- `content`: node — the tip. Keep it to a short phrase.
- `placement`: `'top' | 'bottom' | 'left' | 'right'` (default `top`). Includes a small ink arrow.
- `delay`: ms before showing (default 300).
- `disabled`: render children without tip behavior.
- `children`: a single focusable/hoverable element (the trigger).

## Usage

```jsx
<Tooltip content="Archive done cards">
  <Button variant="ghost" size="icon-md" aria-label="Archive"><Archive size={16} /></Button>
</Tooltip>
```

## Rules

- Tips appear only on hover/focus — never render always-on tooltips; for persistent hints use plain muted text.
- Don't put interactive content inside a tooltip.
