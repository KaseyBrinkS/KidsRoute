import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AboutHero, { AboutDescription } from '../components/onboarding/AboutHero'
import { useAuth } from '../context/AuthContext'
import {
  advanceOnboardingStep,
  getOnboardingRedirectPath,
  isSetupComplete,
  subscribeToUserProfile,
} from '../firebase/users'

export default function Welcome() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [setupIncomplete, setSetupIncomplete] = useState(false)
  const [onboardingStep, setOnboardingStep] = useState(1)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!user) return undefined

    const unsubscribe = subscribeToUserProfile(
      user.uid,
      (profile) => {
        setSetupIncomplete(!isSetupComplete(profile))
        setOnboardingStep(profile.onboardingStep ?? 1)
        setLoading(false)
      },
      () => setLoading(false),
    )

    return unsubscribe
  }, [user])

  async function handleGetStarted() {
    setBusy(true)
    try {
      if (onboardingStep > 1) {
        navigate(getOnboardingRedirectPath({ welcomeCompleted: false, onboardingStep }))
        return
      }
      await advanceOnboardingStep(user.uid, 2)
      navigate('/onboarding/kids')
    } catch {
      setBusy(false)
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
        {setupIncomplete && onboardingStep === 1 && (
          <p className="pt-6 text-center text-sm font-semibold text-primary">Step 1 of 4</p>
        )}

        <AboutHero logoClassName="h-[140px] w-[140px] min-h-[100px] min-w-[100px]" />

        <div className="space-y-6 px-8 pb-10 pt-2">
          <AboutDescription />

          <div className="flex flex-col gap-3">
            {setupIncomplete ? (
              <>
                <button
                  type="button"
                  onClick={handleGetStarted}
                  disabled={busy}
                  className="btn-primary w-full py-3.5"
                >
                  {busy ? 'Loading…' : onboardingStep > 1 ? 'Continue setup' : 'Get Started'}
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/dashboard')}
                  className="btn-ghost w-full py-2"
                >
                  Skip for now
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => navigate('/dashboard')}
                className="btn-primary w-full py-3.5"
              >
                Back to Dashboard
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
