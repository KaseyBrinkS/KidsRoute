import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import GuidanceBanner from '../components/GuidanceBanner'
import ActivitiesWeekCalendar from '../components/ActivitiesWeekCalendar'
import { ChildNameWithDot } from '../components/ChildColorDot'
import LocationSearch from '../components/LocationSearch'
import PageHeader from '../components/PageHeader'
import ViewToggle from '../components/ViewToggle'
import { useAuth } from '../context/AuthContext'
import {
  addActivityAndFindMatches,
  ACTIVITY_GRADES,
  DEFAULT_TIME,
  deleteActivity,
  formatStartTime,
  from24HourTime,
  gradeFromKid,
  subscribeToActivities,
  TIME_HOURS,
  TIME_MINUTES,
  TIME_PERIODS,
  to24HourTime,
  updateActivityAndFindMatches,
  WEEKDAYS,
} from '../firebase/activities'
import {
  defaultSessions,
  formatSessionLabels,
  SESSION_TYPES,
  validateSessionForm,
} from '../firebase/sessions'
import { subscribeToKids } from '../firebase/kids'
import {
  calculateWalkHomeDeparture,
} from '../firebase/walkHome'

const inputClass = 'input-kr'

function emptyForm(kids) {
  const childId = kids[0]?.id ?? ''
  const kid = kids.find((k) => k.id === childId)
  return {
    childId,
    location: null,
    className: '',
    grade: gradeFromKid(kid?.grade),
    days: [],
    sessions: defaultSessions(),
    summerStartDate: '',
    summerEndDate: '',
    time: { ...DEFAULT_TIME },
    walkHomeEnabled: false,
  }
}

function formFromActivity(activity) {
  return {
    childId: activity.childId,
    location: {
      name: activity.location,
      pendingReview: activity.locationPendingReview ?? false,
    },
    className: activity.className || activity.activityName || '',
    grade: activity.grade || 'K',
    days: activity.days ?? [],
    sessions: activity.sessions ?? defaultSessions(),
    summerStartDate: activity.summerStartDate ?? '',
    summerEndDate: activity.summerEndDate ?? '',
    time: from24HourTime(activity.startTime),
    walkHomeEnabled: Boolean(activity.walkHomeEnabled),
  }
}

function activityTitle(activity) {
  return activity.className || activity.activityName
}

const LIST_SORT_WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function earliestDayIndex(days) {
  if (!days?.length) return LIST_SORT_WEEKDAYS.length
  return Math.min(
    ...days.map((day) => {
      const index = LIST_SORT_WEEKDAYS.indexOf(day)
      return index >= 0 ? index : LIST_SORT_WEEKDAYS.length
    }),
  )
}

function startTimeSortKey(startTime) {
  if (!startTime) return Number.MAX_SAFE_INTEGER
  const [hoursStr, minutesStr] = startTime.split(':')
  const hours = Number(hoursStr)
  const minutes = Number(minutesStr)
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return Number.MAX_SAFE_INTEGER
  return hours * 60 + minutes
}

function compareActivitiesByDayAndTime(a, b) {
  const dayDiff = earliestDayIndex(a.days) - earliestDayIndex(b.days)
  if (dayDiff !== 0) return dayDiff
  return startTimeSortKey(a.startTime) - startTimeSortKey(b.startTime)
}

function formatActivityDays(days) {
  return LIST_SORT_WEEKDAYS.filter((day) => days?.includes(day)).join(', ')
}

