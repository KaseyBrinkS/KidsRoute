import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import LatestLeaderMessageBanner from './LatestLeaderMessageBanner'
import LeaderVolunteerPanel from './LeaderVolunteerPanel'
import ConfirmedMeetingPoint from './ConfirmedMeetingPoint'
import MeetingPointControls from './MeetingPointControls'
import { formatGroupTimes, getGroupWalkStatus } from '../firebase/groups'
import { formatWalkHomeWindow, isWalkHomeGroup } from '../firebase/walkHome'
import {
  clearAbsence,
  getUpcomingAbsences,
  markAbsentDateRange,
  markAbsentSingleDate,
  resolveGroupParticipantIds,
  subscribeToActiveWalkSession,
  subscribeToGroupAbsences,
} from '../firebase/groupWalk'
import { groupCanBeLed } from '../firebase/groupLeaders'
import { getUserProfile } from '../firebase/users'
import {
  getPartiesForUser,
  isWalkGroupDocument,
  leaveWalkGroup,
} from '../firebase/walkGroups'
import { formatDisplayDate, getPartyUpcomingScheduledDates } from '../firebase/sessions'
import {
  walkStatusBadgeClass,
  walkStatusCardClass,
  walkStatusLabel,
} from '../utils/walkStatus'

function GroupTypeBadge({ group }) {
  if (isWalkHomeGroup(group)) {
    return (
      <span className="rounded-full bg-[var(--color-walk-blue-bg)] px-2.5 py-0.5 text-xs font-semibold text-[var(--color-walk-blue)]">
        🏠 Walk Home
      </span>
    )
  }
  return (
    <span className="rounded-full bg-bg-warm px-2.5 py-0.5 text-xs font-semibold text-muted">
      Walk To
    </span>
  )
}

function formatAbsenceLabel(absence) {
  if (absence.type === 'range') {
    return `${formatDisplayDate(absence.startDateKey)} – ${formatDisplayDate(absence.endDateKey)}`
  }
  return formatDisplayDate(absence.dateKey)
}

