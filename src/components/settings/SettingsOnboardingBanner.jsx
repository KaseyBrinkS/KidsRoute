import GuidanceBanner from '../GuidanceBanner'
import { ONBOARDING_BANNER_KEY } from '../onboarding/constants'
import { dismissGuidance, isGuidanceDismissed } from '../../utils/guidanceDismissals'
import { hasCompletedBasicSetup } from '../../firebase/users'

export default function SettingsOnboardingBanner({ profile, kidCount, onDismiss }) {
  const dismissed = isGuidanceDismissed(ONBOARDING_BANNER_KEY)
  const setupDone = hasCompletedBasicSetup(profile, kidCount)

  if (dismissed || setupDone) {
    return null
  }

  function handleDismiss() {
    dismissGuidance(ONBOARDING_BANNER_KEY)
    onDismiss?.()
  }

  return (
    <GuidanceBanner onDismiss={handleDismiss} className="mb-6">
      <strong className="font-semibold">Welcome!</strong> Start by adding your phone number, home
      address, and kids below — then head to Activities to get matched with nearby families.
    </GuidanceBanner>
  )
}
