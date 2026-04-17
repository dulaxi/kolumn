import { supabase } from './supabase'
import { env } from './env'

export async function streamChat({ message, history = [] }, { onText, onToolCall, onDone, onError }) {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.access_token) {
    onError('Not authenticated')
    return
  }

  const response = await fetch(`${env.supabaseUrl}/functions/v1/chat`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
      'apikey': env.supabaseAnonKey,
    },
    body: JSON.stringify({ message, history }),
  })

  console.log('[aiClient] response status:', response.status, 'content-type:', response.headers.get('content-type'))

  if (!response.ok) {
    const text = await response.text()
    console.error('[aiClient] error response:', text)
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

        try {
          const event = JSON.parse(raw)
          console.log('[aiClient] event:', event.type, event.content?.slice?.(0, 50) || event.action || '')
          if (event.type === 'text') {
            onText(event.content)
          } else if (event.type === 'tool_call') {
            await onToolCall(event.action, event.params)
          } else if (event.type === 'done') {
            onDone()
            return
          } else if (event.type === 'error') {
            onError(event.content)
            return
          }
        } catch {
          // skip unparseable lines
        }
      }
    }
    onDone()
  } catch (err) {
    onError(err.message)
  }
}
