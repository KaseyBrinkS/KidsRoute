import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import GroupsWeekCalendar from '../components/GroupsWeekCalendar'
import { ChildNameWithDot } from '../components/ChildColorDot'
import PageHeader from '../components/PageHeader'
import ViewToggle from '../components/ViewToggle'
import { useAuth } from '../context/AuthContext'
import {
  formatGroupChildNames,
  formatGroupTimes,
  getGroupWalkStatus,
} from '../firebase/groups'
import {
  clearAbsence,
  getUpcomingAbsences,
  markAbsentDateRange,
  markAbsentSingleDate,
  resolveGroupParticipantIds,
  subscribeToActiveWalkSession,
  subscribeToGroupAbsences,
  subscribeToUserActiveWalkSessions,
} from '../firebase/groupWalk'
import GroupLeaderControls from '../components/GroupLeaderControls'
import ConfirmedMeetingPoint from '../components/ConfirmedMeetingPoint'
import MeetingPointControls from '../components/MeetingPointControls'
import {
  getPartiesForUser,
  leaveWalkGroup,
  subscribeToWalkGroups,
  walkGroupIsVisibleOnGroupsPage,
} from '../firebase/walkGroups'
import { getPartiesForUser as getMatchPartiesForUser, subscribeToMatches } from '../firebase/matching'
import {
  BUILDING_WALK_TYPES,
  joinBuildingWalk,
  leaveBuildingWalk,
  subscribeToBuildingWalkSlots,
  userHasBuildingWalkSlot,
} from '../firebase/buildingWalks'
import { subscribeToActivities, syncWalkGroupsForUser } from '../firebase/activities'
import { subscribeToKids } from '../firebase/kids'
import { formatDisplayDate, getPartyUpcomingScheduledDates } from '../firebase/sessions'
import { WEEKDAYS } from '../utils/dates'
import {
  walkStatusBadgeClass,
  walkStatusCardClass,
  walkStatusLabel,
} from '../utils/walkStatus'

function formatAbsenceLabel(absence) {
  if (absence.type === 'range') {
    return `${formatDisplayDate(absence.startDateKey)} – ${formatDisplayDate(absence.endDateKey)}`
  }
  return formatDisplayDate(absence.dateKey)
}

function organizeGroupsByChild(groups, userId, activeSessions) {
  const byChild = new Map()

  for (const group of groups) {
    const myParties = getPartiesForUser(group, userId)
    const displayStatus = activeSessions[group.id]
      ? 'in progress'
      : getGroupWalkStatus(group)

    for (const party of myParties) {
      if (!byChild.has(party.childId)) {
        byChild.set(party.childId, { childName: party.childFirstName, byDay: {} })
      }
      const child = byChild.get(party.childId)
      if (!child.byDay[group.day]) child.byDay[group.day] = []
      child.byDay[group.day].push({
        ...group,
        _childName: party.childFirstName,
        _displayStatus: displayStatus,
      })
    }
  }

  return Array.from(byChild.entries())
    .map(([childId, data]) => ({ childId, ...data }))
    .sort((a, b) => a.childName.localeCompare(b.childName))
}

