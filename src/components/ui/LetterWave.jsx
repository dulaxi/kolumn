/**
 * LetterWave — loading label with a traveling brightness wave
 * (the Claude Code terminal "Thinking…" effect, in the product font).
 *
 * Splits `text` into per-letter spans; CSS in index.css (.btn-wave)
 * rests each letter at 45% opacity and lifts a ~2-letter window back
 * to full strength as the wave passes. Spaces stay as plain text so
 * multi-word labels wrap naturally, but still advance the wave index
 * so the window travels across word gaps at constant speed.
 *
 * Visual-only: always aria-hidden. Pair it with a visually-hidden
 * plain-text label (and aria-busy on the control) for screen readers —
 * Button.jsx does this automatically.
 */
export default function LetterWave({ text, className = '' }) {
  const chars = [...String(text)]
  // Scale the cycle to the label so short verbs loop briskly and long
  // labels ("Setting up your workspace") don't stall between passes.
  const duration = Math.max(1.4, chars.length * 0.09 + 0.6)
  return (
    <span
      aria-hidden="true"
      className={className ? `btn-wave ${className}` : 'btn-wave'}
      style={{ '--wave-dur': `${duration}s` }}
    >
      {chars.map((ch, i) =>
        ch === ' ' ? ' ' : <span key={i} style={{ '--i': i }}>{ch}</span>,
      )}
    </span>
  )
}
