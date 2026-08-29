import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import PageHeader from '../components/PageHeader'
import ConfirmDialog from '../components/ConfirmDialog'
import SettingsActivitiesPrompt from '../components/settings/SettingsActivitiesPrompt'
import SettingsOnboardingBanner from '../components/settings/SettingsOnboardingBanner'
import AddToHomeScreenBanner from '../components/AddToHomeScreenBanner'
import MyKidsSection from '../components/settings/MyKidsSection'
import SchoolSelect from '../components/SchoolSelect'
import SchoolVerifiedBadge from '../components/SchoolVerifiedBadge'
import { useAuth } from '../context/AuthContext'
import { logOut } from '../firebase/auth'
import { deleteUserAccount } from '../firebase/deleteAccount'
import { isAdmin } from '../firebase/admin'
import { syncUserMatchingOptOut } from '../firebase/matching'
import { subscribeToKids } from '../firebase/kids'
import {
  formatSchoolDisplay,
  resolveAndRegisterSchool,
  resolveSchoolValue,
  schoolCustomValue,
  schoolSelectValue,
} from '../firebase/schools'
import {
  allSchoolNames,
  registerCommunitySchool,
  subscribeToSchools,
} from '../firebase/schoolsRegistry'
import {
  completeOnboarding,
  DEFAULT_SCHOOL,
  hasCompletedBasicSetup,
  subscribeToUserProfile,
  updateUserProfile,
} from '../firebase/users'
import {
  formatHomeAddressDisplay,
  syncBuildingWalkChildren,
  validateHomeAddressFields,
} from '../firebase/buildingWalks'
import { isActivationDismissed } from '../utils/activationDismissal'

const inputClass = 'input-kr'

