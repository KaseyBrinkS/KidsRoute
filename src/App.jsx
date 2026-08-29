import { Navigate, Route, Routes } from 'react-router-dom'
import AppLayout from './components/AppLayout'
import ErrorBoundary from './components/ErrorBoundary'
import ProtectedRoute from './components/ProtectedRoute'
import AdminOnlyRoute from './components/AdminOnlyRoute'
import Dashboard from './pages/Dashboard'
import GroupLeaderView from './pages/GroupLeaderView'
import GroupLeaderHome from './pages/GroupLeaderHome'
import GroupChat from './pages/GroupChat'
import Groups from './pages/Groups'
import History from './pages/History'
import Login from './pages/Login'
import MyActivities from './pages/MyActivities'
import Privacy from './pages/Privacy'
import Settings from './pages/Settings'
import Terms from './pages/Terms'
import Flyer from './pages/Flyer'
import Welcome from './pages/Welcome'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/privacy" element={<Privacy />} />
      <Route path="/terms" element={<Terms />} />
      <Route path="/flyer" element={<Flyer />} />
      <Route path="/pending-approval" element={<Navigate to="/welcome" replace />} />
      <Route path="/rejected" element={<Navigate to="/welcome" replace />} />
      <Route path="/my-kids" element={<Navigate to="/settings" replace />} />
      <Route path="/onboarding/*" element={<Navigate to="/settings" replace />} />
      <Route element={<ProtectedRoute />}>
        <Route path="/admin" element={<AdminOnlyRoute />} />
        <Route path="/welcome" element={<Welcome />} />
        <Route path="/" element={<Navigate to="/welcome" replace />} />
        <Route element={<AppLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route
            path="/my-activities"
            element={
              <ErrorBoundary message="The Activities page couldn't load. Try again, or head back to the dashboard.">
                <MyActivities />
              </ErrorBoundary>
            }
          />
          <Route path="/groups" element={<Groups />} />
          <Route path="/leader" element={<GroupLeaderHome />} />
          <Route path="/groups/:groupId/chat" element={<GroupChat />} />
          <Route path="/groups/:groupId/leader" element={<GroupLeaderView />} />
          <Route path="/history" element={<History />} />
          <Route path="/settings" element={<Settings />} />
        </Route>
      </Route>
    </Routes>
  )
}
