import { useCallback, useEffect, useState } from 'react'
import { format } from 'date-fns'
import { listSessions, revokeSession } from '../../lib/accountClient'
import { showToast } from '../../utils/toast'
import Button from '../ui/Button'
import Skeleton from '../ui/Skeleton'
import InlineNotice from '../ui/InlineNotice'
import Tooltip from '../ui/Tooltip'

// Active-session rows inside the Account pane. Load on mount; revoked rows
// drop out optimistically only after the server confirms.
export default function SessionsList() {
  const [sessions, setSessions] = useState(null) // null = loading
  const [error, setError] = useState(null)
  const [revoking, setRevoking] = useState(null) // session id in-flight

  const load = useCallback(async () => {
    setError(null)
    setSessions(null)
    try {
      setSessions(await listSessions())
    } catch (err) {
      setError(err.message)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const handleRevoke = async (id) => {
    setRevoking(id)
    try {
      await revokeSession(id)
      setSessions((rows) => rows.filter((r) => r.id !== id))
    } catch (err) {
      showToast.error(err.message)
    } finally {
      setRevoking(null)
    }
  }

  if (error) {
    return (
      <InlineNotice variant="error" action={<Button variant="secondary" size="sm" onClick={load}>Retry</Button>}>
        Couldn't load your sessions.
      </InlineNotice>
    )
  }

  if (!sessions) {
    return (
      <div className="flex flex-col gap-2 py-2">
        <Skeleton variant="line" width="100%" />
        <Skeleton variant="line" width="80%" />
      </div>
    )
  }

  return (
    <ul className="divide-y divide-[var(--border-subtle)]">
      {sessions.map((s) => (
        <li key={s.id} className="flex items-center justify-between gap-6 py-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <Tooltip content={s.user_agent || undefined}>
                <span className="text-sm text-[var(--text-primary)]">{s.device}</span>
              </Tooltip>
              {s.current && (
                <span className="rounded-full bg-[var(--accent-lime-soft)] px-2 py-0.5 text-[11px] text-[var(--text-primary)]">
                  This device
                </span>
              )}
            </div>
            <p className="mt-0.5 text-xs text-[var(--text-secondary)]">
              {s.location} · Created {format(new Date(s.created_at), 'd MMM yyyy')} · Active {format(new Date(s.last_active_at), 'd MMM yyyy, HH:mm')}
            </p>
          </div>
          {!s.current && (
            <Button
              variant="destructive"
              size="sm"
              loading={revoking === s.id}
              onClick={() => handleRevoke(s.id)}
            >
              Revoke
            </Button>
          )}
        </li>
      ))}
    </ul>
  )
}
