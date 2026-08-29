import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { ChildNameWithDot } from './ChildColorDot'
import ConfirmedMeetingPoint from './ConfirmedMeetingPoint'
import LatestLeaderMessageBanner from './LatestLeaderMessageBanner'
import LeaderVolunteerPanel from './LeaderVolunteerPanel'
import MeetingPointControls from './MeetingPointControls'
import { WEEKDAYS, getChildColorById } from '../utils/dates'
import { formatGroupTimes } from '../firebase/groups'
import { groupCanBeLed } from '../firebase/groupLeaders'
import { getUserProfile } from '../firebase/users'
import { getPartiesForUser, isWalkGroupDocument } from '../firebase/walkGroups'
import {
  walkStatusBadgeClass,
  walkStatusLabel,
} from '../utils/walkStatus'

function CalendarGroupCard({ group, userId, kids, status }) {
  const [leaderName, setLeaderName] = useState('Parent')
  const color = getChildColorById(group._childId, kids)
  const myParties = userId ? getPartiesForUser(group, userId) : []

  useEffect(() => {
    if (!userId) return
    getUserProfile(userId).then((profile) => {
      setLeaderName(profile.displayName || 'Parent')
    })
  }, [userId])

  return (
    <li
      className="rounded-xl border p-3"
      style={{
        background: color.bg,
        borderColor: color.border,
        color: color.text,
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold">
            <ChildNameWithDot
              name={group._childName ?? group.location}
              childId={group._childId}
              kids={kids}
            />
          </p>
          <p className="mt-0.5 truncate text-xs opacity-80">{group.location}</p>
          <p className="mt-0.5 text-xs opacity-80">{formatGroupTimes(group)}</p>
          {isWalkGroupDocument(group) && <ConfirmedMeetingPoint group={group} compact />}
        </div>
        <span className={walkStatusBadgeClass(status)}>{walkStatusLabel(status)}</span>
      </div>

      {isWalkGroupDocument(group) && userId && (
        <>
          <LatestLeaderMessageBanner group={group} userId={userId} className="mt-3" />
          <MeetingPointControls
            group={group}
            userId={userId}
            proposerName={myParties[0]?.parentName || 'A parent'}
          />
          {groupCanBeLed(group) && (
            <div className="mt-3">
              <LeaderVolunteerPanel group={group} userId={userId} leaderName={leaderName} />
            </div>
          )}
          <div className="mt-3 space-y-2 border-t border-border/60 pt-3">
            <Link to={`/groups/${group.id}/leader`} className="btn-secondary mt-0 w-full justify-center">
              Group Settings
            </Link>
          </div>
        </>
      )}
    </li>
  )
}

export default function GroupsWeekCalendar({
  groupsByDay,
  activeSessions,
  kids = [],
  userId,
}) {
  function cardStatus(group) {
    if (activeSessions[group.id]) return 'in progress'
    return group._displayStatus ?? 'upcoming'
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {WEEKDAYS.map((day) => {
        const dayGroups = groupsByDay[day] ?? []
        return (
          <div key={day} className="kr-card-subsection p-4">
            <h3 className="font-heading text-sm font-semibold text-primary">{day}</h3>
            {dayGroups.length === 0 ? (
              <p className="mt-3 text-sm text-muted">No groups</p>
            ) : (
              <ul className="mt-3 space-y-3">
                {dayGroups.map((group) => (
                  <CalendarGroupCard
                    key={`${group.id}_${group._childId ?? ''}`}
                    group={group}
                    userId={userId}
                    kids={kids}
                    status={cardStatus(group)}
                  />
                ))}
              </ul>
            )}
          </div>
        )
      })}
    </div>
  )
}
