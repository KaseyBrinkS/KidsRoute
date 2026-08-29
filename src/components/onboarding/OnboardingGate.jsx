import { useEffect, useState } from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import {
  getOnboardingRedirectPath,
  isSetupComplete,
  subscribeToUserProfile,
} from '../../firebase/users'

export default function OnboardingGate() {
  const { user } = useAuth()
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

  if (!isSetupComplete(profile)) {
    return <Navigate to={getOnboardingRedirectPath(profile)} replace />
  }

  return <Outlet />
}
