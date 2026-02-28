import { BrowserRouter, Routes, Route } from 'react-router-dom'
import AppLayout from './components/layout/AppLayout'
import BoardsPage from './pages/BoardsPage'

// Placeholder pages
function DashboardPage() {
  return <div className="text-gray-500">Dashboard — coming soon</div>
}
function CalendarPage() {
  return <div className="text-gray-500">Calendar — coming soon</div>
}
function NotesPage() {
  return <div className="text-gray-500">Notes — coming soon</div>
}
function AnalyticsPage() {
  return <div className="text-gray-500">Analytics — coming soon</div>
}
function SettingsPage() {
  return <div className="text-gray-500">Settings — coming soon</div>
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="boards/*" element={<BoardsPage />} />
          <Route path="calendar" element={<CalendarPage />} />
          <Route path="notes" element={<NotesPage />} />
          <Route path="analytics" element={<AnalyticsPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
