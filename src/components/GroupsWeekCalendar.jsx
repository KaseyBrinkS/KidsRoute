import { Link } from 'react-router-dom'
import { WEEKDAYS } from '../utils/dates'
import { formatGroupTimes } from '../firebase/groups'
import {
  walkStatusBadgeClass,
  walkStatusCardClass,
  walkStatusLabel,
} from '../utils/walkStatus'

export default function GroupsWeekCalendar({ groupsByDay, activeSessions }) {
  function cardStatus(group) {
    if (activeSessions[group.id]) return 'in progress'
    return group._displayStatus ?? 'upcoming'
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {WEEKDAYS.map((day) => {
        const dayGroups = groupsByDay[day] ?? []
        return (
          <div key={day} className="kr-card p-4">
            <h3 className="kr-section-title">{day}</h3>
            {dayGroups.length === 0 ? (
              <p className="mt-3 text-sm text-muted">No groups</p>
            ) : (
              <ul className="mt-3 space-y-3">
                {dayGroups.map((group) => {
                  const status = cardStatus(group)
                  return (
                    <li
                      key={group.id}
                      className={`p-3 ${walkStatusCardClass(status)}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-[var(--color-text)]">
                            {group._childName ?? group.location}
                          </p>
                          <p className="mt-0.5 truncate text-xs text-muted">
                            {group.location}
                          </p>
                          <p className="mt-0.5 text-xs text-muted">
                            {formatGroupTimes(group)}
                          </p>
                        </div>
                        <span className={walkStatusBadgeClass(status)}>
                          {walkStatusLabel(status)}
                        </span>
                      </div>
                      <Link to={`/groups/${group.id}/leader`} className="btn-leader mt-3">
                        Group Leader View
                      </Link>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        )
      })}
    </div>
  )
}
