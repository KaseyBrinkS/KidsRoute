import { useEffect, useState } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { isAdmin } from '../firebase/admin'
import {
  ACCESS_GATE_PATHS,
  getAccessGatePath,
  hasFullAccess,
} from '../firebase/accessControl'
import { getOnboardingRedirectPath, isSetupComplete, subscribeToUserProfile } from '../firebase/users'
import NotFound from './NotFound'

export default function AccessGate() {
  const { user } = useAuth()
  const location = useLocation()
  const [profile, setProfile] = useState(null)
  const [profileLoaded, setProfileLoaded] = useState(false)

  useEffect(() => {
    if (!user) return undefined

    return subscribeToUserProfile(
      user.uid,
      (data) => {
        setProfile(data)
        setProfileLoaded(true)
      },
      () => setProfileLoaded(true),
    )
  }, [user])

  if (!profileLoaded || profile?._profileExists === false) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg">
        <p className="text-muted">Loading…</p>
      </div>
    )
  }

  const gatePath = getAccessGatePath(profile)
  const onAdminRoute = location.pathname === '/admin'
  const userIsAdmin = isAdmin(user?.uid)

  if (onAdminRoute) {
    if (!userIsAdmin) {
      return <NotFound />
    }
    return <Outlet />
  }

  if (gatePath) {
    if (location.pathname !== gatePath) {
      return <Navigate to={gatePath} replace />
    }
    return <Outlet />
  }

  if (ACCESS_GATE_PATHS.includes(location.pathname)) {
    if (!isSetupComplete(profile)) {
      return <Navigate to={getOnboardingRedirectPath(profile)} replace />
    }
    return <Navigate to="/dashboard" replace />
  }

  if (!hasFullAccess(profile)) {
    return <Navigate to={getAccessGatePath(profile) ?? '/invite-code'} replace />
  }

  return <Outlet />
}
