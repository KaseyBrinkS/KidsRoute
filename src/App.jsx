import { Navigate, Route, Routes } from 'react-router-dom'
import AppLayout from './components/AppLayout'
import ProtectedRoute from './components/ProtectedRoute'
import RequireOnboarded from './components/RequireOnboarded'
import Dashboard from './pages/Dashboard'
import GroupLeaderView from './pages/GroupLeaderView'
import Groups from './pages/Groups'
import History from './pages/History'
import Login from './pages/Login'
import MyActivities from './pages/MyActivities'
import MyKids from './pages/MyKids'
import OnboardingActivity from './pages/onboarding/OnboardingActivity'
import OnboardingDetails from './pages/onboarding/OnboardingDetails'
import OnboardingKids from './pages/onboarding/OnboardingKids'
import Settings from './pages/Settings'
import Welcome from './pages/Welcome'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<ProtectedRoute />}>
        <Route path="/welcome" element={<Welcome />} />
        <Route path="/onboarding/kids" element={<OnboardingKids />} />
        <Route path="/onboarding/details" element={<OnboardingDetails />} />
        <Route path="/onboarding/activity" element={<OnboardingActivity />} />
        <Route element={<RequireOnboarded />}>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route element={<AppLayout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/my-kids" element={<MyKids />} />
            <Route path="/my-activities" element={<MyActivities />} />
            <Route path="/groups" element={<Groups />} />
            <Route path="/groups/:groupId/leader" element={<GroupLeaderView />} />
            <Route path="/history" element={<History />} />
            <Route path="/settings" element={<Settings />} />
          </Route>
        </Route>
      </Route>
    </Routes>
  )
}
