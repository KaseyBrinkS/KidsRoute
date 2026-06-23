import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import LocationSearch from '../components/LocationSearch'
import PageHeader from '../components/PageHeader'
import { useAuth } from '../context/AuthContext'
import {
  addActivityAndFindMatches,
  ACTIVITY_GRADES,
  DEFAULT_TIME,
  deleteActivity,
  formatDays,
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

const inputClass =
  'mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500'

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
  }
}

function activityTitle(activity) {
  return activity.className || activity.activityName
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

      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="text-sm font-medium text-gray-900">
          {editingId ? 'Edit activity' : 'Add an activity'}
        </h2>

        {kidsLoading ? (
          <p className="mt-4 text-sm text-gray-600">Loading children…</p>
        ) : kids.length === 0 ? (
          <p className="mt-4 text-sm text-gray-600">
            Add a child on the{' '}
            <Link to="/my-kids" className="font-medium text-indigo-600 hover:text-indigo-700">
              My Kids
            </Link>{' '}
            screen before adding activities.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            <div>
              <label htmlFor="childId" className="block text-sm font-medium text-gray-700">
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
                  <label htmlFor="className" className="block text-sm font-medium text-gray-700">
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
                  <label htmlFor="grade" className="block text-sm font-medium text-gray-700">
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
                  <p className="text-sm font-medium text-gray-700">Sessions</p>
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
                          className={`flex cursor-pointer items-start gap-3 rounded-md border px-3 py-2 ${
                            selected
                              ? 'border-indigo-300 bg-indigo-50'
                              : 'border-gray-200 bg-white'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={selected}
                            onChange={() => toggleSession(session.id)}
                            className="mt-0.5"
                          />
                          <span>
                            <span className="block text-sm font-medium text-gray-900">
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
                        className="block text-sm font-medium text-gray-700"
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
                        className="block text-sm font-medium text-gray-700"
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
                  <p className="text-sm font-medium text-gray-700">Days of the week</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {WEEKDAYS.map((day) => {
                      const selected = form.days.includes(day)
                      return (
                        <button
                          key={day}
                          type="button"
                          onClick={() => toggleDay(day)}
                          className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                            selected
                              ? 'bg-indigo-600 text-white'
                              : 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          {day}
                        </button>
                      )
                    })}
                  </div>
                </div>

                <div>
                  <p className="text-sm font-medium text-gray-700">Start time</p>
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
                className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
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
                  className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        )}
      </div>

      {error && (
        <p className="mt-4 rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
      )}

      <div className="mt-8">
        <h2 className="text-sm font-medium text-gray-900">Your activities</h2>

        {loading ? (
          <p className="mt-4 text-sm text-gray-600">Loading…</p>
        ) : activities.length === 0 ? (
          <p className="mt-4 rounded-lg border border-dashed border-gray-300 bg-white px-4 py-8 text-center text-sm text-gray-600">
            No activities added yet. Use the form above to add your first activity.
          </p>
        ) : (
          <div className="mt-4 space-y-6">
            {activitiesByChild.map(({ kid, activities: childActivities }) =>
              childActivities.length === 0 ? null : (
                <section key={kid.id}>
                  <h3 className="text-sm font-medium text-gray-700">{kid.firstName}</h3>
                  <ul className="mt-2 divide-y divide-gray-200 rounded-lg border border-gray-200 bg-white">
                    {childActivities.map((activity) => (
                      <li
                        key={activity.id}
                        className="flex items-start justify-between gap-4 px-4 py-4 sm:px-6"
                      >
                        <div>
                          <p className="font-medium text-gray-900">{activityTitle(activity)}</p>
                          <p className="mt-1 text-sm text-gray-600">
                            {activity.location}
                            {activity.locationPendingReview && (
                              <span className="ml-2 text-xs text-amber-700">
                                (pending review)
                              </span>
                            )}
                          </p>
                          <p className="mt-1 text-sm text-gray-500">
                            {activity.grade && `Grade ${activity.grade} · `}
                            {formatDays(activity.days)} · {formatStartTime(activity.startTime)}
                          </p>
                          <p className="mt-1 text-sm text-gray-500">
                            {formatSessionLabels(activity.sessions)}
                          </p>
                        </div>
                        <div className="flex shrink-0 gap-2">
                          <button
                            type="button"
                            onClick={() => handleEdit(activity)}
                            disabled={Boolean(editingId) || deletingId === activity.id}
                            className="rounded-md px-3 py-1.5 text-sm font-medium text-indigo-600 hover:bg-indigo-50 disabled:opacity-50"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(activity.id)}
                            disabled={deletingId === activity.id || editingId === activity.id}
                            className="rounded-md px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
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
