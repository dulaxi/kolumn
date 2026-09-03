// ChatInput — chat composer. docked=true owns its own bottom-dock
// padding/width (mx-auto max-w-2xl); docked=false renders just the
// composer box for callers embedding it in their own column.
//
// Not renderable statically: the "blockedHint" cue (typed while busy, then
// submitted) is set by handleSubmit's internal state on an interaction we
// can't script here. Also the 1px focus-within border/shadow bump isn't
// visible in a static screenshot. See .design-sync/learnings/wave1-c.md.
import { ChatInput } from 'kolumn'

const frame: React.CSSProperties = { width: 480, background: 'var(--surface-page)', border: '1px solid var(--border-subtle)', borderRadius: 12 }
// Wider than docked's own max-w-2xl (672px) cap, so the dock wrapper's
// centering/capping is actually visible instead of matching its own frame.
const wideFrame: React.CSSProperties = { width: 860, background: 'var(--surface-page)', border: '1px solid var(--border-subtle)', borderRadius: 12 }

export const Default = () => (
  <div style={wideFrame}>
    <ChatInput onSend={() => {}} autoFocus={false} docked />
  </div>
)

export const Undocked = () => (
  <div style={{ width: 480, padding: 16, background: 'var(--surface-page)', border: '1px solid var(--border-subtle)', borderRadius: 12 }}>
    <ChatInput onSend={() => {}} docked={false} />
  </div>
)

export const Busy = () => (
  <div style={frame}>
    <ChatInput onSend={() => {}} onStop={() => {}} docked busy />
  </div>
)