function SettingsSection({ title, description, children, prominent = false }) {
  return (
    <section
      className={`kr-card p-6 ${prominent ? 'ring-2 ring-primary/15' : ''}`}
    >
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
  const [kidCount, setKidCount] = useState(0)
  const [kidsLoading, setKidsLoading] = useState(true)
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
  const [schoolOptions, setSchoolOptions] = useState([])
  const [savingSchool, setSavingSchool] = useState(false)
  const [schoolSaved, setSchoolSaved] = useState(false)
  const [schoolConfirmedChecked, setSchoolConfirmedChecked] = useState(false)
  const [bannerRefresh, setBannerRefresh] = useState(0)
  const [showActivitiesPrompt, setShowActivitiesPrompt] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [deletingAccount, setDeletingAccount] = useState(false)
  const setupCompleteRef = useRef(null)

  useEffect(() => {
    if (!user) return undefined

    setKidsLoading(true)

    const unsubSchools = subscribeToSchools(setSchoolOptions, (err) => setError(err.message))

    const unsubProfile = subscribeToUserProfile(
      user.uid,
      (data) => {
        setProfile(data)
        setPhoneNumber(data.phoneNumber ?? '')
        setStreetNumber(data.streetNumber ?? '')
        setStreetName(data.streetName ?? '')
        setZipCode(data.zipCode ?? '')
        setLoading(false)
      },
      (err) => {
        setError(err.message)
        setLoading(false)
      },
    )

    const unsubKids = subscribeToKids(user.uid, (kids) => {
      setKidCount(kids.length)
      setKidsLoading(false)
    })

    return () => {
      unsubSchools()
      unsubProfile()
      unsubKids()
    }
  }, [user])

  useEffect(() => {
    if (!profile?.school || schoolOptions.length === 0) return
    const names = allSchoolNames(schoolOptions)
    setSchoolSelect(schoolSelectValue(profile.school, names))
    setSchoolCustom(schoolCustomValue(profile.school, names))
  }, [profile?.school, schoolOptions])

  const pendingSchoolName = useMemo(() => {
    try {
      return resolveSchoolValue(schoolSelect, schoolCustom)
    } catch {
      return null
    }
  }, [schoolSelect, schoolCustom])

  useEffect(() => {
    if (!pendingSchoolName || !profile?.school) return
    if (profile.school === pendingSchoolName && profile.schoolConfirmed) {
      setSchoolConfirmedChecked(true)
    }
  }, [pendingSchoolName, profile?.school, profile?.schoolConfirmed])

  useEffect(() => {
    if (!user || !profile || kidsLoading) return

    const setupComplete = hasCompletedBasicSetup(profile, kidCount)
    if (setupCompleteRef.current === null) {
      setupCompleteRef.current = setupComplete
      return
    }

    if (setupComplete && !setupCompleteRef.current && !isActivationDismissed()) {
      navigate('/activation', { replace: true })
    }

    setupCompleteRef.current = setupComplete
  }, [user, profile, kidCount, kidsLoading, navigate])

  useEffect(() => {
    if (!user || !profile) return
    if (!hasCompletedBasicSetup(profile, kidCount)) return

    completeOnboarding(user.uid).catch(() => {})
  }, [user, profile, kidCount])

  async function handleSavePhone(event) {
    event.preventDefault()
    if (!user) return

    setError(null)
    setPhoneSaved(false)
    setSavingPhone(true)
    try {
      await updateUserProfile(user.uid, { phoneNumber: phoneNumber.trim() })
      setPhoneSaved(true)
      setShowActivitiesPrompt(true)
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
      setShowActivitiesPrompt(true)
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

    if (!schoolConfirmedChecked) {
      setError('Please confirm you are a parent or guardian of a child enrolled at this school.')
      return
    }

    setError(null)
    setSchoolSaved(false)
    setSavingSchool(true)
    try {
      const school = await resolveAndRegisterSchool(
        schoolSelect,
        schoolCustom,
        registerCommunitySchool,
      )
      await updateUserProfile(user.uid, { school, schoolConfirmed: true })
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

  async function handleDeleteAccount() {
    if (!user) return

    setError(null)
    setDeletingAccount(true)
    try {
      await deleteUserAccount(user.uid)
      navigate('/login', { replace: true })
    } catch (err) {
      setError(err.message)
      setShowDeleteDialog(false)
    } finally {
      setDeletingAccount(false)
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
        description="Your profile, kids, and notification preferences"
      />

      <AddToHomeScreenBanner />

      {error && (
        <p className="mb-4 rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
      )}

      <SettingsOnboardingBanner
        key={bannerRefresh}
        profile={profile}
        kidCount={kidCount}
        onDismiss={() => setBannerRefresh((value) => value + 1)}
      />

      {showActivitiesPrompt && <SettingsActivitiesPrompt />}

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
              Used for walk coordination and safety notifications from your group.
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
              <button type="submit" disabled={savingPhone} className="btn-primary">
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
          prominent
          title="My Kids"
          description="Add each child’s name, grade, and school so we can match your family with nearby walk groups."
        >
          <MyKidsSection
            onError={setError}
            onKidsChanged={() => setShowActivitiesPrompt(true)}
          />
        </SettingsSection>

        <SettingsSection
          title="Home address"
          description="Used to match you with families in your building for morning and afternoon school walks, and after-school walk home coordination. Never shared publicly."
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
              <button type="submit" disabled={savingHomeAddress} className="btn-primary">
                {savingHomeAddress ? 'Saving…' : 'Save address'}
              </button>
            </div>
            {homeAddressSaved && (
              <p className="mt-2 text-sm text-green-600">Home address saved.</p>
            )}
          </form>
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
                schoolOptions={schoolOptions}
                onSelectChange={(event) => {
                  setSchoolSelect(event.target.value)
                  setSchoolSaved(false)
                  setSchoolConfirmedChecked(false)
                }}
                onCustomChange={(event) => {
                  setSchoolCustom(event.target.value)
                  setSchoolSaved(false)
                  setSchoolConfirmedChecked(false)
                }}
              />
            </div>
            {pendingSchoolName && (
              <label className="mt-4 flex cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  checked={schoolConfirmedChecked}
                  onChange={(event) => {
                    setSchoolConfirmedChecked(event.target.checked)
                    setSchoolSaved(false)
                  }}
                  className="mt-1 h-4 w-4 rounded border-border text-primary focus:ring-primary"
                />
                <span className="text-sm leading-relaxed text-[var(--color-text)]">
                  I confirm I am a parent or guardian of a child enrolled at{' '}
                  <span className="font-medium">{formatSchoolDisplay(pendingSchoolName)}</span>.
                </span>
              </label>
            )}
            <div className="mt-4">
              <button
                type="submit"
                disabled={savingSchool || loading || !schoolConfirmedChecked || !pendingSchoolName}
                className="btn-primary"
              >
                {savingSchool ? 'Saving…' : 'Save school'}
              </button>
            </div>
            {schoolSaved && (
              <p className="mt-2 text-sm text-green-600">School saved.</p>
            )}
            {!loading && profile?.school && (
              <p className="mt-3 flex flex-wrap items-center gap-2 text-sm text-muted">
                <span>Current: {formatSchoolDisplay(profile.school)}</span>
                {profile.schoolConfirmed && <SchoolVerifiedBadge />}
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

        <div className="kr-card border-red-200 p-6">
          <h2 className="font-heading text-lg font-semibold text-red-700">Delete account</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            Permanently remove your account and all associated data from KidsRoute.
          </p>
          <button
            type="button"
            onClick={() => setShowDeleteDialog(true)}
            disabled={deletingAccount}
            className="mt-4 rounded-2xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-50"
          >
            Delete my account
          </button>
        </div>
      </div>

      <ConfirmDialog
        open={showDeleteDialog}
        title="Delete your account?"
        message="This will permanently delete your account and all your data including your children's profiles, activities, and walk history. This cannot be undone."
        confirmLabel="Delete my account"
        cancelLabel="Cancel"
        busy={deletingAccount}
        onConfirm={handleDeleteAccount}
        onCancel={() => {
          if (!deletingAccount) setShowDeleteDialog(false)
        }}
      />
    </div>
  )
}
