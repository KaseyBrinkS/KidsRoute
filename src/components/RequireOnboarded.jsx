import { useEffect, useState } from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getOnboardingRedirectPath, needsOnboarding, subscribeToUserProfile } from '../firebase/users'

export default function RequireOnboarded() {
  const { user } = useAuth()
  const [ready, setReady] = useState(false)
  const [redirectPath, setRedirectPath] = useState(null)

  useEffect(() => {
    if (!user) return undefined

    const unsubscribe = subscribeToUserProfile(
      user.uid,
      (profile) => {
        setRedirectPath(getOnboardingRedirectPath(profile))
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

  if (redirectPath) {
    return <Navigate to={redirectPath} replace />
  }

  return <Outlet />
}

export function RequireOnboardingRoute({ minStep, children }) {
  const { user } = useAuth()
  const [ready, setReady] = useState(false)
  const [redirectPath, setRedirectPath] = useState(null)

  useEffect(() => {
    if (!user) return undefined

    const unsubscribe = subscribeToUserProfile(
      user.uid,
      (profile) => {
        if (!needsOnboarding(profile)) {
          setRedirectPath('/dashboard')
        } else {
          const currentStep = profile.onboardingStep ?? 1
          if (currentStep < minStep) {
            setRedirectPath(getOnboardingRedirectPath(profile))
          }
        }
        setReady(true)
      },
      () => setReady(true),
    )

    return unsubscribe
  }, [user, minStep])

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg">
        <p className="text-muted">Loading…</p>
      </div>
    )
  }

  if (redirectPath) {
    return <Navigate to={redirectPath} replace />
  }

  return children
}
