import { useBoardStore } from './index'

// Event-driven replacement for the old 200ms polling loop (backlog T1-#5).
// addCard/duplicateCard return an optimistic temp id; the background insert
// later writes _tempIdMap[tempId] = realId in a single set() (which also
// removes the temp card). Failure removes the temp card WITHOUT mapping it —
// so "card gone and unmapped" means the insert failed and waiting is
// pointless. Resolves the real id, or null on failure/timeout. Never rejects.
export function waitForRealCardId(tempId, { timeoutMs = 4000 } = {}) {
  const s = useBoardStore.getState()
  const mapped = s._tempIdMap?.[tempId]
  if (mapped) return Promise.resolve(mapped)
  if (!s.cards?.[tempId]) return Promise.resolve(null)

  return new Promise((resolve) => {
    let timer = null
    const finish = (value, unsub) => {
      clearTimeout(timer)
      unsub()
      resolve(value)
    }
    const unsub = useBoardStore.subscribe((state) => {
      const realId = state._tempIdMap?.[tempId]
      // Map first: the success swap maps + removes the temp card atomically.
      if (realId) return finish(realId, unsub)
      if (!state.cards?.[tempId]) return finish(null, unsub)
    })
    timer = setTimeout(() => finish(null, unsub), timeoutMs)
  })
}
