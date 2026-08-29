import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  getWelcomeFindRoutePath,
  HowItWorksSection,
} from '../components/onboarding/WelcomeAboutContent'
import WelcomeFeatureCards from '../components/onboarding/WelcomeFeatureCards'
import WelcomeHero from '../components/onboarding/WelcomeHero'
import WelcomeNavGrid from '../components/onboarding/WelcomeNavGrid'
import AddToHomeScreenBanner from '../components/AddToHomeScreenBanner'
import AddToHomeScreenCollapsible from '../components/AddToHomeScreenCollapsible'
import LegalFooter from '../components/LegalFooter'
import { useAuth } from '../context/AuthContext'
import { isSetupComplete, subscribeToUserProfile } from '../firebase/users'

export default function Welcome() {
  const { user } = useAuth()
  const [setupIncomplete, setSetupIncomplete] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return undefined

    const unsubscribe = subscribeToUserProfile(
      user.uid,
      (profile) => {
        setSetupIncomplete(!isSetupComplete(profile))
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

  const findRoutePath = getWelcomeFindRoutePath(setupIncomplete)

  return (
    <div className="flex min-h-screen flex-col bg-bg px-4 py-10 sm:py-14">
      <div className="mx-auto w-full max-w-3xl flex-1">
        <AddToHomeScreenBanner />

        <WelcomeHero findRoutePath={findRoutePath} />

        <WelcomeFeatureCards className="mt-16 sm:mt-20" />

        <HowItWorksSection className="mt-16 sm:mt-20" />

        {!setupIncomplete && (
          <section aria-label="App navigation" className="mt-16 border-t pt-10 sm:mt-20" style={{ borderColor: '#1C3A4A18' }}>
            <WelcomeNavGrid />
          </section>
        )}

        {!setupIncomplete ? (
          <div className="mt-10 text-center">
            <Link to="/dashboard" className="text-sm font-medium hover:underline" style={{ color: '#3d6b5e' }}>
              ← Back to Dashboard
            </Link>
          </div>
        ) : null}
      </div>

      <AddToHomeScreenCollapsible className="mx-auto mt-10 w-full max-w-3xl" />
      <LegalFooter className="mx-auto mt-4 w-full max-w-3xl pb-4" />
    </div>
  )
}
