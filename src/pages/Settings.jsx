import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import PageHeader from '../components/PageHeader'
import MyKidsSection from '../components/settings/MyKidsSection'
import SchoolSelect from '../components/SchoolSelect'
import { useAuth } from '../context/AuthContext'
import { logOut } from '../firebase/auth'
import { isAdmin } from '../firebase/admin'
import { syncUserMatchingOptOut } from '../firebase/matching'
import {
  formatSchoolDisplay,
  resolveSchoolValue,
  schoolCustomValue,
  schoolSelectValue,
} from '../firebase/schools'
import {
  DEFAULT_SCHOOL,
  subscribeToUserProfile,
  updateUserProfile,
} from '../firebase/users'
import {
  formatHomeAddressDisplay,
  syncBuildingWalkChildren,
  validateHomeAddressFields,
} from '../firebase/buildingWalks'

const inputClass = 'input-kr'

function SettingsSection({ id, title, description, children }) {
  return (
    <section id={id} className="kr-card p-6 scroll-mt-24">
      <h2 className="kr-section-title">{title}</h2>
      {description && <p className="kr-section-desc">{description}</p>}
      <div className="mt-4">{children}</div>
    </section>
  )
}

function Toggle({ label, description, checked, onChange, disabled }) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-4">
      <span>
        <span className="block text-sm font-medium text-[var(--color-text)]">{label}</span>
        {description && <span className="mt-0.5 block text-sm text-muted">{description}</span>}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative mt-0.5 inline-flex h-6 w-11 shrink-0 rounded-full transition-colors disabled:opacity-50 ${
          checked ? 'bg-primary' : 'bg-border'
        }`}
      >
        <span
          className={`inline-block h-5 w-5 translate-y-0.5 rounded-full bg-surface shadow transition-transform ${
            checked ? 'translate-x-5' : 'translate-x-0.5'
          }`}
        />
      </button>
    </label>
  )
}

export default function Settings() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [profile, setProfile] = useState(null)
  const [phoneNumber, setPhoneNumber] = useState('')
  const [streetNumber, setStreetNumber] = useState('')
  const [streetName, setStreetName] = useState('')
  const [zipCode, setZipCode] = useState('')
  const [loading, setLoading] = useState(true)
  const [savingPhone, setSavingPhone] = useState(false)
  const [savingHomeAddress, setSavingHomeAddress] = useState(false)
  const [savingToggle, setSavingToggle] = useState(null)
  const [signingOut, setSigningOut] = useState(false)
  const [error, setError] = useState(null)
  const [phoneSaved, setPhoneSaved] = useState(false)
  const [homeAddressSaved, setHomeAddressSaved] = useState(false)
  const [schoolSelect, setSchoolSelect] = useState(DEFAULT_SCHOOL)
  const [schoolCustom, setSchoolCustom] = useState('')
  const [savingSchool, setSavingSchool] = useState(false)
  const [schoolSaved, setSchoolSaved] = useState(false)

  useEffect(() => {
    if (!user) return

    const unsubscribe = subscribeToUserProfile(
      user.uid,
      (data) => {
        setProfile(data)
        setPhoneNumber(data.phoneNumber ?? '')
        setStreetNumber(data.streetNumber ?? '')
        setStreetName(data.streetName ?? '')
        setZipCode(data.zipCode ?? '')
        setSchoolSelect(schoolSelectValue(data.school))
        setSchoolCustom(schoolCustomValue(data.school))
        setLoading(false)
      },
      (err) => {
        setError(err.message)
        setLoading(false)
      },
    )

    return unsubscribe
  }, [user])

  useEffect(() => {
    if (window.location.hash === '#my-kids') {
      document.getElementById('my-kids')?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [])

  async function handleSavePhone(event) {
    event.preventDefault()
    if (!user) return

    setError(null)
    setPhoneSaved(false)
    setSavingPhone(true)
    try {
      await updateUserProfile(user.uid, { phoneNumber: phoneNumber.trim() })
      setPhoneSaved(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setSavingPhone(false)
    }
  }

  async function handleSaveHomeAddress(event) {
    event.preventDefault()
    if (!user) return

    const validationError = validateHomeAddressFields({ streetNumber, streetName, zipCode })
    if (validationError) {
      setError(validationError)
      return
    }

    setError(null)
    setHomeAddressSaved(false)
    setSavingHomeAddress(true)
    try {
      await updateUserProfile(user.uid, {
        streetNumber: streetNumber.trim(),
        streetName: streetName.trim(),
        zipCode: zipCode.trim(),
      })
      await syncBuildingWalkChildren(user.uid)
      setHomeAddressSaved(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setSavingHomeAddress(false)
    }
  }

  async function handleToggleChange(field, value) {
    if (!user) return

    setError(null)
    setSavingToggle(field)
    try {
      await updateUserProfile(user.uid, { [field]: value })

      if (field === 'matchingOptOut') {
        await syncUserMatchingOptOut(user.uid, value)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setSavingToggle(null)
    }
  }

  async function handleSaveSchool(event) {
    event.preventDefault()
    if (!user) return

    setError(null)
    setSchoolSaved(false)
    setSavingSchool(true)
    try {
      const school = resolveSchoolValue(schoolSelect, schoolCustom)
      await updateUserProfile(user.uid, { school })
      setSchoolSaved(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setSavingSchool(false)
    }
  }

  async function handleSignOut() {
    setError(null)
    setSigningOut(true)
    try {
      await logOut()
      navigate('/login')
    } catch (err) {
      setError(err.message)
    } finally {
      setSigningOut(false)
    }
  }

  if (!user) return null

  const displayName = profile?.displayName || user.displayName || 'Parent'
  const email = profile?.email || user.email || ''
  const formattedHomeAddress = formatHomeAddressDisplay({ streetNumber, streetName, zipCode })

  return (
    <div>
      <PageHeader
        title="Settings"
        description="Account and notification preferences"
      />

      {error && (
        <p className="mb-4 rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
      )}

      <div className="space-y-6">
          <SettingsSection
            title="Parent profile"
            description="Your phone number is used for group coordination and SMS notifications."
          >
            <dl className="space-y-4">
              <div>
                <dt className="text-sm font-medium text-[var(--color-text)]">Name</dt>
                <dd className="mt-1 text-sm text-[var(--color-text)]">
                  {loading ? 'Loading…' : displayName}
                </dd>
              </div>
            </dl>

            <form onSubmit={handleSavePhone} className="mt-4">
              <label htmlFor="phoneNumber" className="block text-sm font-semibold text-[var(--color-text)]">
                Phone number
              </label>
              <p className="mt-1 text-sm text-muted">
                Your primary contact for group coordination and SMS notifications.
              </p>
              <div className="mt-1 flex flex-wrap gap-2">
                <input
                  id="phoneNumber"
                  name="phoneNumber"
                  type="tel"
                  value={phoneNumber}
                  onChange={(event) => {
                    setPhoneNumber(event.target.value)
                    setPhoneSaved(false)
                  }}
                  placeholder="(555) 555-5555"
                  className={`${inputClass} mt-0 max-w-xs flex-1`}
                />
                <button
                  type="submit"
                  disabled={savingPhone}
                  className="btn-primary"
                >
                  {savingPhone ? 'Saving…' : 'Save'}
                </button>
              </div>
              {phoneSaved && (
                <p className="mt-2 text-sm text-green-600">Phone number saved.</p>
              )}
            </form>

            <dl className="mt-6 space-y-4">
              <div>
                <dt className="text-sm font-medium text-[var(--color-text)]">Email</dt>
                <dd className="mt-1 text-sm text-muted">
                  {loading ? 'Loading…' : email}
                </dd>
              </div>
            </dl>
          </SettingsSection>

          <SettingsSection
            title="Home address"
            description="Used to match you with neighbors for building walks. Neighbors are matched by street number and zip code."
          >
            <form onSubmit={handleSaveHomeAddress}>
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label htmlFor="streetNumber" className="block text-sm font-medium text-[var(--color-text)]">
                    Street number
                  </label>
                  <input
                    id="streetNumber"
                    name="streetNumber"
                    type="text"
                    inputMode="numeric"
                    value={streetNumber}
                    onChange={(event) => {
                      setStreetNumber(event.target.value)
                      setHomeAddressSaved(false)
                    }}
                    placeholder="123"
                    className={inputClass}
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
                    value={streetName}
                    onChange={(event) => {
                      setStreetName(event.target.value)
                      setHomeAddressSaved(false)
                    }}
                    placeholder="Warren Street"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label htmlFor="zipCode" className="block text-sm font-medium text-[var(--color-text)]">
                    Zip code
                  </label>
                  <input
                    id="zipCode"
                    name="zipCode"
                    type="text"
                    inputMode="numeric"
                    value={zipCode}
                    onChange={(event) => {
                      setZipCode(event.target.value)
                      setHomeAddressSaved(false)
                    }}
                    placeholder="10013"
                    className={inputClass}
                  />
                </div>
              </div>

              {formattedHomeAddress && (
                <p className="mt-3 text-sm text-gray-600">
                  <span className="font-medium text-gray-700">Your address: </span>
                  {formattedHomeAddress}
                </p>
              )}

              <div className="mt-4">
                <button
                  type="submit"
                  disabled={savingHomeAddress}
                  className="btn-primary"
                >
                  {savingHomeAddress ? 'Saving…' : 'Save address'}
                </button>
              </div>
              {homeAddressSaved && (
                <p className="mt-2 text-sm text-green-600">Home address saved.</p>
              )}
            </form>
          </SettingsSection>

          <SettingsSection
            id="my-kids"
            title="My Kids"
            description="Manage your children's profiles — name, grade, and school."
          >
            <MyKidsSection onError={setError} />
          </SettingsSection>

          <SettingsSection
            title="Notification preferences"
            description="Choose how you'd like to hear from KidsRoute."
          >
            <div className="space-y-4 divide-y divide-gray-100">
              <Toggle
                label="SMS notifications"
                description="Get text message alerts for walk updates and group coordination."
                checked={profile?.smsNotifications ?? true}
                disabled={savingToggle === 'smsNotifications'}
                onChange={(value) => handleToggleChange('smsNotifications', value)}
              />
              <div className="pt-4">
                <Toggle
                  label="Email notifications"
                  description="Get updates about matches, groups, and walks by email."
                  checked={profile?.emailNotifications ?? false}
                  disabled={savingToggle === 'emailNotifications'}
                  onChange={(value) => handleToggleChange('emailNotifications', value)}
                />
              </div>
            </div>
          </SettingsSection>

          <SettingsSection
            title="Privacy"
            description="Control whether your family appears in the matching pool."
          >
            <Toggle
              label="Opt out of matching"
              description="When enabled, your kids won't appear in the matching pool and no new matches will be suggested."
              checked={profile?.matchingOptOut ?? false}
              disabled={savingToggle === 'matchingOptOut'}
              onChange={(value) => handleToggleChange('matchingOptOut', value)}
            />
          </SettingsSection>

          <SettingsSection
            title="School"
            description="Used for morning and afternoon building walks — kids must attend this school to join those walks. Activity matching works across all schools."
          >
            <form onSubmit={handleSaveSchool}>
              <label htmlFor="settings-school" className="block text-sm font-medium text-[var(--color-text)]">
                Your school
              </label>
              <div className="mt-1 max-w-md">
                <SchoolSelect
                  selectId="settings-school"
                  customId="settings-school-custom"
                  selectValue={schoolSelect}
                  customValue={schoolCustom}
                  onSelectChange={(event) => {
                    setSchoolSelect(event.target.value)
                    setSchoolSaved(false)
                  }}
                  onCustomChange={(event) => {
                    setSchoolCustom(event.target.value)
                    setSchoolSaved(false)
                  }}
                />
              </div>
              <div className="mt-4">
                <button type="submit" disabled={savingSchool || loading} className="btn-primary">
                  {savingSchool ? 'Saving…' : 'Save school'}
                </button>
              </div>
              {schoolSaved && (
                <p className="mt-2 text-sm text-green-600">School saved.</p>
              )}
              {!loading && profile?.school && (
                <p className="mt-3 text-sm text-muted">
                  Current: {formatSchoolDisplay(profile.school)}
                </p>
              )}
            </form>
          </SettingsSection>

          {isAdmin(user.uid) && (
            <SettingsSection
              title="Admin"
              description="View families who have signed up for KidsRoute."
            >
              <Link to="/admin" className="btn-secondary inline-flex">
                Open admin panel
              </Link>
            </SettingsSection>
          )}

          <div className="kr-card p-6">
            <button
              type="button"
              onClick={handleSignOut}
              disabled={signingOut}
              className="btn-secondary"
            >
              {signingOut ? 'Signing out…' : 'Sign out'}
            </button>
          </div>
        </div>
    </div>
  )
}
