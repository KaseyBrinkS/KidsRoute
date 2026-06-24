import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import KidsRouteLogo from '../components/KidsRouteLogo'
import { useAuth } from '../context/AuthContext'
import {
  completeWelcome,
  needsWelcome,
  subscribeToUserProfile,
} from '../firebase/users'

export default function Welcome() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(null)

  useEffect(() => {
    if (!user) return undefined

    const unsubscribe = subscribeToUserProfile(
      user.uid,
      (profile) => {
        if (!needsWelcome(profile)) {
          navigate('/dashboard', { replace: true })
        }
        setLoading(false)
      },
      () => setLoading(false),
    )

    return unsubscribe
  }, [user, navigate])

  async function handleGetStarted() {
    setBusy('start')
    try {
      await completeWelcome(user.uid)
      navigate('/my-kids')
    } catch {
      setBusy(null)
    }
  }

  async function handleGoToDashboard() {
    setBusy('dashboard')
    try {
      await completeWelcome(user.uid)
      navigate('/dashboard')
    } catch {
      setBusy(null)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg">
        <p className="text-muted">Loading…</p>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg px-4 py-10">
      <div className="kr-card w-full max-w-lg overflow-hidden p-0">
        <div className="login-hero-gradient px-8 pb-10 pt-12">
          <div className="flex flex-col items-center text-center">
            <KidsRouteLogo className="h-[140px] w-[140px] min-h-[100px] min-w-[100px] text-primary" />
            <h1 className="font-heading mt-8 text-4xl font-semibold text-primary">KidsRoute</h1>
            <p className="mt-3 text-xl font-medium text-muted">Safe walks, together.</p>
          </div>
        </div>

        <div className="space-y-6 px-8 pb-10 pt-2">
          <p className="text-center text-base leading-relaxed text-[var(--color-text)]">
            KidsRoute helps PS 150 families coordinate neighborhood walks to after-school
            activities. Add your children, sign up for their classes, and get matched with
            nearby families walking the same route on the same days.
          </p>

          <div className="flex flex-col gap-3">
            <button
              type="button"
              onClick={handleGetStarted}
              disabled={Boolean(busy)}
              className="btn-primary w-full py-3.5"
            >
              {busy === 'start' ? 'Loading…' : 'Get Started'}
            </button>
            <button
              type="button"
              onClick={handleGoToDashboard}
              disabled={Boolean(busy)}
              className="btn-secondary w-full py-3.5"
            >
              {busy === 'dashboard' ? 'Loading…' : 'Go to Dashboard'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
