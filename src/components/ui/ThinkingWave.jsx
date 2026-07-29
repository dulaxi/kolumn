import { useState } from 'react'
import LetterWave from './LetterWave'
import { pickThinkingWord } from '../../constants/thinkingWords'

// A working-word letter wave: picks one kanban-brain word per mount
// ("Kanbanning…", "Shuffling…") and holds it steady while visible. Used by
// the chat typing indicator and the Klay loading overlays — mount it inside
// the conditional block so each new wait draws a fresh word.
export default function ThinkingWave() {
  const [word] = useState(pickThinkingWord)
  return <LetterWave text={`${word}…`} tone="typing" />
}
