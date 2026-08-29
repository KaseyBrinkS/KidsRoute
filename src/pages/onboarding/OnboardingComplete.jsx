import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import OnboardingShell from '../../components/onboarding/OnboardingShell'
import { useAuth } from '../../context/AuthContext'
import { useOnboardingStepGuard } from '../../hooks/useOnboardingStepGuard'
import { completeOnboarding } from '../../firebase/users'

export default function OnboardingComplete() {
  const navigate = useNavigate()
  const { user } = useAuth()
  useOnboardingStepGuard(4)

  const [busy, setBusy] = useState(null)
  const [error, setError] = useState(null)

  async function finishSetup(destination) {
    setError(null)
    setBusy(destination)
    try {
      await completeOnboarding(user.uid)
      navigate(destination, { replace: true })
    } catch (err) {
      setError(err.message)
      setBusy(null)
    }
  }

  return (
    <OnboardingShell
      step={4}
      title="You're all set!"
      description="Your family profile is ready. Here's how to start finding walk groups."
    >
      <p className="text-base leading-relaxed text-[var(--color-text)]">
        Head to the Groups tab to see your matches, or go to Activities to add your kids&apos;
        after-school activities and weekend classes to start getting matched with nearby families.
      </p>

      {error && <p className="alert-error mt-4">{error}</p>}

      <div className="mt-6 space-y-3">
        <button
          type="button"
          onClick={() => finishSetup('/my-activities')}
          disabled={Boolean(busy)}
          className="btn-primary w-full py-3"
        >
          {busy === '/my-activities' ? 'Loading…' : 'Add Activities'}
        </button>
        <button
          type="button"
          onClick={() => finishSetup('/dashboard')}
          disabled={Boolean(busy)}
          className="btn-secondary w-full py-3"
        >
          {busy === '/dashboard' ? 'Loading…' : 'Go to Dashboard'}
        </button>
      </div>
    </OnboardingShell>
  )
}