export default function MyActivities() {
  const { user } = useAuth()
  const [kids, setKids] = useState([])
  const [activities, setActivities] = useState([])
  const [kidsLoading, setKidsLoading] = useState(true)
  const [activitiesLoading, setActivitiesLoading] = useState(true)
  const [error, setError] = useState(null)
  const [form, setForm] = useState(emptyForm([]))
  const [editingId, setEditingId] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [deletingId, setDeletingId] = useState(null)
  const [viewMode, setViewMode] = useState('list')
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()))

  useEffect(() => {
    if (!user) return

    const unsubscribeKids = subscribeToKids(
      user.uid,
      (data) => {
        setKids(data)
        setKidsLoading(false)
        setForm((prev) => {
          const childId = prev.childId || data[0]?.id || ''
          const kid = data.find((k) => k.id === childId)
          return {
            ...prev,
            childId,
            grade: gradeFromKid(kid?.grade),
          }
        })
      },
      (err) => {
        setError(err.message)
        setKidsLoading(false)
      },
    )

    const unsubscribeActivities = subscribeToActivities(
      user.uid,
      (data) => {
        setActivities(data)
        setActivitiesLoading(false)
      },
      (err) => {
        setError(err.message)
        setActivitiesLoading(false)
      },
    )

    return () => {
      unsubscribeKids()
      unsubscribeActivities()
    }
  }, [user])

  const activitiesByChild = useMemo(() => {
    const grouped = new Map()

    for (const kid of kids) {
      grouped.set(kid.id, { kid, activities: [] })
    }

    for (const activity of activities) {
      if (grouped.has(activity.childId)) {
        grouped.get(activity.childId).activities.push(activity)
      } else {
        grouped.set(activity.childId, {
          kid: { id: activity.childId, firstName: activity.childFirstName },
          activities: [activity],
        })
      }
    }

    for (const entry of grouped.values()) {
      entry.activities.sort(compareActivitiesByDayAndTime)
    }

    return Array.from(grouped.values())
  }, [kids, activities])

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

  function toggleSession(sessionId) {
    setForm((prev) => ({
      ...prev,
      sessions: prev.sessions.includes(sessionId)
        ? prev.sessions.filter((id) => id !== sessionId)
        : [...prev.sessions, sessionId],
    }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    if (!form.childId || !form.location || form.days.length === 0) return

    const sessionError = validateSessionForm(
      form.sessions,
      form.summerStartDate,
      form.summerEndDate,
    )
    if (sessionError) {
      setError(sessionError)
      return
    }

    const child = kids.find((kid) => kid.id === form.childId)
    if (!child) return

    const activityData = {
      childId: form.childId,
      childFirstName: child.firstName,
      className: form.className,
      location: form.location.name,
      locationPendingReview: form.location.pendingReview,
      grade: form.grade,
      days: form.days,
      startTime: to24HourTime(form.time),
      sessions: form.sessions,
      summerStartDate: form.sessions.includes('summer') ? form.summerStartDate : null,
      summerEndDate: form.sessions.includes('summer') ? form.summerEndDate : null,
      walkHomeEnabled: form.walkHomeEnabled,
    }

    setError(null)
    setSubmitting(true)
    try {
      if (editingId) {
        await updateActivityAndFindMatches(user.uid, editingId, activityData)
        setEditingId(null)
      } else {
        await addActivityAndFindMatches(user.uid, activityData)
      }
      setForm(emptyForm(kids))
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  function handleEdit(activity) {
    setError(null)
    setEditingId(activity.id)
    setForm(formFromActivity(activity))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function handleCancelEdit() {
    setEditingId(null)
    setForm(emptyForm(kids))
  }

  async function handleDelete(activityId) {
    setError(null)
    setDeletingId(activityId)
    try {
      await deleteActivity(user.uid, activityId)
    } catch (err) {
      setError(err.message)
    } finally {
      setDeletingId(null)
    }
  }

  const loading = kidsLoading || activitiesLoading
  const locationSelected = Boolean(form.location)
  const summerSelected = form.sessions.includes('summer')

  return (
    <div>
      <PageHeader
        title="My Activities"
        description="After-school activities your kids are signed up for"
      />

      {!activitiesLoading && activities.length === 0 && (
        <GuidanceBanner className="mb-6">
          Add your kids&apos; after-school activities here to get matched with families heading
          the same way!
        </GuidanceBanner>
      )}

      <div className="mb-6 flex justify-end">
        <ViewToggle
          value={viewMode}
          onChange={setViewMode}
          options={[
            { value: 'list', label: 'List' },
            { value: 'calendar', label: 'Calendar' },
          ]}
        />
      </div>

      <div className="kr-card p-6">
        <h2 className="kr-section-title">
          {editingId ? 'Edit activity' : 'Add an activity'}
        </h2>

        {kidsLoading ? (
          <p className="mt-4 text-muted">Loading children…</p>
        ) : kids.length === 0 ? (
          <p className="mt-4 text-muted">
            Add a child in{' '}
            <Link to="/settings" className="link-accent">
              Settings
            </Link>{' '}
            before adding activities.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
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
                className={inputClass}
              >
                {kids.map((kid) => (
                  <option key={kid.id} value={kid.id}>
                    {kid.firstName}
                  </option>
                ))}
              </select>
            </div>

            <LocationSearch
              key={editingId ?? 'new'}
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
                    className={inputClass}
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
                    className={inputClass}
                  >
                    {ACTIVITY_GRADES.map((grade) => (
                      <option key={grade} value={grade}>
                        {grade}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <p className="text-sm font-medium text-[var(--color-text)]">Sessions</p>
                  <p className="mt-1 text-xs text-gray-500">
                    Select which session(s) this activity runs during. Class meets weekly on the
                    days you choose below.
                  </p>
                  <div className="mt-2 space-y-2">
                    {SESSION_TYPES.map((session) => {
                      const selected = form.sessions.includes(session.id)
                      return (
                        <label
                          key={session.id}
                          className={`flex cursor-pointer items-start gap-3 rounded-xl border px-3 py-2 ${
                            selected
                              ? 'border-primary/40 bg-primary/5'
                              : 'border-border bg-surface'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={selected}
                            onChange={() => toggleSession(session.id)}
                            className="mt-0.5"
                          />
                          <span>
                            <span className="block text-sm font-semibold text-[var(--color-text)]">
                              {session.label}
                            </span>
                            <span className="block text-xs text-gray-500">
                              {session.description}
                            </span>
                          </span>
                        </label>
                      )
                    })}
                  </div>
                </div>

                {summerSelected && (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label
                        htmlFor="summerStartDate"
                        className="block text-sm font-medium text-[var(--color-text)]"
                      >
                        Summer camp start
                      </label>
                      <input
                        id="summerStartDate"
                        name="summerStartDate"
                        type="date"
                        required
                        value={form.summerStartDate}
                        onChange={handleChange}
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="summerEndDate"
                        className="block text-sm font-medium text-[var(--color-text)]"
                      >
                        Summer camp end
                      </label>
                      <input
                        id="summerEndDate"
                        name="summerEndDate"
                        type="date"
                        required
                        value={form.summerEndDate}
                        onChange={handleChange}
                        className={inputClass}
                      />
                    </div>
                  </div>
                )}

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
                      className={`${inputClass} mt-0 w-auto min-w-[4.5rem]`}
                      aria-label="Hour"
                    >
                      {TIME_HOURS.map((hour) => (
                        <option key={hour} value={hour}>
                          {hour}
                        </option>
                      ))}
                    </select>
                    <span className="self-center text-gray-500">:</span>
                    <select
                      name="minute"
                      value={form.time.minute}
                      onChange={handleTimeChange}
                      className={`${inputClass} mt-0 w-auto min-w-[4.5rem]`}
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
                      className={`${inputClass} mt-0 w-auto min-w-[5rem]`}
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

                <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-surface px-4 py-3">
                  <input
                    type="checkbox"
                    checked={form.walkHomeEnabled}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, walkHomeEnabled: event.target.checked }))
                    }
                    className="mt-1 h-4 w-4 rounded border-border text-primary focus:ring-primary"
                  />
                  <span>
                    <span className="block text-sm font-medium text-[var(--color-text)]">
                      Add walk home group
                    </span>
                    <span className="mt-0.5 block text-xs leading-relaxed text-muted">
                      Match with neighbors at your building walking home from this activity. Requires
                      a home address in Settings.
                    </span>
                  </span>
                </label>
              </>
            )}

            <div className="flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={
                  submitting ||
                  !locationSelected ||
                  form.days.length === 0 ||
                  form.sessions.length === 0
                }
                className="btn-primary"
              >
                {submitting
                  ? editingId
                    ? 'Saving…'
                    : 'Adding…'
                  : editingId
                    ? 'Save changes'
                    : 'Add activity'}
              </button>
              {editingId && (
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  disabled={submitting}
                  className="btn-link-accent"
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        )}
      </div>

      {error && <p className="alert-error mt-4">{error}</p>}

      <div className="mt-8">
        <h2 className="kr-section-title">Your activities</h2>

        {loading ? (
          <p className="mt-4 text-muted">Loading…</p>
        ) : viewMode === 'calendar' ? (
          <div className="mt-4">
            <ActivitiesWeekCalendar
              activities={activities}
              kids={kids}
              weekStart={weekStart}
              onWeekChange={setWeekStart}
            />
          </div>
        ) : activities.length === 0 ? (
          <p className="kr-card-flat mt-4">
            No activities added yet. Use the form above to add your first activity.
          </p>
        ) : (
          <div className="mt-4 space-y-6">
            {activitiesByChild.map(({ kid, activities: childActivities }) =>
              childActivities.length === 0 ? null : (
                <section key={kid.id}>
                  <h3 className="text-lg font-bold text-primary">
                    <ChildNameWithDot child={kid} kids={kids} />
                  </h3>
                  <ul className="kr-card mt-2 divide-y divide-border">
                    {childActivities.map((activity) => (
                      <li
                        key={activity.id}
                        className="flex items-start justify-between gap-4 px-5 py-4"
                      >
                        <div>
                          <p className="text-lg font-semibold text-[var(--color-text)]">
                            {activity.location}
                            {activity.locationPendingReview && (
                              <span className="ml-2 text-xs font-normal text-accent">
                                (pending review)
                              </span>
                            )}
                          </p>
                          <p className="mt-1 text-base font-bold text-primary">
                            {formatActivityDays(activity.days)}
                          </p>
                          {activityTitle(activity) && (
                            <p className="mt-0.5 text-sm text-muted">{activityTitle(activity)}</p>
                          )}
                          <p className="mt-1 text-sm text-muted">
                            {activity.grade && `Grade ${activity.grade} · `}
                            {formatStartTime(activity.startTime)}
                          </p>
                          <p className="mt-1 text-sm text-muted">
                            {formatSessionLabels(activity.sessions)}
                          </p>
                          {activity.walkHomeEnabled && (
                            <p className="mt-1 text-sm font-medium text-[var(--color-walk-blue)]">
                              🏠 Walk home group · departs ~
                              {formatStartTime(calculateWalkHomeDeparture(activity.startTime))}
                            </p>
                          )}
                        </div>
                        <div className="flex shrink-0 gap-2">
                          <button
                            type="button"
                            onClick={() => handleEdit(activity)}
                            disabled={Boolean(editingId) || deletingId === activity.id}
                            className="btn-link-accent px-3 py-1.5 text-sm"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(activity.id)}
                            disabled={deletingId === activity.id || editingId === activity.id}
                            className="btn-danger"
                          >
                            {deletingId === activity.id ? 'Deleting…' : 'Delete'}
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                </section>
              ),
            )}
          </div>
        )}
      </div>
    </div>
  )
}
