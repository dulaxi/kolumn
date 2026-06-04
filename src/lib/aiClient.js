import { supabase } from './supabase'
import { env } from './env'

export async function streamChat({ message, history = [], boardId, today }, { onText, onToolCall, onDone, onError, onTier }) {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.access_token) {
    onError('Not authenticated')
    return
  }

  // Forward boardId only when present. When provided, the edge function scopes
  // the system prompt's board snapshot to just that board (pill mode). When
  // absent, the prompt includes the user's full board context (chat mode).
  // Forward today (user's local YYYY-MM-DD) so the model anchors date math
  // to the user's clock, not the edge function's UTC server time.
  const body = { message, history }
  if (boardId) body.boardId = boardId
  if (today) body.today = today

  const response = await fetch(`${env.supabaseUrl}/functions/v1/chat`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
      'apikey': env.supabaseAnonKey,
    },
    body: JSON.stringify(body),
  })

  console.log('[aiClient] response status:', response.status, 'content-type:', response.headers.get('content-type'))

  if (!response.ok) {
    const text = await response.text()
    console.error('[aiClient] error response:', text)
    try {
      const err = JSON.parse(text)
      if (err.error === 'rate_limit') {
        onError(err.message)
        return
      }
    } catch {}
    onError(`Error ${response.status}: ${text}`)
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
      console.log('[aiClient] chunk:', chunk.slice(0, 200))
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

        console.log('[aiClient] event:', event.type, event.content?.slice?.(0, 50) || event.action || '')

        try {
          if (event.type === 'text') {
            onText(event.content)
          } else if (event.type === 'tier') {
            onTier?.(event)
          } else if (event.type === 'tool_call') {
            await onToolCall(event.action, event.params)
          } else if (event.type === 'done') {
            onDone()
            return
          } else if (event.type === 'error') {
            onError(event.content)
            return
          }
        } catch (callbackErr) {
          console.error('[aiClient] callback error:', callbackErr)
        }
      }
    }
    onDone()
  } catch (err) {
    onError(err.message)
  }
}
