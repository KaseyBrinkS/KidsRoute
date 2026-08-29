import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  getOnboardingRedirectPath,
  isSetupComplete,
  subscribeToUserProfile,
} from '../firebase/users'

export function useOnboardingStepGuard(requiredStep) {
  const navigate = useNavigate()
  const { user } = useAuth()

  useEffect(() => {
    if (!user) return undefined

    return subscribeToUserProfile(
      user.uid,
      (profile) => {
        if (isSetupComplete(profile)) {
          navigate('/welcome', { replace: true })
          return
        }

        const currentStep = profile.onboardingStep ?? 1
        if (currentStep !== requiredStep) {
          navigate(getOnboardingRedirectPath(profile), { replace: true })
        }
      },
      () => {},
    )
  }, [user, requiredStep, navigate])
}
