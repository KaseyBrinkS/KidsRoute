import { useEffect, useState } from 'react'
import PageHeader from '../components/PageHeader'
import ProfileBackLink from '../components/ProfileBackLink'
import { useAuth } from '../context/AuthContext'
import { subscribeToUserProfile, updateUserProfile } from '../firebase/users'
import { syncUserMatchingOptOut } from '../firebase/matching'

function Toggle({ label, description, checked, onChange, disabled }) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-4">
      <span>
        <span className="block text-sm font-medium text-[var(--color-text)]">{label}</span>
        {description ? <span className="mt-0.5 block text-sm text-muted">{description}</span> : null}
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

export default function ProfileNotifications() {
  const { user } = useAuth()
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [savingToggle, setSavingToggle] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!user) return undefined
    return subscribeToUserProfile(
      user.uid,
      (data) => {
        setProfile(data)
        setLoading(false)
      },
      (err) => {
        setError(err.message)
        setLoading(false)
      },
    )
  }, [user])

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

  if (loading) {
    return <div className="py-12 text-center text-muted">Loading preferences…</div>
  }

  return (
    <div className="space-y-6">
      <ProfileBackLink />
      <PageHeader
        title="Notification Preferences"
        description="Choose how you'd like to hear about matches, rides, and coordination updates."
      />

      {error ? <p className="alert-error">{error}</p> : null}

      <section className="kr-card space-y-4 p-6">
        <Toggle
          label="SMS notifications"
          description="Text alerts for walk updates, pickup reminders, and group coordination."
          checked={profile?.smsNotifications ?? true}
          disabled={savingToggle === 'smsNotifications'}
          onChange={(value) => handleToggleChange('smsNotifications', value)}
        />
        <Toggle
          label="Email notifications"
          description="Email updates about matches, rides, and messages."
          checked={profile?.emailNotifications ?? false}
          disabled={savingToggle === 'emailNotifications'}
          onChange={(value) => handleToggleChange('emailNotifications', value)}
        />
      </section>
    </div>
  )
}
