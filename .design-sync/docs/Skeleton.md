---
category: Primitives
---

Skeleton — loading placeholder. Default tone is a subtle raised-surface pulse; `ai` tone is the lime/cream shimmer reserved for AI-generated content.

## Props

- `variant`: `'block' | 'line' | 'circle' | 'pill'` (default `block`; line is 14px tall, pill 24px).
- `tone`: `'default' | 'ai'` — use `ai` only where AI output is loading (chat, AI card generation).
- `width` / `height`: number (px) or CSS string.
- Renders an aria-hidden `<span>`; spread native props/className as needed.

## Usage

```jsx
{/* a loading kanban card */}
<div style={{ display: 'flex', gap: 10 }}>
  <Skeleton variant="circle" width={24} height={24} />
  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
    <Skeleton variant="line" width="80%" />
    <Skeleton variant="line" width="55%" />
  </div>
</div>
<Skeleton tone="ai" height={72} />
```
