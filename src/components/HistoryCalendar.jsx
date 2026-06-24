import { useMemo, useState } from 'react'
import {
  CHILD_CALENDAR_COLORS,
  childColorIndex,
  formatDateKey,
  getMonthDays,
} from '../utils/dates'
import { historyWalkStatus } from '../utils/walkStatus'
import { formatHistoryTime } from '../firebase/walkHistory'

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function statusBlockStyle(status, childColor) {
  if (status === 'in progress') {
    return {
      background: 'var(--color-walk-green-bg)',
      borderColor: 'var(--color-walk-green)',
      color: 'var(--color-walk-green)',
    }
  }
  return {
    background: childColor.bg,
    borderColor: childColor.border,
    color: childColor.text,
  }
}

export default function HistoryCalendar({ entries }) {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())

  const childIds = useMemo(
    () => [...new Set(entries.map((e) => e.childId))],
    [entries],
  )

  const entriesByDate = useMemo(() => {
    const map = new Map()
    for (const entry of entries) {
      const dateKey = entry.pickedUpAt?.toDate
        ? formatDateKey(entry.pickedUpAt.toDate())
        : entry.pickedUpAt?.seconds
          ? formatDateKey(new Date(entry.pickedUpAt.seconds * 1000))
          : null
      if (!dateKey) continue
      if (!map.has(dateKey)) map.set(dateKey, [])
      map.get(dateKey).push(entry)
    }
    return map
  }, [entries])

  const { days, startPad } = getMonthDays(year, month)
  const monthLabel = new Date(year, month, 1).toLocaleString('default', {
    month: 'long',
    year: 'numeric',
  })

  function prevMonth() {
    if (month === 0) {
      setMonth(11)
      setYear((y) => y - 1)
    } else {
      setMonth((m) => m - 1)
    }
  }

  function nextMonth() {
    if (month === 11) {
      setMonth(0)
      setYear((y) => y + 1)
    } else {
      setMonth((m) => m + 1)
    }
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <button type="button" onClick={prevMonth} className="btn-ghost">
          ← Prev
        </button>
        <h3 className="text-lg font-semibold text-primary">{monthLabel}</h3>
        <button type="button" onClick={nextMonth} className="btn-ghost">
          Next →
        </button>
      </div>

      {childIds.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-3">
          {childIds.map((childId) => {
            const entry = entries.find((e) => e.childId === childId)
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
                {entry?.childFirstName ?? 'Child'}
              </span>
            )
          })}
          <span className="inline-flex items-center gap-2 text-xs text-muted">
            <span className="h-2.5 w-2.5 rounded-full bg-[var(--color-walk-green)]" />
            En route
          </span>
        </div>
      )}

      <div className="kr-card overflow-hidden p-4">
        <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-muted">
          {WEEKDAY_LABELS.map((d) => (
            <div key={d} className="py-2">
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: startPad }).map((_, i) => (
            <div key={`pad-${i}`} className="min-h-[72px]" />
          ))}
          {days.map((date) => {
            const dateKey = formatDateKey(date)
            const dayEntries = entriesByDate.get(dateKey) ?? []
            const isToday = dateKey === formatDateKey(now)

            return (
              <div
                key={dateKey}
                className={`min-h-[72px] rounded-xl border p-1.5 ${
                  isToday ? 'border-primary/40 bg-primary/5' : 'border-border bg-surface'
                }`}
              >
                <span
                  className={`text-xs font-semibold ${
                    isToday ? 'text-primary' : 'text-muted'
                  }`}
                >
                  {date.getDate()}
                </span>
                <div className="mt-1 space-y-0.5">
                  {dayEntries.map((entry) => {
                    const status = historyWalkStatus(entry)
                    const color =
                      CHILD_CALENDAR_COLORS[childColorIndex(entry.childId, childIds)]
                    const blockStyle = statusBlockStyle(status, color)
                    return (
                      <div
                        key={entry.id}
                        className="truncate rounded-md border px-1 py-0.5 text-[10px] font-medium leading-tight"
                        style={blockStyle}
                        title={`${entry.childFirstName} · ${entry.location}`}
                      >
                        {entry.childFirstName}
                        {status === 'in progress' && ' · en route'}
                        {status === 'completed' &&
                          entry.droppedOffAt &&
                          ` · ${formatHistoryTime(entry.droppedOffAt)}`}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
