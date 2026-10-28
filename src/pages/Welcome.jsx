import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import AboutHero from '../components/onboarding/AboutHero'
import {
  WelcomeActionButtons,
  getWelcomeLogoPath,
  HowItWorksSection,
  KeyFeaturesSection,
  WelcomeIntro,
} from '../components/onboarding/WelcomeAboutContent'
import WelcomeNavGrid from '../components/onboarding/WelcomeNavGrid'
import AddToHomeScreenBanner from '../components/AddToHomeScreenBanner'
import AddToHomeScreenCollapsible from '../components/AddToHomeScreenCollapsible'
import LegalFooter from '../components/LegalFooter'
import { useAuth } from '../context/AuthContext'
import { isSetupComplete, subscribeToUserProfile } from '../firebase/users'

export default function Welcome() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [setupIncomplete, setSetupIncomplete] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) {
      setLoading(false)
      return undefined
    }

    setLoading(true)
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

  function handleGetStarted() {
    navigate('/settings')
  }

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
      <div className="mx-auto w-full max-w-2xl flex-1">
        <AddToHomeScreenBanner />

        <div className="kr-card overflow-hidden p-0">
          <AboutHero
            logoClassName="h-[120px] w-[120px] min-h-[100px] min-w-[100px]"
            logoTo={logoPath}
          />

          <div className="space-y-8 px-6 pb-8 pt-6 sm:px-8 sm:pb-10">
            <WelcomeIntro />

            <WelcomeActionButtons onGetStarted={handleGetStarted} />

            <HowItWorksSection />

            <KeyFeaturesSection />

            {!setupIncomplete && (
              <section aria-label="App navigation" className="border-t border-border pt-6">
                <WelcomeNavGrid />
              </section>
            )}

            {!setupIncomplete ? (
              <div className="text-center">
                <Link to="/dashboard" className="link-accent text-sm">
                  ← Back to Dashboard
                </Link>
              </div>
            ) : null}
          </div>
        </div>
      </div>
      <AddToHomeScreenCollapsible className="mx-auto mt-6 w-full max-w-2xl" />
      <LegalFooter className="mx-auto mt-4 w-full max-w-2xl pb-4" />
    </div>
  )
}
