import { useEffect, useState } from 'react'
import AboutHero from '../components/onboarding/AboutHero'
import {
  GettingStartedSection,
  getWelcomeLogoPath,
  KeyFeaturesSection,
  WelcomeIntro,
} from '../components/onboarding/WelcomeAboutContent'
import WelcomeNavGrid from '../components/onboarding/WelcomeNavGrid'
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

  const logoPath = getWelcomeLogoPath(setupIncomplete)

  return (
    <div className="flex min-h-screen flex-col bg-bg px-4 py-8 sm:py-10">
      <div className="mx-auto w-full max-w-2xl flex-1 space-y-6">
        <section aria-labelledby="welcome-hero-heading" className="kr-card overflow-hidden p-0">
          <h2 id="welcome-hero-heading" className="sr-only">
            Welcome to KidsRoute
          </h2>
          <AboutHero
            logoClassName="h-[120px] w-[120px] min-h-[100px] min-w-[100px]"
            logoTo={logoPath}
          />
          <GettingStartedSection />
        </section>

        <WelcomeIntro />

        <KeyFeaturesSection />

        <section aria-label="App navigation" className="kr-card p-6">
          <WelcomeNavGrid />
        </section>
      </div>

      <AddToHomeScreenCollapsible className="mx-auto mt-6 w-full max-w-2xl text-center" />
      <LegalFooter className="mx-auto mt-4 w-full max-w-2xl pb-4" />
    </div>
  )
}
