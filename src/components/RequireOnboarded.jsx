import { useEffect, useState } from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { needsWelcome, subscribeToUserProfile } from '../firebase/users'

export default function RequireOnboarded() {
  const { user } = useAuth()
  const [ready, setReady] = useState(false)
  const [showWelcome, setShowWelcome] = useState(false)

  useEffect(() => {
    if (!user) return undefined

    const unsubscribe = subscribeToUserProfile(
      user.uid,
      (profile) => {
        setShowWelcome(needsWelcome(profile))
        setReady(true)
      },
      () => setReady(true),
    )

    return unsubscribe
  }, [user])

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg">
        <p className="text-muted">Loading…</p>
      </div>
    )
  }

  if (showWelcome) {
    return <Navigate to="/welcome" replace />
  }

  return <Outlet />
}
