import { Link } from 'react-router-dom'
import { ChildNameWithDot } from './ChildColorDot'
import ConfirmedMeetingPoint from './ConfirmedMeetingPoint'
import GroupNote from './GroupNote'
import MeetingPointControls from './MeetingPointControls'
import GroupChatButton from './GroupChatButton'
import { WEEKDAYS, getChildColorById } from '../utils/dates'
import { formatGroupTimes } from '../firebase/groups'
import { getPartiesForUser, isWalkGroupDocument } from '../firebase/walkGroups'
import {
  walkStatusBadgeClass,
  walkStatusLabel,
} from '../utils/walkStatus'

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
                {dayGroups.map((group) => {
                  const status = cardStatus(group)
                  const color = getChildColorById(group._childId, kids)
                  const myParties = userId ? getPartiesForUser(group, userId) : []
                  return (
                    <li
                      key={`${group.id}_${group._childId ?? ''}`}
                      className="rounded-xl border p-3"
                      style={{
                        background: color.bg,
                        borderColor: color.border,
                        color: color.text,
                      }}
                    >
                      {isWalkGroupDocument(group) && userId && (
                        <GroupNote
                          group={group}
                          userId={userId}
                          editorName={myParties[0]?.parentName || 'A parent'}
                          compact
                          className="mb-2"
                        />
                      )}
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold">
                            <ChildNameWithDot
                              name={group._childName ?? group.location}
                              childId={group._childId}
                              kids={kids}
                            />
                          </p>
                          <p className="mt-0.5 truncate text-xs opacity-80">
                            {group.location}
                          </p>
                          <p className="mt-0.5 text-xs opacity-80">
                            {formatGroupTimes(group)}
                          </p>
                          {isWalkGroupDocument(group) && (
                            <ConfirmedMeetingPoint group={group} compact />
                          )}
                        </div>
                        <span className={walkStatusBadgeClass(status)}>
                          {walkStatusLabel(status)}
                        </span>
                      </div>
                      {isWalkGroupDocument(group) && userId && (
                        <MeetingPointControls
                          group={group}
                          userId={userId}
                          proposerName={myParties[0]?.parentName || 'A parent'}
                        />
                      )}
                      <div className="mt-3 space-y-2 border-t border-border/60 pt-3">
                        <GroupChatButton group={group} userId={userId} className="mt-0" />
                        <Link to={`/groups/${group.id}/leader`} className="btn-manage-group mt-0">
                          Manage Group
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
