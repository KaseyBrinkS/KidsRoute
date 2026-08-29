import { Link } from 'react-router-dom'
import ConfirmedMeetingPoint from './ConfirmedMeetingPoint'
import { formatGroupTimes } from '../firebase/groups'
import { formatWalkGroupDetails, isWalkGroupDocument } from '../firebase/walkGroups'
import { CALENDAR_WEEKDAYS } from '../utils/dates'
import {
  walkStatusBadgeClass,
  walkStatusLabel,
} from '../utils/walkStatus'

export function buildLeaderGroupsByDay(groups, activeSessions) {
  const result = Object.fromEntries(CALENDAR_WEEKDAYS.map((day) => [day, []]))

  for (const group of groups) {
    const day = group.day
    if (!day || !result[day]) continue

    const inProgress = Boolean(activeSessions[group.id])

    result[day].push({
      ...group,
      _displayStatus: inProgress ? 'in progress' : 'upcoming',
    })
  }

  return result
}

export default function LeaderWeekCalendar({ groupsByDay }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {CALENDAR_WEEKDAYS.map((day) => {
        const dayGroups = groupsByDay[day] ?? []

        return (
          <div key={day} className="kr-card p-4">
            <h3 className="kr-section-title">{day}</h3>
            {dayGroups.length === 0 ? (
              <p className="mt-3 text-sm text-muted">No groups</p>
            ) : (
              <ul className="mt-3 space-y-3">
                {dayGroups.map((group) => {
                  const status = group._displayStatus ?? 'upcoming'
                  return (
                    <li key={group.id} className="rounded-xl border border-border bg-surface p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-heading text-sm font-semibold text-[var(--color-text)]">
                            {group.location}
                          </p>
                          <p className="mt-0.5 text-xs text-muted">{formatWalkGroupDetails(group)}</p>
                          <p className="mt-0.5 text-xs text-muted">{formatGroupTimes(group)}</p>
                          {isWalkGroupDocument(group) && (
                            <ConfirmedMeetingPoint group={group} compact />
                          )}
                        </div>
                        <span className={walkStatusBadgeClass(status)}>
                          {walkStatusLabel(status)}
                        </span>
                      </div>
                      <div className="mt-3 space-y-2 border-t border-border pt-3">
                        <Link to={`/groups/${group.id}/walk`} className="btn-primary mt-0 w-full justify-center">
                          Manage walk
                        </Link>
                        <Link to={`/groups/${group.id}/chat`} className="btn-accent mt-0 w-full justify-center">
                          Messages
                        </Link>
                        <Link to={`/groups/${group.id}/leader`} className="btn-secondary mt-0 w-full justify-center">
                          Group Settings
                        </Link>
                      </div>
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
