import { useNavigate } from 'react-router-dom'

export function OnboardingStepActions({
  primaryLabel,
  onPrimary,
  primaryDisabled = false,
  primaryBusy = false,
  skipLabel = 'Skip for now',
}) {
  const navigate = useNavigate()

  return (
    <div className="mt-6 space-y-3">
      <button
        type="button"
        onClick={onPrimary}
        disabled={primaryDisabled || primaryBusy}
        className="btn-primary w-full py-3"
      >
        {primaryBusy ? 'Loading…' : primaryLabel}
      </button>
      <button
        type="button"
        onClick={() => navigate('/home')}
        className="btn-ghost w-full py-2 text-sm"
      >
        {skipLabel}
      </button>
    </div>
  )
}
