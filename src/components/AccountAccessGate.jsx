import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { isAccountRemoved } from '../firebase/accessControl'
import { logOut } from '../firebase/auth'
import { subscribeToUserProfile } from '../firebase/users'

function RemovedAccountScreen() {
  const [signingOut, setSigningOut] = useState(false)

  async function handleSignOut() {
    setSigningOut(true)
    try {
      await logOut()
    } finally {
      setSigningOut(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg px-4">
      <div className="kr-card max-w-md p-8 text-center">
        <h1 className="font-heading text-xl font-semibold text-[var(--color-text)]">
          Account removed
        </h1>
        <p className="mt-4 text-sm leading-relaxed text-muted">
          Your account has been removed. Contact{' '}
          <a href="mailto:hello@kidsroute.org" className="link-accent">
            hello@kidsroute.org
          </a>{' '}
          if you think this is an error.
        </p>
        <button
          type="button"
          onClick={handleSignOut}
          disabled={signingOut}
          className="btn-secondary mt-6"
        >
          {signingOut ? 'Signing out…' : 'Sign out'}
        </button>
      </div>
    </div>
  )
}

export default function AccountAccessGate({ children }) {
  const { user } = useAuth()
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) {
      setProfile(null)
      setLoading(false)
      return undefined
    }

    setLoading(true)
    return subscribeToUserProfile(
      user.uid,
      (data) => {
        setProfile(data)
        setLoading(false)
      },
      () => setLoading(false),
    )
  }, [user?.uid])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg">
        <p className="text-muted">Loading…</p>
      </div>
    )
  }

  if (isAccountRemoved(profile)) {
    return <RemovedAccountScreen />
  }

  return children
}
