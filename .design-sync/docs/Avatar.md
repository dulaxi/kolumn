---
category: Primitives
---

Avatar — initials avatar with a color derived from a hash of the name, so the same person is always the same hue.

## Props

- `name`: string — drives both the initials (lowercased) and the background color. Required in practice.
- `size`: `'xs' | 'sm' | 'md' | 'lg'` (default `sm`; 16/20/24/32px).
- `ringed`: boolean — 2px ring for overlapping stacks; `ringColor` is a full Tailwind ring class (default matches the card surface) so the ring can match any background.
- `children`: overrides the initials (rare — e.g. a count "+3" cell in an overflow stack).

## Usage

```jsx
<Avatar name="Amara Okafor" />
<Avatar name="Jonas Weber" size="lg" />
{/* overlapping stack */}
<div style={{ display: 'flex' }}>
  <Avatar name="Amara Okafor" ringed />
  <Avatar name="Jonas Weber" ringed style={{ marginLeft: -6 }} />
  <Avatar name="+3" ringed>+3</Avatar>
</div>
```

Initials render in Clash Grotesk (the heading face) via an inline font-family.
