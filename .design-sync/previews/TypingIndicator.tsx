// TypingIndicator — "Kolumn is thinking" status row. No props; the wave
// word is picked once per mount from a shared vocabulary.
import { TypingIndicator } from 'kolumn'

export const Default = () => (
  <div style={{ width: 320 }}>
    <TypingIndicator />
  </div>
)
