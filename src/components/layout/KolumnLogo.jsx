import { Kanban } from '@phosphor-icons/react'

// The Kolumn logo mark. Shared by the real sidebar (Sidebar.jsx) and the
// reload fallback (RouteLoadingShell.jsx) so the two can't drift apart.
export default function KolumnLogo({ size = 30 }) {
  return <Kanban size={size} weight="fill" className="shrink-0 text-[var(--color-logo)]" />
}
