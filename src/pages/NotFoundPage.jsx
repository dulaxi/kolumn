import NotFoundState from '../components/ui/NotFoundState'

export default function NotFoundPage() {
  return (
    <div className="min-h-screen bg-[var(--surface-raised)] flex flex-col items-center justify-center px-4">
      <NotFoundState
        size="page"
        klayScale={8}
        eyebrow="404"
        title="This page wandered off"
        body="Klay looked everywhere. The link may be old, or the page moved."
        actions={[
          { label: 'Back to Dashboard', to: '/dashboard' },
          { label: 'Go to Boards', to: '/boards', variant: 'ghost' },
        ]}
      />
    </div>
  )
}
