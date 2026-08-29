import { useMemo, useState } from 'react'
import { formatDisplayDate, parseDateKey } from '../firebase/sessions'

function startOfWeek(dateKey) {
  const date = parseDateKey(dateKey)
  const day = date.getDay()
  const diff = day === 0 ? -6 : 1 - day
  date.setDate(date.getDate() + diff)
  return date
}

function addDays(date, count) {
  const next = new Date(date)
  next.setDate(next.getDate() + count)
  return next
}

function formatWeekRange(startDate) {
  const endDate = addDays(startDate, 6)
  const sameMonth = startDate.getMonth() === endDate.getMonth()
  const startLabel = startDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  const endLabel = endDate.toLocaleDateString(undefined, {
    month: sameMonth ? undefined : 'short',
    day: 'numeric',
  })
  return `${startLabel} – ${endLabel}`
}

function monthLabel(dateKey) {
  return parseDateKey(dateKey).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
}

function ScheduleDayCard({ entry, currentUserId, onRemoveVolunteer, removingId }) {
  const { dateKey, leaders, kidCount, sufficient, hasWalk, required } = entry
  const statusClass = !hasWalk
    ? 'border-border bg-surface'
    : sufficient
      ? 'border-green-200 bg-green-50'
      : 'border-amber-200 bg-amber-50'

  return (
    <div className={`rounded-xl border p-3 ${statusClass}`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-[var(--color-text)]">
            {formatDisplayDate(dateKey)}
          </p>
          {hasWalk && (
            <p className="mt-1 text-xs text-muted">
              {kidCount} kid{kidCount === 1 ? '' : 's'} · {required} leader{required === 1 ? '' : 's'} needed
            </p>
          )}
        </div>
        {hasWalk && (
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
              sufficient ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'
            }`}
          >
            {sufficient ? 'Covered' : 'Needs leaders'}
          </span>
        )}
      </div>

      {leaders.length > 0 ? (
        <ul className="mt-3 space-y-1">
          {leaders.map((leader) => (
            <li key={`${dateKey}_${leader.userId}`} className="flex items-center justify-between gap-2 text-sm">
              <span className="text-[var(--color-text)]">{leader.leaderName}</span>
              {leader.userId === currentUserId && leader.volunteerId && (
                <button
                  type="button"
                  onClick={() => onRemoveVolunteer(leader.volunteerId)}
                  disabled={removingId === leader.volunteerId}
                  className="text-xs text-muted hover:text-red-600"
                >
                  {removingId === leader.volunteerId ? 'Removing…' : 'Remove'}
                </button>
              )}
            </li>
          ))}
        </ul>
      ) : hasWalk ? (
        <p className="mt-3 text-sm font-medium text-amber-800">
          No leader — can you help?
        </p>
      ) : (
        <p className="mt-3 text-xs text-muted">No walk scheduled this day.</p>
      )}
    </div>
  )
}

export default function LeaderScheduleCalendar({
  scheduleEntries,
  volunteers,
  currentUserId,
  onRemoveVolunteer,
  removingId,
}) {
  const [view, setView] = useState('week')

  const entriesWithVolunteerIds = useMemo(() => {
    return scheduleEntries.map((entry) => ({
      ...entry,
      leaders: entry.leaders.map((leader) => {
        const volunteer = volunteers.find((record) => {
          if (record.userId !== leader.userId) return false
          if (record.scope === 'date') return record.dateKey === entry.dateKey
          return record.scope === 'semester'
        })
        return { ...leader, volunteerId: volunteer?.id ?? null }
      }),
    }))
  }, [scheduleEntries, volunteers])

  const groupedEntries = useMemo(() => {
    if (view === 'month') {
      const groups = new Map()
      for (const entry of entriesWithVolunteerIds) {
        const label = monthLabel(entry.dateKey)
        if (!groups.has(label)) groups.set(label, [])
        groups.get(label).push(entry)
      }
      return [...groups.entries()].map(([label, entries]) => ({ label, entries }))
    }

    const groups = new Map()
    for (const entry of entriesWithVolunteerIds) {
      const weekStart = startOfWeek(entry.dateKey)
      const label = formatWeekRange(weekStart)
      if (!groups.has(label)) groups.set(label, [])
      groups.get(label).push(entry)
    }
    return [...groups.entries()].map(([label, entries]) => ({ label, entries }))
  }, [entriesWithVolunteerIds, view])

  if (entriesWithVolunteerIds.length === 0) {
    return (
      <p className="mt-3 text-xs text-muted">
        No upcoming walk dates scheduled yet. Leader dates will appear here once class days are set.
      </p>
    )
  }

  return (
    <div className="mt-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium text-[var(--color-text)]">Leader schedule</p>
        <div className="flex rounded-xl border border-border bg-surface p-0.5 text-xs">
          <button
            type="button"
            onClick={() => setView('week')}
            className={`rounded-lg px-3 py-1.5 font-medium ${
              view === 'week' ? 'bg-primary text-white' : 'text-muted'
            }`}
          >
            Weekly
          </button>
          <button
            type="button"
            onClick={() => setView('month')}
            className={`rounded-lg px-3 py-1.5 font-medium ${
              view === 'month' ? 'bg-primary text-white' : 'text-muted'
            }`}
          >
            Monthly
          </button>
        </div>
      </div>

      <div className="mt-3 space-y-4">
        {groupedEntries.map((group) => (
          <section key={group.label}>
            <h4 className="text-xs font-semibold uppercase tracking-wide text-muted">{group.label}</h4>
            <div className="mt-2 grid gap-3 sm:grid-cols-2">
              {group.entries.map((entry) => (
                <ScheduleDayCard
                  key={entry.dateKey}
                  entry={entry}
                  currentUserId={currentUserId}
                  onRemoveVolunteer={onRemoveVolunteer}
                  removingId={removingId}
                />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}