function PartyAbsenceControls({ party, group, userId, absences, walkInProgress }) {
  const [mode, setMode] = useState('single')
  const [singleDate, setSingleDate] = useState('')
  const [rangeStart, setRangeStart] = useState('')
  const [rangeEnd, setRangeEnd] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  const scheduledDates = getPartyUpcomingScheduledDates(party, group.day)
  const upcomingAbsences = getUpcomingAbsences(absences, userId, party.childId)
  const participantIds = resolveGroupParticipantIds(group)

  useEffect(() => {
    if (scheduledDates.length === 0) return
    setSingleDate((current) => current || scheduledDates[0])
    setRangeStart((current) => current || scheduledDates[0])
    setRangeEnd((current) => current || scheduledDates[0])
  }, [scheduledDates])

  async function handleMarkAbsent() {
    if (scheduledDates.length === 0) return
    setError(null)
    setBusy(true)
    try {
      if (mode === 'single') {
        if (!singleDate) throw new Error('Select a date.')
        await markAbsentSingleDate({
          groupId: group.id,
          userId,
          childId: party.childId,
          childFirstName: party.childFirstName,
          activityId: party.activityId,
          dateKey: singleDate,
          participantIds,
        })
      } else {
        if (!rangeStart || !rangeEnd) throw new Error('Select a date range.')
        await markAbsentDateRange({
          groupId: group.id,
          userId,
          childId: party.childId,
          childFirstName: party.childFirstName,
          activityId: party.activityId,
          startDateKey: rangeStart,
          endDateKey: rangeEnd,
          participantIds,
        })
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  async function handleCancelAbsence(absenceId) {
    setError(null)
    setBusy(true)
    try {
      await clearAbsence(absenceId)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  if (walkInProgress) return null
  if (scheduledDates.length === 0) {
    return (
      <p className="text-xs text-muted">
        {party.childFirstName}: No upcoming class dates scheduled for this activity.
      </p>
    )
  }

  return (
    <div className="kr-card-subsection">
      <h4 className="font-heading text-sm font-semibold text-primary">Mark absent</h4>
      <p className="mt-1 text-xs leading-relaxed text-muted">
        Mark the days {party.childFirstName} is absent from the group walk ahead of time.
      </p>
      <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-start">
        <div className="min-w-0 flex-1">
          {mode === 'single' ? (
            <select
              value={singleDate}
              onChange={(event) => setSingleDate(event.target.value)}
              className="select-kr w-full text-sm"
              aria-label="Absent date"
            >
              {scheduledDates.map((dateKey) => (
                <option key={dateKey} value={dateKey}>
                  {formatDisplayDate(dateKey)}
                </option>
              ))}
            </select>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={rangeStart}
                onChange={(event) => setRangeStart(event.target.value)}
                className="select-kr min-w-0 flex-1 text-sm"
                aria-label="Range start"
              >
                {scheduledDates.map((dateKey) => (
                  <option key={`start-${dateKey}`} value={dateKey}>
                    {formatDisplayDate(dateKey)}
                  </option>
                ))}
              </select>
              <span className="text-xs text-muted">to</span>
              <select
                value={rangeEnd}
                onChange={(event) => setRangeEnd(event.target.value)}
                className="select-kr min-w-0 flex-1 text-sm"
                aria-label="Range end"
              >
                {scheduledDates.map((dateKey) => (
                  <option key={`end-${dateKey}`} value={dateKey}>
                    {formatDisplayDate(dateKey)}
                  </option>
                ))}
              </select>
            </div>
          )}
          <button
            type="button"
            onClick={handleMarkAbsent}
            disabled={busy}
            className="btn-primary mt-2.5 w-full py-2 text-xs sm:w-auto"
          >
            {busy ? 'Saving…' : 'Mark absent'}
          </button>
        </div>
        <div className="flex shrink-0 flex-row gap-1 sm:flex-col" role="tablist" aria-label="Absence date type">
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'single'}
            onClick={() => setMode('single')}
            className={`rounded-xl px-3 py-2 text-xs font-semibold transition-colors ${
              mode === 'single'
                ? 'bg-primary text-white shadow-sm'
                : 'border border-border bg-surface text-muted hover:border-border-warm hover:text-primary'
            }`}
          >
            Single date
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'range'}
            onClick={() => setMode('range')}
            className={`rounded-xl px-3 py-2 text-xs font-semibold transition-colors ${
              mode === 'range'
                ? 'bg-primary text-white shadow-sm'
                : 'border border-border bg-surface text-muted hover:border-border-warm hover:text-primary'
            }`}
          >
            Date range
          </button>
        </div>
      </div>
      {upcomingAbsences.length > 0 && (
        <ul className="mt-4 space-y-2 border-t border-border pt-3">
          {upcomingAbsences.map((absence) => (
            <li
              key={absence.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-bg-warm px-3 py-2 text-xs text-muted"
            >
              <span>
                <span className="font-semibold text-[var(--color-text)]">Scheduled absent:</span>{' '}
                {formatAbsenceLabel(absence)}
              </span>
              <button
                type="button"
                onClick={() => handleCancelAbsence(absence.id)}
                disabled={busy}
                className="link-accent disabled:opacity-50"
              >
                Cancel
              </button>
            </li>
          ))}
        </ul>
      )}
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  )
}

export default function GroupFamilyCard({ group, userId, displayStatus: displayStatusProp, className = '' }) {
  const [activeSession, setActiveSession] = useState(null)
  const [absences, setAbsences] = useState([])
  const [leaving, setLeaving] = useState(false)
  const [error, setError] = useState(null)
  const [leaderName, setLeaderName] = useState('Parent')

  useEffect(() => {
    const unsubSession = subscribeToActiveWalkSession(group.id, userId, setActiveSession)
    const unsubAbsences = subscribeToGroupAbsences(group.id, userId, setAbsences)
    return () => {
      unsubSession()
      unsubAbsences()
    }
  }, [group.id, userId])

  useEffect(() => {
    if (!userId) return
    getUserProfile(userId).then((profile) => {
      setLeaderName(profile.displayName || 'Parent')
    })
  }, [userId])

  const walkInProgress = Boolean(activeSession)
  const myParties = getPartiesForUser(group, userId)
  const displayWalkStatus =
    displayStatusProp ?? (walkInProgress ? 'in progress' : getGroupWalkStatus(group))

  async function handleLeaveGroup() {
    setError(null)
    setLeaving(true)
    try {
      await leaveWalkGroup(group.id, userId)
    } catch (err) {
      setError(err.message)
    } finally {
      setLeaving(false)
    }
  }

  return (
    <div className={`p-5 shadow-[var(--shadow-kr-lg)] ${walkStatusCardClass(displayWalkStatus)} ${className}`}>
      <div className="flex items-start justify-between gap-4 border-b border-border pb-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <GroupTypeBadge group={group} />
          </div>
          <p className="mt-2 font-heading text-lg font-semibold text-[var(--color-text)]">
            {group._childName ?? myParties.map((p) => p.childFirstName).join(', ')}
          </p>
          <p className="mt-1 text-sm font-medium text-primary">{group.location}</p>
          <p className="mt-0.5 text-sm text-muted">
            {group.day}
            {isWalkHomeGroup(group)
              ? ` · Walk home ${formatWalkHomeWindow(group)}`
              : ` · ${formatGroupTimes(group)}`}
          </p>
        </div>
        <span className={walkStatusBadgeClass(displayWalkStatus)}>
          {walkStatusLabel(displayWalkStatus)}
        </span>
      </div>

      {isWalkGroupDocument(group) && (
        <LatestLeaderMessageBanner group={group} userId={userId} className="mt-4" />
      )}

      {!walkInProgress && myParties.length > 0 && (
        <div className="space-y-3 pt-4">
          {myParties
            .filter((party) => !group._childName || party.childFirstName === group._childName)
            .map((party) => (
              <PartyAbsenceControls
                key={party.childId}
                party={party}
                group={group}
                userId={userId}
                absences={absences}
                walkInProgress={walkInProgress}
              />
            ))}
        </div>
      )}

      {walkInProgress && (
        <p className="mt-4 rounded-xl bg-bg-warm px-3 py-2 text-xs text-muted">
          Absences can be updated again after today&apos;s walk is completed.
        </p>
      )}

      {isWalkGroupDocument(group) && groupCanBeLed(group) && (
        <div className="mt-4">
          <LeaderVolunteerPanel group={group} userId={userId} leaderName={leaderName} />
        </div>
      )}

      {isWalkGroupDocument(group) && (
        <div className="kr-card-subsection mt-4 space-y-3">
          <ConfirmedMeetingPoint group={group} />
          <MeetingPointControls
            group={group}
            userId={userId}
            proposerName={myParties[0]?.parentName || 'A parent'}
          />
        </div>
      )}

      <div className="kr-card-actions mt-5">
        <Link to={`/groups/${group.id}/leader`} className="btn-secondary mt-0 w-full justify-center">
          Group Settings
        </Link>
      </div>

      {!walkInProgress && (
        <button
          type="button"
          onClick={handleLeaveGroup}
          disabled={leaving}
          className="btn-danger mt-4 w-full"
        >
          {leaving ? 'Leaving…' : 'Leave group'}
        </button>
      )}
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  )
}
