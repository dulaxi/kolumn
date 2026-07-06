import { Link } from 'react-router-dom'
import Button from '../components/ui/Button'

export default function NotFoundPage() {
  return (
    <div className="min-h-screen bg-[var(--surface-raised)] flex flex-col items-center justify-center px-4">
      <h1 className="text-6xl font-bold text-[var(--text-primary)] font-logo mb-2">404</h1>
      <p className="text-lg text-[var(--text-muted)] mb-6">This page doesn't exist.</p>
      <Button asChild>
        <Link to="/dashboard">Back to Dashboard</Link>
      </Button>
    </div>
  )
}
