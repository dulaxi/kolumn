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

  if (!response.ok) {
    const text = await response.text()
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

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue
        const raw = line.slice(6).trim()
        if (!raw) continue

        try {
          const event = JSON.parse(raw)
          if (event.type === 'text') {
            onText(event.content)
          } else if (event.type === 'tool_call') {
            onToolCall(event.action, event.params)
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
