import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import LocationSearch from '../../components/LocationSearch'
import OnboardingShell from '../../components/onboarding/OnboardingShell'
import { OnboardingStepActions } from '../../components/onboarding/OnboardingStepActions'
import { useAuth } from '../../context/AuthContext'
import {
  addActivityAndFindMatches,
  ACTIVITY_GRADES,
  DEFAULT_TIME,
  gradeFromKid,
  subscribeToActivities,
  TIME_HOURS,
  TIME_MINUTES,
  TIME_PERIODS,
  to24HourTime,
  WEEKDAYS,
} from '../../firebase/activities'
import { subscribeToKids } from '../../firebase/kids'
import { defaultSessions } from '../../firebase/sessions'
import { syncSetupCompletion } from '../../firebase/users'

function emptyForm(kids) {
  const childId = kids[0]?.id ?? ''
  const kid = kids.find((k) => k.id === childId)
  return {
    childId,
    location: null,
    className: '',
    grade: gradeFromKid(kid?.grade),
    days: [],
    time: { ...DEFAULT_TIME },
  }
}

export default function OnboardingActivity() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [kids, setKids] = useState([])
  const [activities, setActivities] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState(emptyForm([]))
  const [submitting, setSubmitting] = useState(false)
  const [finishing, setFinishing] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!user) return

    const unsubKids = subscribeToKids(
      user.uid,
      (data) => {
        setKids(data)
        setForm((prev) => {
          const childId = prev.childId || data[0]?.id || ''
          const kid = data.find((k) => k.id === childId)
          return {
            ...prev,
            childId,
            grade: gradeFromKid(kid?.grade),
          }
        })
        setLoading(false)
      },
      (err) => {
        setError(err.message)
        setLoading(false)
      },
    )

    const unsubActivities = subscribeToActivities(user.uid, setActivities, (err) => {
      setError(err.message)
    })

    return () => {
      unsubKids()
      unsubActivities()
    }
  }, [user])

  function handleChange(event) {
    const { name, value } = event.target
    if (name === 'childId') {
      const kid = kids.find((k) => k.id === value)
      setForm((prev) => ({
        ...prev,
        childId: value,
        grade: gradeFromKid(kid?.grade),
      }))
      return
    }
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  function handleTimeChange(event) {
    const { name, value } = event.target
    setForm((prev) => ({
      ...prev,
      time: { ...prev.time, [name]: value },
    }))
  }

  function toggleDay(day) {
    setForm((prev) => ({
      ...prev,
      days: prev.days.includes(day)
        ? prev.days.filter((d) => d !== day)
        : [...prev.days, day],
    }))
  }

  async function handleAddActivity(event) {
    event.preventDefault()
    if (!form.childId || !form.location || form.days.length === 0) {
      setError('Select a child, location, and at least one day.')
      return
    }

    const child = kids.find((kid) => kid.id === form.childId)
    if (!child) return

    setError(null)
    setSubmitting(true)
    try {
      await addActivityAndFindMatches(user.uid, {
        childId: form.childId,
        childFirstName: child.firstName,
        className: form.className,
        location: form.location.name,
        locationPendingReview: form.location.pendingReview,
        grade: form.grade,
        days: form.days,
        startTime: to24HourTime(form.time),
        sessions: defaultSessions(),
        summerStartDate: null,
        summerEndDate: null,
      })
      setForm(emptyForm(kids))
      await syncSetupCompletion(user.uid, kids.length, activities.length + 1)
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDone() {
    if (activities.length === 0) {
      setError('Add at least one activity to finish, or skip for now.')
      return
    }

    setError(null)
    setFinishing(true)
    try {
      await syncSetupCompletion(user.uid, kids.length, activities.length)
      navigate('/dashboard')
    } catch (err) {
      setError(err.message)
      setFinishing(false)
    }
  }

  const locationSelected = Boolean(form.location)

  return (
    <OnboardingShell
        step={4}
        title="Add your first activity"
        description="Where does your child go after school? We'll use this to find families with the same schedule."
      >
        {loading ? (
          <p className="text-muted">Loading…</p>
        ) : kids.length === 0 ? (
          <p className="text-muted">Add a child first to continue.</p>
        ) : (
          <>
            <form onSubmit={handleAddActivity} className="space-y-4">
              <div>
                <label htmlFor="childId" className="block text-sm font-medium text-[var(--color-text)]">
                  Child
                </label>
                <select
                  id="childId"
                  name="childId"
                  required
                  value={form.childId}
                  onChange={handleChange}
                  className="input-kr"
                >
                  {kids.map((kid) => (
                    <option key={kid.id} value={kid.id}>
                      {kid.firstName}
                    </option>
                  ))}
                </select>
              </div>

              <LocationSearch
                value={form.location}
                onChange={(location) => setForm((prev) => ({ ...prev, location }))}
              />

              {locationSelected && (
                <>
                  <div>
                    <label htmlFor="className" className="block text-sm font-medium text-[var(--color-text)]">
                      Class name
                    </label>
                    <input
                      id="className"
                      name="className"
                      type="text"
                      required
                      value={form.className}
                      onChange={handleChange}
                      placeholder="Beginner ballet"
                      className="input-kr"
                    />
                  </div>

                  <div>
                    <label htmlFor="grade" className="block text-sm font-medium text-[var(--color-text)]">
                      Grade
                    </label>
                    <select
                      id="grade"
                      name="grade"
                      required
                      value={form.grade}
                      onChange={handleChange}
                      className="input-kr"
                    >
                      {ACTIVITY_GRADES.map((grade) => (
                        <option key={grade} value={grade}>
                          {grade}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <p className="text-sm font-medium text-[var(--color-text)]">Days of the week</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {WEEKDAYS.map((day) => {
                        const selected = form.days.includes(day)
                        return (
                          <button
                            key={day}
                            type="button"
                            onClick={() => toggleDay(day)}
                            className={`rounded-xl px-3 py-1.5 text-sm font-semibold transition-colors ${
                              selected
                                ? 'bg-primary text-white'
                                : 'border border-border bg-surface text-muted hover:bg-bg-warm'
                            }`}
                          >
                            {day}
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  <div>
                    <p className="text-sm font-medium text-[var(--color-text)]">Start time</p>
                    <div className="mt-1 flex flex-wrap gap-2">
                      <select
                        name="hour"
                        value={form.time.hour}
                        onChange={handleTimeChange}
                        className="select-kr"
                        aria-label="Hour"
                      >
                        {TIME_HOURS.map((hour) => (
                          <option key={hour} value={hour}>
                            {hour}
                          </option>
                        ))}
                      </select>
                      <span className="self-center text-muted">:</span>
                      <select
                        name="minute"
                        value={form.time.minute}
                        onChange={handleTimeChange}
                        className="select-kr"
                        aria-label="Minute"
                      >
                        {TIME_MINUTES.map((minute) => (
                          <option key={minute} value={minute}>
                            {minute}
                          </option>
                        ))}
                      </select>
                      <select
                        name="period"
                        value={form.time.period}
                        onChange={handleTimeChange}
                        className="select-kr"
                        aria-label="AM or PM"
                      >
                        {TIME_PERIODS.map((period) => (
                          <option key={period} value={period}>
                            {period}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </>
              )}

              <button
                type="submit"
                disabled={submitting || !locationSelected || form.days.length === 0}
                className="btn-secondary w-full"
              >
                {submitting ? 'Adding…' : 'Add activity'}
              </button>
            </form>

            {activities.length > 0 && (
              <ul className="mt-6 divide-y divide-border rounded-xl border border-border bg-bg-warm">
                {activities.map((activity) => (
                  <li key={activity.id} className="px-4 py-3 text-sm">
                    <span className="font-semibold text-[var(--color-text)]">
                      {activity.className || activity.activityName}
                    </span>
                    <span className="text-muted"> · {activity.location}</span>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}

        {error && <p className="alert-error mt-4">{error}</p>}

        <OnboardingStepActions
          primaryLabel="Done"
          onPrimary={handleDone}
          primaryDisabled={loading || activities.length === 0}
          primaryBusy={finishing}
          skipLabel="Do this later"
        />
      </OnboardingShell>
  )
}
