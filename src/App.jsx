import { Navigate, Route, Routes } from 'react-router-dom'
import AppLayout from './components/AppLayout'
import ProtectedRoute from './components/ProtectedRoute'
import AdminOnlyRoute from './components/AdminOnlyRoute'
import OnboardingGate from './components/onboarding/OnboardingGate'
import Dashboard from './pages/Dashboard'
import GroupLeaderView from './pages/GroupLeaderView'
import GroupLeaderHome from './pages/GroupLeaderHome'
import GroupChat from './pages/GroupChat'
import Groups from './pages/Groups'
import History from './pages/History'
import Login from './pages/Login'
import MyActivities from './pages/MyActivities'
import MyKids from './pages/MyKids'
import OnboardingComplete from './pages/onboarding/OnboardingComplete'
import OnboardingDetails from './pages/onboarding/OnboardingDetails'
import OnboardingKids from './pages/onboarding/OnboardingKids'
import Settings from './pages/Settings'
import Welcome from './pages/Welcome'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/pending-approval" element={<Navigate to="/welcome" replace />} />
      <Route path="/rejected" element={<Navigate to="/welcome" replace />} />
      <Route path="/onboarding/activity" element={<Navigate to="/onboarding/complete" replace />} />
      <Route element={<ProtectedRoute />}>
        <Route path="/admin" element={<AdminOnlyRoute />} />
        <Route path="/welcome" element={<Welcome />} />
        <Route path="/onboarding/details" element={<OnboardingDetails />} />
        <Route path="/onboarding/kids" element={<OnboardingKids />} />
        <Route path="/onboarding/complete" element={<OnboardingComplete />} />
        <Route path="/" element={<Navigate to="/welcome" replace />} />
        <Route element={<OnboardingGate />}>
          <Route path="/my-kids" element={<MyKids />} />
          <Route element={<AppLayout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/my-activities" element={<MyActivities />} />
            <Route path="/groups" element={<Groups />} />
            <Route path="/leader" element={<GroupLeaderHome />} />
            <Route path="/groups/:groupId/chat" element={<GroupChat />} />
            <Route path="/groups/:groupId/leader" element={<GroupLeaderView />} />
            <Route path="/history" element={<History />} />
            <Route path="/settings" element={<Settings />} />
          </Route>
        </Route>
      </Route>
    </Routes>
  )
}
