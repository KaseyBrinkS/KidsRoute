import { useState } from 'react'
import { isGroupPhoneShared, setGroupPhoneSharing } from '../firebase/groupPhoneSharing'

function PhoneSharingToggle({ checked, disabled, onChange }) {
  return (
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
  )
}

export default function GroupPhoneSharingToggle({ group, groupId, userId }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  const shared = isGroupPhoneShared(group, userId)

  async function handleChange(nextValue) {
    setError(null)
    setBusy(true)
    try {
      await setGroupPhoneSharing(groupId, userId, nextValue, group)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="kr-card-subsection mb-6">
      <label className="flex cursor-pointer items-start justify-between gap-4">
        <span className="min-w-0">
          <span className="block text-sm font-medium text-[var(--color-text)]">
            Share phone number with group members for emergencies
          </span>
          <span className="mt-1 block text-xs leading-relaxed text-muted">
            Your number will only be visible to approved families in this group.
          </span>
        </span>
        <PhoneSharingToggle checked={shared} disabled={busy} onChange={handleChange} />
      </label>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  )
}
