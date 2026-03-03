import { BrowserRouter, Routes, Route } from 'react-router-dom'
import AppLayout from './components/layout/AppLayout'
import ProtectedRoute from './components/auth/ProtectedRoute'
import LandingPage from './pages/LandingPage'
import LoginPage from './pages/LoginPage'
import SignupPage from './pages/SignupPage'
import DashboardPage from './pages/DashboardPage'
import BoardsPage from './pages/BoardsPage'
import CalendarPage from './pages/CalendarPage'
import NotesPage from './pages/NotesPage'
import SettingsPage from './pages/SettingsPage'
import WorkspacePage from './pages/WorkspacePage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="boards/*" element={<BoardsPage />} />
          <Route path="workspace" element={<WorkspacePage />} />
          <Route path="calendar" element={<CalendarPage />} />
          <Route path="notes" element={<NotesPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
