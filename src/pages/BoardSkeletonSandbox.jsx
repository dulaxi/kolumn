import { useEffect, useState } from 'react'
import { Moon, Sun } from '@phosphor-icons/react'
import BoardSkeleton from '../components/board/BoardSkeleton'
import Skeleton from '../components/ui/Skeleton'
import Button from '../components/ui/Button'
import TypingIndicator from '../components/chat/TypingIndicator'

// Dev-only sandbox for iterating on BoardSkeleton (the F1 first-load
// ghost board). Renders the exact loading chrome BoardsPage shows while
// boardStore.loading is true — ghost title + <BoardSkeleton /> — without
// needing auth, data, or network throttling. Route is registered in
// App.jsx behind import.meta.env.DEV; it does not exist in production.
export default function BoardSkeletonSandbox() {
  const [theme, setTheme] = useState('light')

  useEffect(() => {
    const prev = document.documentElement.dataset.theme
    document.documentElement.dataset.theme = theme
    return () => {
      if (prev) document.documentElement.dataset.theme = prev
      else delete document.documentElement.dataset.theme
    }
  }, [theme])

  return (
    <div className="min-h-screen bg-[var(--surface-page)] p-6 flex flex-col gap-4">
      <div className="flex items-center justify-between shrink-0">
        <p className="font-mono text-xs text-[var(--text-muted)]">
          sandbox · BoardSkeleton — edit src/components/board/BoardSkeleton.jsx and save to hot-reload
        </p>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setTheme((t) => (t === 'light' ? 'dark' : 'light'))}
        >
          {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
          {theme === 'light' ? 'Dark' : 'Light'}
        </Button>
      </div>

      {/* Button letter-wave specimens (real Button component) */}
      <div className="flex flex-wrap items-center gap-3 shrink-0">
        <Button loading loadingText="Saving">Continue</Button>
        <Button variant="accent" size="lg" loading loadingText="Activating">Activate Pro</Button>
        <Button variant="secondary" size="sm" loading loadingText="Importing">Import data</Button>
        <Button size="lg" loading loadingText="Setting up your workspace">Create account</Button>
        <TypingIndicator />
      </div>

      {/* Mirrors BoardsPage's loading chrome exactly */}
      <div className="h-[80vh] flex flex-col">
        <div className="mb-4 shrink-0 flex items-start justify-between gap-4">
          <Skeleton variant="line" width={176} height={28} className="min-w-0 flex-1 max-w-44 self-end mb-1" />
        </div>
        <div className="flex-1 min-h-0 relative">
          <BoardSkeleton />
        </div>
      </div>
    </div>
  )
}
