import { Link } from 'react-router-dom'
import { ChildNameWithDot } from './ChildColorDot'
import { getGroupWalkStatus } from '../firebase/groups'
import { formatWalkGroupDetails } from '../firebase/walkGroups'
import { CALENDAR_WEEKDAYS, getChildColorById } from '../utils/dates'
import {
  walkStatusBadgeClass,
  walkStatusLabel,
} from '../utils/walkStatus'

function childColorStyle(childId, kids) {
  const color = getChildColorById(childId, kids)
  return {
    background: color.bg,
    borderColor: color.border,
    color: color.text,
  }
}

export default function DashboardWeekView({
  groupsByDay,
  activeSessions,
  kids,
  selectedDay,
}) {
  function cardStatus(group) {
    if (activeSessions[group.id]) return 'in progress'
    return group._displayStatus ?? 'upcoming'
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {CALENDAR_WEEKDAYS.map((day) => {
        const dayGroups = groupsByDay[day] ?? []
        const isSelected = day === selectedDay
        return (
          <div
            key={day}
            className={`kr-card p-4 ${isSelected ? 'ring-2 ring-primary/30' : ''}`}
          >
            <h3 className="kr-section-title">
              {day}
              {isSelected && (
                <span className="ml-2 text-xs font-normal text-primary">Selected</span>
              )}
            </h3>
            {dayGroups.length === 0 ? (
              <p className="mt-3 text-sm text-muted">No groups</p>
            ) : (
              <ul className="mt-3 space-y-3">
                {dayGroups.map((group) => {
                  const status = cardStatus(group)
                  return (
                    <li
                      key={`${group.id}_${group._childId}`}
                      className="rounded-xl border p-3"
                      style={childColorStyle(group._childId, kids)}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold">
                            <ChildNameWithDot
                              name={group._childName}
                              childId={group._childId}
                              kids={kids}
                            />
                          </p>
                          <p className="mt-0.5 truncate text-xs opacity-80">{group.location}</p>
                          <p className="mt-0.5 text-xs opacity-80">
                            {formatWalkGroupDetails(group)}
                          </p>
                        </div>
                        <span className={walkStatusBadgeClass(status)}>
                          {walkStatusLabel(status)}
                        </span>
                      </div>
                      {status === 'in progress' && (
                        <Link to="/groups" className="btn-leader mt-3">
                          View group
                        </Link>
                      )}
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

export function buildDashboardWeekGroups(groups, userId, activeSessions, filters) {
  const {
    walkGroupNeedsUserResponse,
    walkGroupIsDeclinedForUser,
    walkGroupUserHasAccepted,
    getPartiesForUser,
  } = filters

  const result = Object.fromEntries(CALENDAR_WEEKDAYS.map((day) => [day, []]))

  for (const group of groups) {
    if (walkGroupNeedsUserResponse(group, userId)) continue
    if (walkGroupIsDeclinedForUser(group, userId)) continue
    if (!walkGroupUserHasAccepted(group, userId)) continue

    const myParties = getPartiesForUser(group, userId).filter(
      (party) => party.response !== 'declined',
    )
    const displayStatus = activeSessions[group.id]
      ? 'in progress'
      : getGroupWalkStatus(group)

    for (const party of myParties) {
      if (result[group.day]) {
        result[group.day].push({
          ...group,
          _childId: party.childId,
          _childName: party.childFirstName,
          _displayStatus: displayStatus,
        })
      }
    }
  }

  return result
}