function buildGroupsByDay(groups, userId, activeSessions) {
  const result = Object.fromEntries(WEEKDAYS.map((day) => [day, []]))

  for (const group of groups) {
    const myParties = getPartiesForUser(group, userId)
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

function PartyAbsenceControls({ party, group, userId, absences, walkInProgress }) {
  const [mode, setMode] = useState('single')
  const [singleDate, setSingleDate] = useState('')
  const [rangeStart, setRangeStart] = useState('')
  const [rangeEnd, setRangeEnd] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  const scheduledDates = useMemo(
    () => getPartyUpcomingScheduledDates(party, group.day),
    [party, group.day],
  )
  const upcomingAbsences = useMemo(
    () => getUpcomingAbsences(absences, userId, party.childId),
    [absences, userId, party.childId],
  )

  useEffect(() => {
    if (scheduledDates.length === 0) return
    setSingleDate((current) => current || scheduledDates[0])
    setRangeStart((current) => current || scheduledDates[0])
    setRangeEnd((current) => current || scheduledDates[0])
  }, [scheduledDates])

  const participantIds = useMemo(
    () => resolveGroupParticipantIds(group),
    [group],
  )

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
    <div className="mt-3 rounded-xl border border-border bg-bg-warm p-3">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setMode('single')}
          className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${
            mode === 'single' ? 'bg-primary text-white' : 'btn-secondary py-1'
          }`}
        >
          Single date
        </button>
        <button
          type="button"
          onClick={() => setMode('range')}
          className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${
            mode === 'range' ? 'bg-primary text-white' : 'btn-secondary py-1'
          }`}
        >
          Date range
        </button>
      </div>

      {mode === 'single' ? (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <select
            value={singleDate}
            onChange={(event) => setSingleDate(event.target.value)}
            className="select-kr text-xs"
          >
            {scheduledDates.map((dateKey) => (
              <option key={dateKey} value={dateKey}>
                {formatDisplayDate(dateKey)}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={handleMarkAbsent}
            disabled={busy}
            className="btn-secondary py-1 text-xs"
          >
            {busy ? 'Saving…' : 'Mark absent'}
          </button>
        </div>
      ) : (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <select
            value={rangeStart}
            onChange={(event) => setRangeStart(event.target.value)}
            className="select-kr text-xs"
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
            className="select-kr text-xs"
            aria-label="Range end"
          >
            {scheduledDates.map((dateKey) => (
              <option key={`end-${dateKey}`} value={dateKey}>
                {formatDisplayDate(dateKey)}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={handleMarkAbsent}
            disabled={busy}
            className="btn-secondary py-1 text-xs"
          >
            {busy ? 'Saving…' : 'Mark absent'}
          </button>
        </div>
      )}

      {upcomingAbsences.length > 0 && (
        <ul className="mt-3 space-y-1">
          {upcomingAbsences.map((absence) => (
            <li
              key={absence.id}
              className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted"
            >
              <span>Absent: {formatAbsenceLabel(absence)}</span>
              <button
                type="button"
                onClick={() => handleCancelAbsence(absence.id)}
                disabled={busy}
                className="font-semibold text-primary hover:underline disabled:opacity-50"
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

function GroupCard({ group, userId, displayStatus: displayStatusProp }) {
  const [activeSession, setActiveSession] = useState(null)
  const [absences, setAbsences] = useState([])
  const [leaving, setLeaving] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    const unsubSession = subscribeToActiveWalkSession(group.id, userId, setActiveSession)
    const unsubAbsences = subscribeToGroupAbsences(group.id, userId, setAbsences)
    return () => {
      unsubSession()
      unsubAbsences()
    }
  }, [group.id, userId])

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
    <div className={`p-5 ${walkStatusCardClass(displayWalkStatus)}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-[var(--color-text)]">
            {group._childName ?? formatGroupChildNames(group)}
          </p>
          <p className="mt-1 text-sm text-muted">{group.location}</p>
          <p className="mt-1 text-sm text-muted">
            {group.day} · {formatGroupTimes(group)}
          </p>

          {!walkInProgress && myParties.length > 0 && (
            <div className="space-y-2">
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
            <p className="mt-3 text-xs text-muted">
              Absences can be updated again after today&apos;s walk is completed.
            </p>
          )}

          {group.source === 'walkGroup' && (
            <div className="mt-3 space-y-3">
              <ConfirmedMeetingPoint group={group} />
              <MeetingPointControls
                group={group}
                userId={userId}
                proposerName={myParties[0]?.parentName || 'A parent'}
              />
            </div>
          )}

          <GroupLeaderControls group={group} userId={userId} />
        </div>

        <span className={walkStatusBadgeClass(displayWalkStatus)}>
          {walkStatusLabel(displayWalkStatus)}
        </span>
      </div>

      <Link to={`/groups/${group.id}/leader`} className="btn-leader">
        Manage Group
      </Link>

      {!walkInProgress && (
        <button
          type="button"
          onClick={handleLeaveGroup}
          disabled={leaving}
          className="btn-danger mt-3"
        >
          {leaving ? 'Leaving…' : 'Leave group'}
        </button>
      )}
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  )
}

function BuildingWalkGroupCard({ group, userId, onLeave }) {
  const [activeSession, setActiveSession] = useState(null)
  const [absences, setAbsences] = useState([])
  const [leaving, setLeaving] = useState(false)
  const [error, setError] = useState(null)

  const walkTypeConfig = BUILDING_WALK_TYPES[group.buildingWalkType]
  const partnerLeft = group.status === 'partner_left'

  useEffect(() => {
    const unsubSession = subscribeToActiveWalkSession(group.id, userId, setActiveSession)
    const unsubAbsences = subscribeToGroupAbsences(group.id, userId, setAbsences)
    return () => {
      unsubSession()
      unsubAbsences()
    }
  }, [group.id, userId])

  const walkInProgress = Boolean(activeSession)
  const myParties = getMatchPartiesForUser(group, userId)
  const displayWalkStatus = walkInProgress
    ? 'in progress'
    : partnerLeft
      ? 'upcoming'
      : getGroupWalkStatus(group)

  async function handleLeave() {
    setError(null)
    setLeaving(true)
    try {
      await onLeave(group)
    } catch (err) {
      setError(err.message)
    } finally {
      setLeaving(false)
    }
  }

  return (
    <div className={`p-5 ${walkStatusCardClass(displayWalkStatus)}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-[var(--color-text)]">{formatGroupChildNames(group)}</p>
          <p className="mt-1 text-sm text-muted">{group.location}</p>
          <p className="mt-1 text-sm text-muted">
            {walkTypeConfig?.route} · {walkTypeConfig?.scheduleLabel ?? formatGroupTimes(group)}
          </p>

          {group.status === 'solo' && (
            <p className="mt-3 rounded-xl bg-[var(--color-walk-blue-bg)] px-3 py-2 text-xs text-[var(--color-walk-blue)]">
              Waiting for neighbors at {group.homeAddressDisplay} to join this walk.
            </p>
          )}

          {!walkInProgress && !partnerLeft && group.status === 'connected' && myParties.length > 0 && (
            <div className="space-y-2">
              {myParties.map((party) => (
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
            <p className="mt-3 text-xs text-muted">
              Absences can be updated again after today&apos;s walk is completed.
            </p>
          )}
        </div>

        <span
          className={
            partnerLeft
              ? 'badge-accent'
              : group.status === 'solo'
                ? 'badge-walk-upcoming'
                : walkStatusBadgeClass(displayWalkStatus)
          }
        >
          {walkInProgress
            ? 'En route'
            : partnerLeft
              ? 'Partner left'
              : group.status === 'solo'
                ? 'Waiting'
                : walkStatusLabel(displayWalkStatus)}
        </span>
      </div>

      {group.status === 'connected' && !partnerLeft && (
        <Link to={`/groups/${group.id}/leader`} className="btn-leader">
          Manage Group
        </Link>
      )}

      {!walkInProgress && (
        <button
          type="button"
          onClick={handleLeave}
          disabled={leaving}
          className="btn-danger mt-3"
        >
          {leaving ? 'Leaving…' : 'Leave walk'}
        </button>
      )}
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  )
}

function BuildingWalkTypeRow({ walkType, config, joined, busy, onJoin, onLeave, activityLabel }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border px-5 py-4 last:border-b-0">
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-[var(--color-text)]">{config.label}</p>
        {activityLabel && <p className="mt-0.5 text-sm text-muted">{activityLabel}</p>}
        <p className="mt-1 text-sm text-muted">
          {config.route} · {config.scheduleLabel}
        </p>
      </div>
      <div className="shrink-0">
        {joined ? (
          <button type="button" onClick={onLeave} disabled={busy} className="btn-secondary">
            {busy ? 'Leaving…' : 'Leave'}
          </button>
        ) : (
          <button type="button" onClick={onJoin} disabled={busy} className="btn-primary">
            {busy ? 'Joining…' : 'Join'}
          </button>
        )}
      </div>
    </div>
  )
}

export default function Groups() {
  const { user } = useAuth()
  const [groups, setGroups] = useState([])
  const [buildingGroups, setBuildingGroups] = useState([])
  const [buildingSlots, setBuildingSlots] = useState([])
  const [activities, setActivities] = useState([])
  const [activeSessions, setActiveSessions] = useState({})
  const [kids, setKids] = useState([])
  const [viewMode, setViewMode] = useState('list')
  const [activityGroupsLoading, setActivityGroupsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [buildingBusyKey, setBuildingBusyKey] = useState(null)

  useEffect(() => {
    if (!user) return

    syncWalkGroupsForUser(user.uid).catch((err) => {
      console.error('[Groups] syncWalkGroupsForUser failed', err)
    })

    const unsubscribeWalkGroups = subscribeToWalkGroups(
      user.uid,
      (walkGroups) => {
        const visible = walkGroups.filter((group) =>
          walkGroupIsVisibleOnGroupsPage(group, user.uid),
        )
        setGroups(visible)
        setActivityGroupsLoading(false)
      },
      (err) => {
        setError(err.message)
        setActivityGroupsLoading(false)
      },
    )

    const unsubscribeMatches = subscribeToMatches(
      user.uid,
      (matches) => {
        const buildingMatches = matches.filter((match) => match.matchType === 'building')
        setBuildingGroups(
          buildingMatches.filter((match) => match.participantIds?.includes(user.uid)),
        )
      },
      (err) => setError(err.message),
    )

    const unsubSlots = subscribeToBuildingWalkSlots(user.uid, setBuildingSlots, (err) => {
      setError(err.message)
    })

    const unsubActivities = subscribeToActivities(user.uid, setActivities, (err) => {
      setError(err.message)
    })

    const unsubKids = subscribeToKids(user.uid, setKids, (err) => setError(err.message))

    const unsubSessions = subscribeToUserActiveWalkSessions(
      user.uid,
      setActiveSessions,
      (err) => setError(err.message),
    )

    return () => {
      unsubscribeWalkGroups()
      unsubscribeMatches()
      unsubSlots()
      unsubActivities()
      unsubKids()
      unsubSessions()
    }
  }, [user])

  const groupsByChild = useMemo(
    () => (user ? organizeGroupsByChild(groups, user.uid, activeSessions) : []),
    [groups, user, activeSessions],
  )

  const groupsByDay = useMemo(
    () => (user ? buildGroupsByDay(groups, user.uid, activeSessions) : {}),
    [groups, user, activeSessions],
  )

  async function handleJoinBuildingWalk(walkType, activityId = null) {
    const busyKey = activityId ? `${walkType}:${activityId}` : walkType
    setError(null)
    setBuildingBusyKey(busyKey)
    try {
      await joinBuildingWalk(user.uid, walkType, { activityId })
    } catch (err) {
      setError(err.message)
    } finally {
      setBuildingBusyKey(null)
    }
  }

  async function handleLeaveBuildingWalk(walkType, activityId = null) {
    const busyKey = activityId ? `${walkType}:${activityId}` : walkType
    setError(null)
    setBuildingBusyKey(busyKey)
    try {
      await leaveBuildingWalk(user.uid, walkType, { activityId })
    } catch (err) {
      setError(err.message)
    } finally {
      setBuildingBusyKey(null)
    }
  }

  async function handleLeaveBuildingGroup(group) {
    await leaveBuildingWalk(user.uid, group.buildingWalkType, {
      activityId: group.activityId ?? null,
    })
  }

  const joinedMorning = userHasBuildingWalkSlot(buildingSlots, 'morning_to_school')
  const joinedAfternoon = userHasBuildingWalkSlot(buildingSlots, 'afternoon_from_school')

  return (
    <div>
      <PageHeader
        title="Groups"
        description="Walking groups organized by child and day"
        actions={
          groups.length > 0 ? (
            <ViewToggle
              value={viewMode}
              onChange={setViewMode}
              options={[
                { value: 'list', label: 'List' },
                { value: 'calendar', label: 'Calendar' },
              ]}
            />
          ) : null
        }
      />

      {error && <p className="alert-error">{error}</p>}

      <div className="space-y-8">
        <section>
          <h2 className="kr-section-title">Walk groups</h2>

          {activityGroupsLoading ? (
            <p className="mt-4 text-muted">Loading activity groups…</p>
          ) : groups.length === 0 ? (
            <p className="kr-card-flat mt-4">
              No walk groups yet. Join a group on the Dashboard after adding an activity.
            </p>
          ) : viewMode === 'calendar' ? (
            <div className="mt-4">
              <GroupsWeekCalendar
                groupsByDay={groupsByDay}
                activeSessions={activeSessions}
                kids={kids}
              />
            </div>
          ) : (
            <div className="mt-6 space-y-8">
              {groupsByChild.map(({ childId, childName, byDay }) => (
                <div key={childId}>
                  <h3 className="text-xl font-bold text-primary">
                    <ChildNameWithDot
                      name={childName}
                      childId={childId}
                      kids={kids}
                    />
                  </h3>
                  {WEEKDAYS.filter((day) => byDay[day]?.length).map((day) => (
                    <div key={day} className="mt-4">
                      <h4 className="kr-section-title">{day}</h4>
                      <div className="mt-3 space-y-4">
                        {byDay[day].map((group) => (
                          <GroupCard
                            key={`${group.id}_${group._childName}`}
                            group={group}
                            userId={user.uid}
                            displayStatus={group._displayStatus}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </section>

        <section>
          <h2 className="kr-section-title">Building walks</h2>
          <p className="kr-section-desc">
            Walk with neighbors at your building. Set your home address in Settings, then join
            each walk type separately.
          </p>

          <div className="kr-card mt-4 overflow-hidden">
            <BuildingWalkTypeRow
              walkType="morning_to_school"
              config={BUILDING_WALK_TYPES.morning_to_school}
              joined={joinedMorning}
              busy={buildingBusyKey === 'morning_to_school'}
              onJoin={() => handleJoinBuildingWalk('morning_to_school')}
              onLeave={() => handleLeaveBuildingWalk('morning_to_school')}
            />
            <BuildingWalkTypeRow
              walkType="afternoon_from_school"
              config={BUILDING_WALK_TYPES.afternoon_from_school}
              joined={joinedAfternoon}
              busy={buildingBusyKey === 'afternoon_from_school'}
              onJoin={() => handleJoinBuildingWalk('afternoon_from_school')}
              onLeave={() => handleLeaveBuildingWalk('afternoon_from_school')}
            />

            {activities.length === 0 ? (
              <div className="border-t border-border px-5 py-4">
                <p className="font-semibold text-[var(--color-text)]">
                  {BUILDING_WALK_TYPES.after_school_home.label}
                </p>
                <p className="mt-1 text-sm text-muted">
                  Add an activity on My Activities to join an after-school walk home.
                </p>
              </div>
            ) : (
              activities.map((activity) => {
                const joined = userHasBuildingWalkSlot(
                  buildingSlots,
                  'after_school_home',
                  activity.id,
                )
                const busyKey = `after_school_home:${activity.id}`
                return (
                  <BuildingWalkTypeRow
                    key={activity.id}
                    walkType="after_school_home"
                    config={BUILDING_WALK_TYPES.after_school_home}
                    activityLabel={activity.location}
                    joined={joined}
                    busy={buildingBusyKey === busyKey}
                    onJoin={() => handleJoinBuildingWalk('after_school_home', activity.id)}
                    onLeave={() => handleLeaveBuildingWalk('after_school_home', activity.id)}
                  />
                )
              })
            )}
          </div>

          {buildingGroups.length > 0 && (
            <div className="mt-4 space-y-4">
              {buildingGroups.map((group) => (
                <BuildingWalkGroupCard
                  key={group.id}
                  group={group}
                  userId={user.uid}
                  onLeave={handleLeaveBuildingGroup}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
