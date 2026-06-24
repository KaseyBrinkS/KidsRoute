import { useMemo } from 'react'
import { formatStartTime } from '../firebase/activities'
import { getCurrentSessionInfo, isActivityActiveInCurrentSession } from '../firebase/sessions'
import {
  addWeeks,
  CALENDAR_WEEKDAYS,
  CHILD_CALENDAR_COLORS,
  childColorIndex,
  formatWeekRange,
  getWeekDays,
  startOfWeek,
} from '../utils/dates'

function startTimeSortKey(startTime) {
  if (!startTime) return Number.MAX_SAFE_INTEGER
  const [hoursStr, minutesStr] = startTime.split(':')
  const hours = Number(hoursStr)
  const minutes = Number(minutesStr)
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return Number.MAX_SAFE_INTEGER
  return hours * 60 + minutes
}

export default function ActivitiesWeekCalendar({
  activities,
  kids,
  weekStart,
  onWeekChange,
}) {
  const today = useMemo(() => new Date(), [])
  const sessionInfo = useMemo(() => getCurrentSessionInfo(today), [today])

  const childIds = useMemo(
    () => kids.map((kid) => kid.id),
    [kids],
  )

  const childNames = useMemo(() => {
    const map = new Map()
    for (const kid of kids) {
      map.set(kid.id, kid.firstName)
    }
    for (const activity of activities) {
      if (!map.has(activity.childId)) {
        map.set(activity.childId, activity.childFirstName)
      }
    }
    return map
  }, [kids, activities])

  const sessionActivities = useMemo(
    () => activities.filter((activity) => isActivityActiveInCurrentSession(activity, today)),
    [activities, today],
  )

  const activitiesByDay = useMemo(() => {
    const byDay = Object.fromEntries(CALENDAR_WEEKDAYS.map((day) => [day, []]))

    for (const activity of sessionActivities) {
      for (const day of activity.days ?? []) {
        if (byDay[day]) {
          byDay[day].push(activity)
        }
      }
    }

    for (const day of CALENDAR_WEEKDAYS) {
      byDay[day].sort(
        (a, b) => startTimeSortKey(a.startTime) - startTimeSortKey(b.startTime),
      )
    }

    return byDay
  }, [sessionActivities])

  const weekDays = useMemo(() => getWeekDays(weekStart), [weekStart])
  const isCurrentWeek =
    startOfWeek(today).getTime() === startOfWeek(weekStart).getTime()

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => onWeekChange(addWeeks(weekStart, -1))}
          className="btn-ghost"
          aria-label="Previous week"
        >
          ← Prev
        </button>
        <div className="text-center">
          <p className="font-heading text-lg font-semibold text-primary">
            {formatWeekRange(weekStart)}
          </p>
          {isCurrentWeek && (
            <p className="text-xs font-medium text-muted">This week</p>
          )}
        </div>
        <button
          type="button"
          onClick={() => onWeekChange(addWeeks(weekStart, 1))}
          className="btn-ghost"
          aria-label="Next week"
        >
          Next →
        </button>
      </div>

      {childIds.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-3">
          {childIds.map((childId) => {
            const color = CHILD_CALENDAR_COLORS[childColorIndex(childId, childIds)]
            return (
              <span
                key={childId}
                className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold"
                style={{ background: color.bg, color: color.text }}
              >
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ background: color.border }}
                />
                {childNames.get(childId) ?? 'Child'}
              </span>
            )
          })}
        </div>
      )}

      <div className="kr-card overflow-hidden p-3 sm:p-4">
        {sessionActivities.length === 0 ? (
          <p className="px-2 py-8 text-center text-sm text-muted">
            No activities scheduled for the {sessionInfo.label.toLowerCase()} right now.
          </p>
        ) : (
        <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
          {weekDays.map(({ label, date }) => {
            const dayActivities = activitiesByDay[label] ?? []
            const isToday =
              date.toDateString() === today.toDateString()

            return (
              <div key={label} className="min-w-0">
                <div
                  className={`mb-2 rounded-lg px-1 py-1.5 text-center ${
                    isToday ? 'bg-primary/10' : ''
                  }`}
                >
                  <p
                    className={`text-xs font-bold ${
                      isToday ? 'text-primary' : 'text-muted'
                    }`}
                  >
                    {label}
                  </p>
                  <p
                    className={`text-[10px] sm:text-xs ${
                      isToday ? 'font-semibold text-primary' : 'text-muted'
                    }`}
                  >
                    {date.getDate()}
                  </p>
                </div>
                <div className="space-y-1.5">
                  {dayActivities.length === 0 ? (
                    <div className="min-h-[48px] rounded-lg border border-dashed border-border/60" />
                  ) : (
                    dayActivities.map((activity) => {
                      const color =
                        CHILD_CALENDAR_COLORS[
                          childColorIndex(activity.childId, childIds)
                        ]
                      return (
                        <div
                          key={`${activity.id}_${label}`}
                          className="rounded-lg border px-1.5 py-1.5 text-[10px] leading-tight sm:px-2 sm:text-xs"
                          style={{
                            background: color.bg,
                            borderColor: color.border,
                            color: color.text,
                          }}
                          title={`${childNames.get(activity.childId)} · ${activity.location}`}
                        >
                          <p className="font-semibold line-clamp-2">{activity.location}</p>
                          <p className="mt-0.5 opacity-90">
                            {formatStartTime(activity.startTime)}
                          </p>
                        </div>
                      )
                    })
                  )}
                </div>
              </div>
            )
          })}
        </div>
        )}
      </div>

      <div className="mt-4 rounded-2xl border border-border bg-bg-warm px-5 py-4">
        <p className="text-sm text-[var(--color-text)]">
          <span className="font-semibold text-primary">Active session: </span>
          {sessionInfo.label}
          <span className="text-muted"> · {sessionInfo.period}</span>
        </p>
        <p className="mt-1 text-xs text-muted">
          Showing activities scheduled for the {sessionInfo.label.toLowerCase()} based on
          today&apos;s date.
        </p>
      </div>
    </div>
  )
}
