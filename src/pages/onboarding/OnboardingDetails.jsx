import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import OnboardingShell from '../../components/onboarding/OnboardingShell'
import { RequireOnboardingRoute } from '../../components/RequireOnboarded'
import { useAuth } from '../../context/AuthContext'
import { validateHomeAddressFields } from '../../firebase/buildingWalks'
import { advanceOnboardingStep, subscribeToUserProfile, updateUserProfile } from '../../firebase/users'

export default function OnboardingDetails() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [phoneNumber, setPhoneNumber] = useState('')
  const [streetNumber, setStreetNumber] = useState('')
  const [streetName, setStreetName] = useState('')
  const [zipCode, setZipCode] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!user) return

    const unsubscribe = subscribeToUserProfile(
      user.uid,
      (profile) => {
        setPhoneNumber(profile.phoneNumber ?? '')
        setStreetNumber(profile.streetNumber ?? '')
        setStreetName(profile.streetName ?? '')
        setZipCode(profile.zipCode ?? '')
        setLoading(false)
      },
      (err) => {
        setError(err.message)
        setLoading(false)
      },
    )

    return unsubscribe
  }, [user])

  async function handleNext(event) {
    event.preventDefault()
    setError(null)

    const trimmedPhone = phoneNumber.trim()
    if (!trimmedPhone) {
      setError('Enter a phone number so other parents can reach you during walks.')
      return
    }

    const addressError = validateHomeAddressFields({
      streetNumber,
      streetName,
      zipCode,
    })
    if (addressError) {
      setError(addressError)
      return
    }

    setSubmitting(true)
    try {
      await updateUserProfile(user.uid, {
        phoneNumber: trimmedPhone,
        streetNumber: streetNumber.trim(),
        streetName: streetName.trim(),
        zipCode: zipCode.trim(),
      })
      await advanceOnboardingStep(user.uid, 4)
      navigate('/onboarding/activity')
    } catch (err) {
      setError(err.message)
      setSubmitting(false)
    }
  }

  return (
    <RequireOnboardingRoute minStep={3}>
      <OnboardingShell
        step={3}
        title="Your details"
        description="Your phone number and home address help us find walking group matches nearby. This information is kept private and only shared with families in your confirmed walk groups."
      >
        {loading ? (
          <p className="text-muted">Loading…</p>
        ) : (
          <form onSubmit={handleNext} className="space-y-4">
            <div>
              <label htmlFor="phoneNumber" className="block text-sm font-medium text-[var(--color-text)]">
                Phone number
              </label>
              <input
                id="phoneNumber"
                name="phoneNumber"
                type="tel"
                required
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="(555) 555-5555"
                className="input-kr"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label htmlFor="streetNumber" className="block text-sm font-medium text-[var(--color-text)]">
                  Street number
                </label>
                <input
                  id="streetNumber"
                  name="streetNumber"
                  type="text"
                  required
                  value={streetNumber}
                  onChange={(e) => setStreetNumber(e.target.value)}
                  placeholder="123"
                  className="input-kr"
                />
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="streetName" className="block text-sm font-medium text-[var(--color-text)]">
                  Street name
                </label>
                <input
                  id="streetName"
                  name="streetName"
                  type="text"
                  required
                  value={streetName}
                  onChange={(e) => setStreetName(e.target.value)}
                  placeholder="Warren Street"
                  className="input-kr"
                />
              </div>
            </div>

            <div>
              <label htmlFor="zipCode" className="block text-sm font-medium text-[var(--color-text)]">
                Zip code
              </label>
              <input
                id="zipCode"
                name="zipCode"
                type="text"
                required
                value={zipCode}
                onChange={(e) => setZipCode(e.target.value)}
                placeholder="10013"
                className="input-kr"
              />
            </div>

            {error && <p className="alert-error">{error}</p>}

            <button type="submit" disabled={submitting} className="btn-primary w-full py-3">
              {submitting ? 'Saving…' : 'Next'}
            </button>
          </form>
        )}
      </OnboardingShell>
    </RequireOnboardingRoute>
  )
}
