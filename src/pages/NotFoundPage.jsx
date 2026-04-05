import { Link } from 'react-router-dom'

export default function NotFoundPage() {
  return (
    <div className="min-h-screen bg-[#F2EDE8] flex flex-col items-center justify-center px-4">
      <h1 className="text-6xl font-bold text-[#1A1A1A] font-logo mb-2">404</h1>
      <p className="text-lg text-[#8E8E89] mb-6">This page doesn't exist.</p>
      <Link
        to="/dashboard"
        className="px-4 py-2 bg-[#1A1A1A] text-white text-sm rounded-lg hover:bg-[#333] transition-colors"
      >
        Back to Dashboard
      </Link>
    </div>
  )
}
