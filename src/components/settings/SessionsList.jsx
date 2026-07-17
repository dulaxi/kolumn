import { useCallback, useEffect, useState } from 'react'
import { format } from 'date-fns'
import { DotsThreeVertical } from '@phosphor-icons/react'
import { listSessions, revokeSession } from '../../lib/accountClient'
import { showToast } from '../../utils/toast'
import Button from '../ui/Button'
import Menu from '../ui/Menu'
import Skeleton from '../ui/Skeleton'
import InlineNotice from '../ui/InlineNotice'
import Tooltip from '../ui/Tooltip'

// "Chrome · Windows" (API shape) → "Chrome (Windows)" (table display)
function displayDevice(device) {
  const [browser, os] = device.split(' · ')
  return os ? `${browser} (${os})` : browser
}

const DATE_FMT = 'MMM d, yyyy, h:mm a'

// Active-session table inside the Account pane. Load on mount; revoked rows
// drop out only after the server confirms. Row actions live in a
// hover-revealed kebab menu; the current session has no actions.
export default function SessionsList() {
  const [sessions, setSessions] = useState(null) // null = loading
  const [error, setError] = useState(null)
  const [revoking, setRevoking] = useState(null) // session id in-flight
  const [openMenuId, setOpenMenuId] = useState(null)

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
    setOpenMenuId(null)
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
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr>
            {['Device', 'Location', 'Created', 'Last active'].map((h) => (
              <th key={h} className="pb-2 pr-4 text-left text-xs font-medium text-[var(--text-muted)]">
                {h}
              </th>
            ))}
            <th className="pb-2">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {sessions.map((s) => (
            <tr key={s.id} className="group border-t border-[var(--border-subtle)]">
              <td className="w-56 max-w-56 py-2 pr-4">
                <div className="flex min-w-0 items-center gap-2">
                  <Tooltip content={s.user_agent || undefined}>
                    <span className="min-w-0 truncate text-[var(--text-primary)]">{displayDevice(s.device)}</span>
                  </Tooltip>
                  {s.current && (
                    // Amber tone-on-tone chip per the claude.ai Badge
                    // reference — --accent-amber pair, small radius, no border.
                    <span className="shrink-0 rounded-[6px] bg-[var(--accent-amber-wash)] px-2 py-0.5 text-[11px] font-medium text-[var(--accent-amber)]">
                      Current
                    </span>
                  )}
                </div>
              </td>
              <td className="max-w-36 truncate py-2 pr-4 text-xs text-[var(--text-secondary)]">
                {s.location}
              </td>
              <td className="whitespace-nowrap py-2 pr-4 text-xs text-[var(--text-secondary)]">
                {format(new Date(s.created_at), DATE_FMT)}
              </td>
              <td className="whitespace-nowrap py-2 pr-4 text-xs text-[var(--text-secondary)]">
                {format(new Date(s.last_active_at), DATE_FMT)}
              </td>
              <td className="py-1 text-right">
                {!s.current && (
                  <Menu
                    open={openMenuId === s.id}
                    onOpenChange={(open) => setOpenMenuId(open ? s.id : null)}
                    placement="bottom-end"
                    panel={
                      <Menu.Item destructive onSelect={() => handleRevoke(s.id)}>
                        Revoke session
                      </Menu.Item>
                    }
                  >
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      loading={revoking === s.id}
                      aria-label={`Session actions for ${displayDevice(s.device)}`}
                      onClick={() => setOpenMenuId(openMenuId === s.id ? null : s.id)}
                      className={
                        openMenuId === s.id || revoking === s.id
                          ? ''
                          : 'opacity-0 transition-opacity focus-visible:opacity-100 group-hover:opacity-100'
                      }
                    >
                      <DotsThreeVertical size={16} />
                    </Button>
                  </Menu>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
