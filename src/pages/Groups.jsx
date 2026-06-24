import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import PageHeader from '../components/PageHeader'
import { useAuth } from '../context/AuthContext'
import {
  formatGroupChildNames,
  formatGroupTimes,
  getGroupWalkStatus,
  WALK_STATUS_LABELS,
  WALK_STATUS_STYLES,
} from '../firebase/groups'
import {
  clearAbsence,
  getUpcomingAbsences,
  markAbsentDateRange,
  markAbsentSingleDate,
  resolveMatchParticipantIds,
  subscribeToActiveWalkSession,
  subscribeToGroupAbsences,
} from '../firebase/groupWalk'
import { getPartiesForUser, leaveGroup, matchIsConnectedForUser, subscribeToMatches, isActivityMatch } from '../firebase/matching'
import {
  BUILDING_WALK_TYPES,
  joinBuildingWalk,
  leaveBuildingWalk,
  subscribeToBuildingWalkSlots,
  userHasBuildingWalkSlot,
} from '../firebase/buildingWalks'
import { subscribeToActivities } from '../firebase/activities'
import { formatDisplayDate, getPartyUpcomingScheduledDates } from '../firebase/sessions'

const selectClass =
  'rounded-md border border-gray-300 px-2 py-1 text-xs text-gray-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500'

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
    () => resolveMatchParticipantIds(group),
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
      <p className="text-xs text-gray-500">
        {party.childFirstName}: No upcoming class dates scheduled for this activity.
      </p>
    )
  }

  return (
    <div className="rounded-md border border-gray-200 bg-gray-50 p-3">
      <p className="text-xs font-medium text-gray-900">{party.childFirstName}</p>

      <div className="mt-2 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setMode('single')}
          className={`rounded-md px-2 py-1 text-xs font-medium ${
            mode === 'single'
              ? 'bg-indigo-600 text-white'
              : 'border border-gray-300 bg-white text-gray-700'
          }`}
        >
          Single date
        </button>
        <button
          type="button"
          onClick={() => setMode('range')}
          className={`rounded-md px-2 py-1 text-xs font-medium ${
            mode === 'range'
              ? 'bg-indigo-600 text-white'
              : 'border border-gray-300 bg-white text-gray-700'
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
            className={selectClass}
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
            className="rounded-md border border-gray-300 bg-white px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-50"
          >
            {busy ? 'Saving…' : 'Mark absent'}
          </button>
        </div>
      ) : (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <select
            value={rangeStart}
            onChange={(event) => setRangeStart(event.target.value)}
            className={selectClass}
            aria-label="Range start"
          >
            {scheduledDates.map((dateKey) => (
              <option key={`start-${dateKey}`} value={dateKey}>
                {formatDisplayDate(dateKey)}
              </option>
            ))}
          </select>
          <span className="text-xs text-gray-500">to</span>
          <select
            value={rangeEnd}
            onChange={(event) => setRangeEnd(event.target.value)}
            className={selectClass}
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
            className="rounded-md border border-gray-300 bg-white px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-50"
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
              className="flex flex-wrap items-center justify-between gap-2 text-xs text-gray-600"
            >
              <span>Absent: {formatAbsenceLabel(absence)}</span>
              <button
                type="button"
                onClick={() => handleCancelAbsence(absence.id)}
                disabled={busy}
                className="font-medium text-indigo-600 hover:text-indigo-700 disabled:opacity-50"
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

function GroupCard({ group, userId }) {
  const [activeSession, setActiveSession] = useState(null)
  const [absences, setAbsences] = useState([])
  const [leaving, setLeaving] = useState(false)
  const [error, setError] = useState(null)

  const partnerLeft = group.status === 'partner_left'

  useEffect(() => {
    const unsubSession = subscribeToActiveWalkSession(group.id, userId, setActiveSession)
    const unsubAbsences = subscribeToGroupAbsences(group.id, userId, setAbsences)
    return () => {
      unsubSession()
      unsubAbsences()
    }
  }, [group.id])

  const walkInProgress = Boolean(activeSession)
  const myParties = getPartiesForUser(group, userId)
  const displayWalkStatus = walkInProgress
    ? 'in progress'
    : partnerLeft
      ? 'partner left'
      : getGroupWalkStatus(group)

  async function handleLeaveGroup() {
    setError(null)
    setLeaving(true)
    try {
      await leaveGroup(group.id, userId)
    } catch (err) {
      setError(err.message)
    } finally {
      setLeaving(false)
    }
  }

  return (
    <li className="px-4 py-5 sm:px-6">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="font-medium text-gray-900">{formatGroupChildNames(group)}</p>
          <p className="mt-1 text-sm text-gray-600">{group.location}</p>
          <p className="mt-1 text-sm text-gray-500">
            {group.day} · {formatGroupTimes(group)}
          </p>

          {partnerLeft && (
            <p className="mt-3 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800">
              The other family has left this group. You can find a new match on the Dashboard.
            </p>
          )}

          {!walkInProgress && !partnerLeft && myParties.length > 0 && (
            <div className="mt-3 space-y-2">
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
            <p className="mt-3 text-xs text-gray-500">
              Absences can be updated again after today&apos;s walk is completed.
            </p>
          )}
        </div>

        <span
          className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${
            partnerLeft
              ? 'bg-amber-50 text-amber-700'
              : (WALK_STATUS_STYLES[displayWalkStatus] ?? WALK_STATUS_STYLES.upcoming)
          }`}
        >
          {walkInProgress
            ? 'In progress'
            : partnerLeft
              ? 'Partner left'
              : WALK_STATUS_LABELS[displayWalkStatus]}
        </span>
      </div>
      {!partnerLeft && (
        <p className="mt-3">
          <Link
            to={`/groups/${group.id}/leader`}
            className="text-sm font-medium text-indigo-600 hover:text-indigo-700"
          >
            Group leader view →
          </Link>
        </p>
      )}
      {!walkInProgress && !partnerLeft && (
        <button
          type="button"
          onClick={handleLeaveGroup}
          disabled={leaving}
          className="mt-3 text-sm font-medium text-red-600 hover:text-red-700 disabled:opacity-50"
        >
          {leaving ? 'Leaving…' : 'Leave group'}
        </button>
      )}
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </li>
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
  }, [group.id])

  const walkInProgress = Boolean(activeSession)
  const myParties = getPartiesForUser(group, userId)
  const displayWalkStatus = walkInProgress
    ? 'in progress'
    : partnerLeft
      ? 'partner left'
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
    <li className="px-4 py-5 sm:px-6">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="font-medium text-gray-900">{formatGroupChildNames(group)}</p>
          <p className="mt-1 text-sm text-gray-600">{group.location}</p>
          <p className="mt-1 text-sm text-gray-500">
            {walkTypeConfig?.route} · {walkTypeConfig?.scheduleLabel ?? formatGroupTimes(group)}
          </p>

          {group.status === 'solo' && (
            <p className="mt-3 rounded-md bg-blue-50 px-3 py-2 text-xs text-blue-800">
              Waiting for neighbors at {group.homeAddressDisplay} to join this walk.
            </p>
          )}

          {!walkInProgress && !partnerLeft && group.status === 'connected' && myParties.length > 0 && (
            <div className="mt-3 space-y-2">
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
            <p className="mt-3 text-xs text-gray-500">
              Absences can be updated again after today&apos;s walk is completed.
            </p>
          )}
        </div>

        <span
          className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${
            partnerLeft
              ? 'bg-amber-50 text-amber-700'
              : group.status === 'solo'
                ? 'bg-blue-50 text-blue-700'
                : (WALK_STATUS_STYLES[displayWalkStatus] ?? WALK_STATUS_STYLES.upcoming)
          }`}
        >
          {walkInProgress
            ? 'In progress'
            : partnerLeft
              ? 'Partner left'
              : group.status === 'solo'
                ? 'Waiting'
                : WALK_STATUS_LABELS[displayWalkStatus]}
        </span>
      </div>
      {group.status === 'connected' && !partnerLeft && (
        <p className="mt-3">
          <Link
            to={`/groups/${group.id}/leader`}
            className="text-sm font-medium text-indigo-600 hover:text-indigo-700"
          >
            Group leader view →
          </Link>
        </p>
      )}
      {!walkInProgress && (
        <button
          type="button"
          onClick={handleLeave}
          disabled={leaving}
          className="mt-3 text-sm font-medium text-red-600 hover:text-red-700 disabled:opacity-50"
        >
          {leaving ? 'Leaving…' : 'Leave walk'}
        </button>
      )}
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </li>
  )
}

function BuildingWalkTypeRow({ walkType, config, joined, busy, onJoin, onLeave, activityLabel }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4 border-b border-gray-100 px-4 py-4 last:border-b-0 sm:px-6">
      <div className="min-w-0 flex-1">
        <p className="font-medium text-gray-900">{config.label}</p>
        {activityLabel && (
          <p className="mt-0.5 text-sm text-gray-600">{activityLabel}</p>
        )}
        <p className="mt-1 text-sm text-gray-500">
          {config.route} · {config.scheduleLabel}
        </p>
      </div>
      <div className="shrink-0">
        {joined ? (
          <button
            type="button"
            onClick={onLeave}
            disabled={busy}
            className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            {busy ? 'Leaving…' : 'Leave'}
          </button>
        ) : (
          <button
            type="button"
            onClick={onJoin}
            disabled={busy}
            className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
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
  const [activityGroupsLoading, setActivityGroupsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [buildingBusyKey, setBuildingBusyKey] = useState(null)

  useEffect(() => {
    if (!user) return

    const unsubscribeMatches = subscribeToMatches(
      user.uid,
      (matches) => {
        const activityMatches = matches.filter(isActivityMatch)
        const buildingMatches = matches.filter((match) => match.matchType === 'building')

        const connected = activityMatches.filter((match) => matchIsConnectedForUser(match, user.uid))
        const partnerLeft = activityMatches.filter(
          (match) =>
            match.status === 'partner_left' &&
            getPartiesForUser(match, user.uid).some((party) => party.response === 'accepted'),
        )
        setGroups([...connected, ...partnerLeft])

        const myBuildingGroups = buildingMatches.filter((match) =>
          match.participantIds?.includes(user.uid),
        )
        setBuildingGroups(myBuildingGroups)
        setActivityGroupsLoading(false)
      },
      (err) => {
        setError(err.message)
        setActivityGroupsLoading(false)
      },
    )

    const unsubSlots = subscribeToBuildingWalkSlots(user.uid, setBuildingSlots, (err) => {
      setError(err.message)
    })

    const unsubActivities = subscribeToActivities(user.uid, setActivities, (err) => {
      setError(err.message)
    })

    return () => {
      unsubscribeMatches()
      unsubSlots()
      unsubActivities()
    }
  }, [user])

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
        description="Walking groups in your neighborhood"
      />

      {error && (
        <p className="mb-4 rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
      )}

      <div className="space-y-8">
          <section>
            <h2 className="text-sm font-medium text-gray-900">Activity groups</h2>
            {activityGroupsLoading ? (
              <p className="mt-4 text-sm text-gray-600">Loading activity groups…</p>
            ) : groups.length === 0 ? (
              <p className="mt-4 rounded-lg border border-dashed border-gray-300 bg-white px-4 py-8 text-center text-sm text-gray-600">
                No confirmed activity groups yet. Accept a match on the Dashboard to form a
                walking group.
              </p>
            ) : (
              <ul className="mt-4 divide-y divide-gray-200 rounded-lg border border-gray-200 bg-white">
                {groups.map((group) => (
                  <GroupCard key={group.id} group={group} userId={user.uid} />
                ))}
              </ul>
            )}
          </section>

          <section>
            <h2 className="text-sm font-medium text-gray-900">Building walks</h2>
            <p className="mt-1 text-sm text-gray-500">
              Walk with neighbors at your building. Set your home address in Settings, then join
              each walk type separately.
            </p>

            <div className="mt-4 rounded-lg border border-gray-200 bg-white">
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
                <div className="border-t border-gray-100 px-4 py-4 sm:px-6">
                  <p className="text-sm font-medium text-gray-900">
                    {BUILDING_WALK_TYPES.after_school_home.label}
                  </p>
                  <p className="mt-1 text-sm text-gray-500">
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
                      onLeave={() =>
                        handleLeaveBuildingWalk('after_school_home', activity.id)
                      }
                    />
                  )
                })
              )}
            </div>

            {buildingGroups.length > 0 && (
              <ul className="mt-4 divide-y divide-gray-200 rounded-lg border border-gray-200 bg-white">
                {buildingGroups.map((group) => (
                  <BuildingWalkGroupCard
                    key={group.id}
                    group={group}
                    userId={user.uid}
                    onLeave={handleLeaveBuildingGroup}
                  />
                ))}
              </ul>
            )}
          </section>
        </div>
    </div>
  )
}
