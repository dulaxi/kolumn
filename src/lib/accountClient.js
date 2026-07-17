import { supabase } from './supabase'
import { env } from './env'

async function call(path, options = {}) {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('You need to be signed in for this.')
  let res
  try {
    res = await fetch(`${env.supabaseUrl}/functions/v1/account/${path}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        apikey: env.supabaseAnonKey,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    })
  } catch {
    throw new Error("Couldn't reach the server. Check your connection and try again.")
  }
  let body = {}
  try {
    body = await res.json()
  } catch { /* non-JSON error body */ }
  if (!res.ok) {
    const err = new Error(
      body.error === 'owned_shared_resources'
        ? 'You still own shared workspaces or boards.'
        : body.error === 'cannot_revoke_current'
          ? "You can't revoke the session you're using."
          : 'Something went wrong. Please try again.',
    )
    err.code = body.error
    if (body.blockers) err.blockers = body.blockers
    throw err
  }
  return body
}

export async function listSessions() {
  const { sessions } = await call('sessions', { method: 'GET' })
  return sessions
}

export async function revokeSession(sessionId) {
  await call('revoke', { method: 'POST', body: JSON.stringify({ session_id: sessionId }) })
}

export async function deleteAccount() {
  await call('delete-account', { method: 'POST' })
}
