import { useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import AboutHero from '../components/onboarding/AboutHero'
import { dismissActivation, isActivationDismissed } from '../utils/activationDismissal'

export default function Activation() {
  const navigate = useNavigate()

  useEffect(() => {
    if (isActivationDismissed()) {
      navigate('/home', { replace: true })
    }
  }, [navigate])

  function finish(nextPath) {
    dismissActivation()
    navigate(nextPath, { replace: true })
  }

  return (
    <div className="flex min-h-screen flex-col bg-bg px-4 py-8 sm:py-10">
      <div className="mx-auto w-full max-w-lg flex-1">
        <div className="kr-card overflow-hidden p-0">
          <AboutHero logoClassName="h-[100px] w-[100px]" logoTo="/welcome" />

          <div className="space-y-6 px-6 pb-8 pt-6 text-center sm:px-8 sm:pb-10">
            <div className="space-y-3">
              <h1 className="font-heading text-2xl font-semibold text-primary sm:text-3xl">
                You&apos;re in! Now let&apos;s find your people.
              </h1>
              <p className="text-lg font-medium text-[var(--color-text)]">
                Start by adding your kids&apos; fall schedule.
              </p>
            </div>

            <p className="text-base leading-relaxed text-muted">
              KidsRoute works by finding families whose routes overlap. Add school and
              after-school activities to start finding families already going your way.
            </p>

            <div className="space-y-3 pt-2">
              <button
                type="button"
                onClick={() => finish('/schedule')}
                className="btn-primary w-full py-3.5 text-base font-semibold tracking-wide"
              >
                ADD AN ACTIVITY
              </button>
              <p className="text-sm text-muted">Takes about 1 minute.</p>
            </div>

            <button
              type="button"
              onClick={() => finish('/home')}
              className="link-accent text-sm"
            >
              Skip for now
            </button>
          </div>
        </div>

        <p className="mt-6 text-center text-sm text-muted">
          Questions about privacy?{' '}
          <Link to="/safety" className="link-accent">
            Read our Safety &amp; Privacy FAQ
          </Link>
        </p>
      </div>
    </div>
  )
}
