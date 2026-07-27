import { supabase } from './supabase'
import { env } from './env'
import { logError } from '../utils/logger'

export async function streamChat({ message, history = [], mode, boardId, today }, { onText, onToolCall, onDone, onError, onTier }, { signal } = {}) {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.access_token) {
    onError('Not authenticated')
    return
  }

  // mode identifies the surface ('pill' | 'chat'); the server enforces the
  // (mode × tier) tool matrix. boardId scopes the pill's system prompt to
  // its host board. today anchors date math to the user's clock, not UTC.
  const body = { message, history, mode }
  if (boardId) body.boardId = boardId
  if (today) body.today = today

  let response
  try {
    response = await fetch(`${env.supabaseUrl}/functions/v1/chat`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
        'apikey': env.supabaseAnonKey,
      },
      body: JSON.stringify(body),
      signal,
    })
  } catch (err) {
    // A deliberate abort is a quiet exit — the caller stopped the stream.
    if (err.name === 'AbortError') {
      onDone?.({ stopReason: 'aborted' })
      return
    }
    logError('[aiClient] request failed', err)
    onError(err.message, undefined)
    return
  }

  if (!response.ok) {
    const text = await response.text()
    logError('[aiClient] error response', { status: response.status, text })
    try {
      const err = JSON.parse(text)
      if (err && typeof err.message === 'string') {
        if (typeof err.remaining === 'number') onTier?.({ remaining: err.remaining })
        onError(err.message, err.error)
        return
      }
    } catch {}
    onError(`Error ${response.status}`, undefined)
    return
  }

  const reader = response.body?.getReader()
  if (!reader) {
    onError('No response stream')
    return
  }

  const decoder = new TextDecoder()
  let buffer = ''

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      const chunk = decoder.decode(value, { stream: true })
      buffer += chunk
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue
        const raw = line.slice(6).trim()
        if (!raw) continue

        let event
        try {
          event = JSON.parse(raw)
        } catch {
          continue
        }

        try {
          if (event.type === 'text') {
            onText(event.content)
          } else if (event.type === 'tier') {
            onTier?.(event)
          } else if (event.type === 'tool_call') {
            await onToolCall({ id: event.id, action: event.action, params: event.params })
          } else if (event.type === 'done') {
            onDone({ stopReason: event.stopReason ?? null })
            return
          } else if (event.type === 'error') {
            onError(event.content, undefined)
            return
          }
        } catch (callbackErr) {
          logError('[aiClient] callback error', callbackErr)
        }
      }
    }
    onDone({ stopReason: null })
  } catch (err) {
    if (err.name === 'AbortError') {
      onDone({ stopReason: 'aborted' })
      return
    }
    onError(err.message)
  }
}
