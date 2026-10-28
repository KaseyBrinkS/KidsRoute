import { Navigate, Route, Routes } from 'react-router-dom'
import AppLayout from './components/AppLayout'
import ErrorBoundary from './components/ErrorBoundary'
import ProtectedRoute from './components/ProtectedRoute'
import AdminOnlyRoute from './components/AdminOnlyRoute'
import RedirectGroupChat from './components/RedirectGroupChat'
import GroupLeaderView from './pages/GroupLeaderView'
import GroupWalkPage from './pages/GroupWalkPage'
import GroupLeaderHome from './pages/GroupLeaderHome'
import Login from './pages/Login'
import MyActivities from './pages/MyActivities'
import Privacy from './pages/Privacy'
import Settings from './pages/Settings'
import Terms from './pages/Terms'
import Flyer from './pages/Flyer'
import Welcome from './pages/Welcome'
import Activation from './pages/Activation'
import Safety from './pages/Safety'
import HowItWorks from './pages/HowItWorks'
import Contact from './pages/Contact'
import Home from './pages/Home'
import Matches from './pages/Matches'
import MatchDetail from './pages/MatchDetail'
import RideDetail from './pages/RideDetail'
import Inbox from './pages/Inbox'
import InboxThread from './pages/InboxThread'
import Profile from './pages/Profile'
import ProfileFamily from './pages/ProfileFamily'
import ProfileConnections from './pages/ProfileConnections'
import ProfileNotifications from './pages/ProfileNotifications'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/privacy" element={<Privacy />} />
      <Route path="/terms" element={<Terms />} />
      <Route path="/safety" element={<Safety />} />
      <Route path="/how-it-works" element={<HowItWorks />} />
      <Route path="/contact" element={<Contact />} />
      <Route path="/flyer" element={<Flyer />} />
      <Route path="/pending-approval" element={<Navigate to="/welcome" replace />} />
      <Route path="/rejected" element={<Navigate to="/welcome" replace />} />
      <Route path="/my-kids" element={<Navigate to="/profile/family" replace />} />
      <Route path="/onboarding/*" element={<Navigate to="/settings" replace />} />
      <Route element={<ProtectedRoute />}>
        <Route path="/admin" element={<AdminOnlyRoute />} />
        <Route path="/welcome" element={<Welcome />} />
        <Route path="/activation" element={<Activation />} />
        <Route path="/" element={<Navigate to="/welcome" replace />} />
        <Route element={<AppLayout />}>
          <Route path="/home" element={<Home />} />
          <Route
            path="/schedule"
            element={
              <ErrorBoundary message="The Schedule page couldn't load. Try again, or head back to Home.">
                <MyActivities />
              </ErrorBoundary>
            }
          />
          <Route path="/matches" element={<Matches />} />
          <Route path="/matches/:groupId" element={<MatchDetail />} />
          <Route path="/rides/:groupId" element={<RideDetail />} />
          <Route path="/inbox" element={<Inbox />} />
          <Route path="/inbox/:groupId" element={<InboxThread />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/profile/family" element={<ProfileFamily />} />
          <Route path="/profile/connections" element={<ProfileConnections />} />
          <Route path="/profile/settings" element={<Navigate to="/settings" replace />} />
          <Route path="/profile/notifications" element={<ProfileNotifications />} />
          <Route path="/settings" element={<Settings />} />

          {/* Legacy routes — redirect to new navigation */}
          <Route path="/dashboard" element={<Navigate to="/home" replace />} />
          <Route path="/my-activities" element={<Navigate to="/schedule" replace />} />
          <Route path="/groups" element={<Navigate to="/matches" replace />} />
          <Route path="/history" element={<Navigate to="/home" replace />} />
          <Route path="/groups/:groupId/chat" element={<RedirectGroupChat />} />

          {/* Walk leader tools (linked from ride detail and legacy flows) */}
          <Route path="/leader" element={<GroupLeaderHome />} />
          <Route path="/groups/:groupId/walk" element={<GroupWalkPage />} />
          <Route path="/groups/:groupId/leader" element={<GroupLeaderView />} />
        </Route>
      </Route>
    </Routes>
  )
}
