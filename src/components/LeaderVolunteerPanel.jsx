import { useMemo, useState } from 'react'
import {
  formatDisplayDate,
  getCurrentSessionInfo,
  getGroupUpcomingScheduledDates,
  getVolunteerSessionOptions,
} from '../firebase/sessions'
import { volunteerForDates, volunteerForSemester } from '../firebase/leaderVolunteers'

export default function LeaderVolunteerPanel({ group, userId, leaderName, onVolunteered }) {
  const sessionOptions = useMemo(() => getVolunteerSessionOptions(), [])
  const defaultSessionKey = useMemo(() => {
    const current = getCurrentSessionInfo()
    return sessionOptions.find((option) => option.id === current.id)?.sessionKey
      ?? sessionOptions[0]?.sessionKey
  }, [sessionOptions])

  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState('semester')
  const [selectedSessionKey, setSelectedSessionKey] = useState(defaultSessionKey)
  const [selectedDates, setSelectedDates] = useState([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  const scheduledDates = useMemo(
    () => getGroupUpcomingScheduledDates(group),
    [group],
  )

  function handleOpen() {
    setMode('semester')
    setSelectedSessionKey(defaultSessionKey)
    setSelectedDates(scheduledDates.length > 0 ? [scheduledDates[0]] : [])
    setError(null)
    setOpen(true)
  }

  function toggleDate(dateKey) {
    setSelectedDates((current) =>
      current.includes(dateKey)
        ? current.filter((value) => value !== dateKey)
        : [...current, dateKey],
    )
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError(null)
    setBusy(true)

    try {
      if (mode === 'semester') {
        await volunteerForSemester(group.id, userId, leaderName, selectedSessionKey)
      } else {
        await volunteerForDates(group.id, userId, leaderName, selectedDates)
      }
      setOpen(false)
      onVolunteered?.()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  if (!open) {
    return (
      <button type="button" onClick={handleOpen} className="btn-secondary py-1.5 text-xs">
        Volunteer as Walk Leader
      </button>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="mt-4 space-y-4 rounded-2xl border border-border bg-bg-warm p-4">
      <div>
        <p className="font-heading text-sm font-semibold text-primary">Volunteer as Walk Leader</p>
        <p className="mt-1 text-xs leading-relaxed text-muted">
          Choose when you can lead walks for this group.
        </p>
      </div>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium text-[var(--color-text)]">Volunteer for</legend>
        <label className="flex cursor-pointer items-start gap-2 text-sm">
          <input
            type="radio"
            name="volunteer-mode"
            value="semester"
            checked={mode === 'semester'}
            onChange={() => setMode('semester')}
            className="mt-1"
          />
          <span>
            <span className="font-medium">A full session</span>
            <span className="mt-0.5 block text-xs text-muted">
              Fall, Spring, or Summer Camp
            </span>
          </span>
        </label>
        <label className="flex cursor-pointer items-start gap-2 text-sm">
          <input
            type="radio"
            name="volunteer-mode"
            value="dates"
            checked={mode === 'dates'}
            onChange={() => setMode('dates')}
            className="mt-1"
          />
          <span>
            <span className="font-medium">Pick specific dates</span>
            <span className="mt-0.5 block text-xs text-muted">
              Choose from this group&apos;s scheduled class days
            </span>
          </span>
        </label>
      </fieldset>

      {mode === 'semester' && (
        <fieldset className="space-y-2">
          <legend className="text-sm font-medium text-[var(--color-text)]">Select session</legend>
          {sessionOptions.map((option) => (
            <label key={option.sessionKey} className="flex cursor-pointer items-start gap-2 text-sm">
              <input
                type="radio"
                name="volunteer-session"
                value={option.sessionKey}
                checked={selectedSessionKey === option.sessionKey}
                onChange={() => setSelectedSessionKey(option.sessionKey)}
                className="mt-1"
              />
              <span>
                <span className="font-medium">{option.label}</span>
                <span className="mt-0.5 block text-xs text-muted">{option.period}</span>
              </span>
            </label>
          ))}
        </fieldset>
      )}

      {mode === 'dates' && (
        <div>
          <p className="text-sm font-medium text-[var(--color-text)]">Select dates</p>
          {scheduledDates.length === 0 ? (
            <p className="mt-2 text-xs text-muted">No upcoming class dates scheduled yet.</p>
          ) : (
            <ul className="mt-2 max-h-48 space-y-2 overflow-y-auto rounded-xl border border-border bg-surface p-3">
              {scheduledDates.map((dateKey) => (
                <li key={dateKey}>
                  <label className="flex cursor-pointer items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={selectedDates.includes(dateKey)}
                      onChange={() => toggleDate(dateKey)}
                    />
                    {formatDisplayDate(dateKey)}
                  </label>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {error && <p className="text-xs text-red-600">{error}</p>}

      <div className="flex flex-wrap gap-2">
        <button
          type="submit"
          disabled={busy || (mode === 'dates' && selectedDates.length === 0)}
          className="btn-primary py-1.5 text-xs"
        >
          {busy ? 'Saving…' : 'Save volunteer dates'}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          disabled={busy}
          className="btn-link-accent py-1.5 text-xs"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}
