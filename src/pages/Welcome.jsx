import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import AboutHero from '../components/onboarding/AboutHero'
import {
  GettingStartedSection,
  HowItWorksSection,
  KeyFeaturesSection,
  WelcomeIntro,
} from '../components/onboarding/WelcomeAboutContent'
import WelcomeNavGrid from '../components/onboarding/WelcomeNavGrid'
import { useAuth } from '../context/AuthContext'
import { isSetupComplete, subscribeToUserProfile } from '../firebase/users'

export default function Welcome() {
  const { user } = useAuth()
  const [setupIncomplete, setSetupIncomplete] = useState(false)
  const [onboardingStep, setOnboardingStep] = useState(1)
  const [loading, setLoading] = useState(true)

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

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg">
        <p className="text-muted">Loading…</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-bg px-4 py-8 sm:py-10">
      <div className="mx-auto w-full max-w-2xl">
        {setupIncomplete && onboardingStep === 1 && (
          <p className="mb-4 text-center text-sm font-semibold text-support-blue">Step 1 of 4</p>
        )}

        <div className="kr-card overflow-hidden p-0">
          <AboutHero logoClassName="h-[120px] w-[120px] min-h-[100px] min-w-[100px]" />

          <div className="space-y-8 px-6 pb-8 pt-6 sm:px-8 sm:pb-10">
            <WelcomeIntro />

            <HowItWorksSection />

            <KeyFeaturesSection />

            <section aria-label="App navigation" className="border-t border-border pt-6">
              <WelcomeNavGrid />
            </section>

            <GettingStartedSection />

            {!setupIncomplete ? (
              <div className="text-center">
                <Link
                  to="/dashboard"
                  className="link-accent text-sm"
                >
                  ← Back to Dashboard
                </Link>
              </div>
            ) : (
              <div className="text-center">
                <Link
                  to="/dashboard"
                  className="text-sm font-semibold text-muted hover:text-primary"
                >
                  Skip for now
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
