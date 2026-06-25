import { Navigate, Route, Routes } from 'react-router-dom'
import AccessGate from './components/AccessGate'
import AppLayout from './components/AppLayout'
import ProtectedRoute from './components/ProtectedRoute'
import AdminOnlyRoute from './components/AdminOnlyRoute'
import NotFound from './components/NotFound'
import Dashboard from './pages/Dashboard'
import GroupLeaderView from './pages/GroupLeaderView'
import GroupLeaderHome from './pages/GroupLeaderHome'
import Groups from './pages/Groups'
import History from './pages/History'
import InviteCode from './pages/InviteCode'
import Login from './pages/Login'
import MyActivities from './pages/MyActivities'
import MyKids from './pages/MyKids'
import OnboardingActivity from './pages/onboarding/OnboardingActivity'
import OnboardingDetails from './pages/onboarding/OnboardingDetails'
import OnboardingKids from './pages/onboarding/OnboardingKids'
import PendingApproval from './pages/PendingApproval'
import Rejected from './pages/Rejected'
import Settings from './pages/Settings'
import Welcome from './pages/Welcome'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<AccessGate />}>
          <Route path="/invite-code" element={<InviteCode />} />
          <Route path="/pending-approval" element={<PendingApproval />} />
          <Route path="/rejected" element={<Rejected />} />
          <Route path="/admin" element={<AdminOnlyRoute />} />
          <Route path="/welcome" element={<Welcome />} />
          <Route path="/onboarding/kids" element={<OnboardingKids />} />
          <Route path="/onboarding/details" element={<OnboardingDetails />} />
          <Route path="/onboarding/activity" element={<OnboardingActivity />} />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route element={<AppLayout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/my-kids" element={<MyKids />} />
            <Route path="/my-activities" element={<MyActivities />} />
            <Route path="/groups" element={<Groups />} />
            <Route path="/leader" element={<GroupLeaderHome />} />
            <Route path="/groups/:groupId/leader" element={<GroupLeaderView />} />
            <Route path="/history" element={<History />} />
            <Route path="/settings" element={<Settings />} />
          </Route>
        </Route>
      </Route>
    </Routes>
  )
}
