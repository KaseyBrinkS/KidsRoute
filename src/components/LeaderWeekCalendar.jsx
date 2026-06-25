import { Link } from 'react-router-dom'
import { ChildNameWithDot } from './ChildColorDot'
import ConfirmedMeetingPoint from './ConfirmedMeetingPoint'
import { formatGroupTimes } from '../firebase/groups'
import { formatWalkGroupDetails, getPartiesForUser, isWalkGroupDocument } from '../firebase/walkGroups'
import { CALENDAR_WEEKDAYS, getChildColorById } from '../utils/dates'
import { walkStatusBadgeClass, walkStatusLabel } from '../utils/walkStatus'

function cardColorStyle(childId, kids) {
  const color = getChildColorById(childId, kids)
  return {
    background: color.bg,
    borderColor: color.border,
    color: color.text,
  }
}

export function buildLeaderGroupsByDay(groups, userId, activeSessions) {
  const result = Object.fromEntries(CALENDAR_WEEKDAYS.map((day) => [day, []]))

  for (const group of groups) {
    const day = group.day
    if (!day || !result[day]) continue

    const myParties = getPartiesForUser(group, userId)
    const inProgress = Boolean(activeSessions[group.id])

    result[day].push({
      ...group,
      _childId: myParties[0]?.childId,
      _childName: myParties.map((party) => party.childFirstName).join(', '),
      _displayStatus: inProgress ? 'in progress' : 'upcoming',
    })
  }

  return result
}

export default function LeaderWeekCalendar({ groupsByDay, kids }) {
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
                    <li key={group.id}>
                      <Link
                        to={`/groups/${group.id}/leader`}
                        className="block rounded-xl border p-3 transition-opacity hover:opacity-90"
                        style={cardColorStyle(group._childId, kids)}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            {group._childName && (
                              <p className="text-sm font-semibold">
                                <ChildNameWithDot
                                  name={group._childName}
                                  childId={group._childId}
                                  kids={kids}
                                />
                              </p>
                            )}
                            <p className="mt-0.5 truncate text-xs opacity-80">{group.location}</p>
                            <p className="mt-0.5 text-xs opacity-80">
                              {formatWalkGroupDetails(group)}
                            </p>
                            <p className="mt-0.5 text-xs opacity-80">{formatGroupTimes(group)}</p>
                          {isWalkGroupDocument(group) && (
                            <ConfirmedMeetingPoint group={group} compact />
                          )}
                          </div>
                          <span className={walkStatusBadgeClass(status)}>
                            {walkStatusLabel(status)}
                          </span>
                        </div>
                        <p className="mt-3 text-xs font-semibold underline opacity-90">
                          Manage group →
                        </p>
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
