import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import PageHeader from '../components/PageHeader'
import { useAuth } from '../context/AuthContext'
import { formatGroupTimes } from '../firebase/groups'
import { BUILDING_WALK_TYPES, isBuildingWalkMatch } from '../firebase/buildingWalks'
import { formatFirestoreError } from '../firebase/errors'
import { matchIsConnectedForUser } from '../firebase/matching'
import {
  getChildWalkStatus,
  getGroupWalkParties,
  isWalkSessionComplete,
  markChildArrived,
  markChildDroppedOff,
  mergePartiesWithScheduleStatus,
  startGroupWalk,
  subscribeToActiveWalkSession,
  subscribeToGroupDocument,
  subscribeToGroupAbsences,
  subscribeToWalkSessionChildren,
  verifyDropOffSaved,
} from '../firebase/groupWalk'
import { walkGroupIsReadyForWalk } from '../firebase/walkGroups'
import { isUserActiveLeader } from '../firebase/groupLeaders'
import { formatHistoryTime } from '../firebase/walkHistory'

const SUCCESS_DISMISS_MS = 4000

export default function GroupLeaderView() {
  const { groupId } = useParams()
  const { user } = useAuth()
  const [group, setGroup] = useState(null)
  const [activeSession, setActiveSession] = useState(null)
  const [sessionChildren, setSessionChildren] = useState([])
  const [absences, setAbsences] = useState([])
  const [groupLoaded, setGroupLoaded] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [successMessage, setSuccessMessage] = useState(null)
  const [actionId, setActionId] = useState(null)

  useEffect(() => {
    if (!successMessage) return undefined
    const timeoutId = setTimeout(() => setSuccessMessage(null), SUCCESS_DISMISS_MS)
    return () => clearTimeout(timeoutId)
  }, [successMessage])

  useEffect(() => {
    if (!user || !groupId) return

    const unsubGroup = subscribeToGroupDocument(
      groupId,
      (data) => {
        setGroup(data)
        setGroupLoaded(true)
        setLoading(false)
      },
      (err) => {
        setError(err.message)
        setGroupLoaded(true)
        setLoading(false)
      },
    )

    return () => {
      unsubGroup()
    }
  }, [user, groupId])

  const isLeader = isUserActiveLeader(group, user?.uid)

  useEffect(() => {
    if (!user || !groupId) return

    const unsubSession = subscribeToActiveWalkSession(
      groupId,
      user.uid,
      setActiveSession,
      (err) => setError(err.message),
      { leaderAccess: isLeader },
    )
    const unsubAbsences = subscribeToGroupAbsences(
      groupId,
      user.uid,
      setAbsences,
      (err) => setError(err.message),
      { leaderAccess: isLeader },
    )

    return () => {
      unsubSession()
      unsubAbsences()
    }
  }, [user, groupId, isLeader])

  useEffect(() => {
    if (!activeSession?.id) {
      setSessionChildren([])
      return
    }

    const unsubscribe = subscribeToWalkSessionChildren(
      activeSession.id,
      (children) => {
        setSessionChildren(children)
      },
      (err) => setError(err.message),
    )

    return unsubscribe
  }, [activeSession?.id])

  const isBuildingWalk = isBuildingWalkMatch(group)
  const isWalkGroup = group?.source === 'walkGroup'
  const isParticipant = group?.participantIds?.includes(user?.uid)
    || group?.parties?.some((party) => party.userId === user?.uid)

  const groupReadyForWalk = useMemo(() => {
    if (!groupLoaded || !group || !user?.uid) return false
    if (isWalkGroup && isUserActiveLeader(group, user.uid)) {
      return group.status === 'active' && getGroupWalkParties(group).length > 0
    }
    if (isWalkGroup) return walkGroupIsReadyForWalk(group, user.uid)
    return (
      matchIsConnectedForUser(group, user.uid)
      && getGroupWalkParties(group).length > 0
    )
  }, [groupLoaded, group, user?.uid, isWalkGroup])

  const walkInProgress = Boolean(activeSession)
  const walkComplete = walkInProgress && isWalkSessionComplete(sessionChildren)

  const preWalkParties = useMemo(
    () => getGroupWalkParties(group ?? {}).map((party) => normalizePartyForDisplay(party)),
    [group],
  )

  const children = useMemo(() => {
    if (walkInProgress) return sessionChildren
    return mergePartiesWithScheduleStatus(preWalkParties, absences, group?.day)
  }, [walkInProgress, sessionChildren, preWalkParties, group?.day, absences])

  const buildingWalkConfig = isBuildingWalk
    ? BUILDING_WALK_TYPES[group.buildingWalkType]
    : null

  async function handleStartWalk() {
    if (!groupReadyForWalk || !user) return

    setError(null)
    setActionId('start')
    try {
      await startGroupWalk(groupId, user.uid, { group })
    } catch (err) {
      setError(formatFirestoreError(err, 'Could not start the walk.'))
    } finally {
      setActionId(null)
    }
  }

  async function handleArrival(child) {
    if (!activeSession?.id) {
      setError('No walk is in progress. Refresh the page and try again.')
      return
    }

    const arrivalId = `arrive_${child.id ?? `${child.userId}_${child.childId}`}`
    setError(null)
    setSuccessMessage(null)
    setActionId(arrivalId)

    setSessionChildren((current) =>
      current.map((entry) =>
        entry.id === child.id
        || (entry.userId === child.userId && entry.childId === child.childId)
          ? { ...entry, walkStatus: 'confirmed', pickedUpAt: new Date() }
          : entry,
      ),
    )

    try {
      await markChildArrived(activeSession.id, child.userId, child.childId, child.id)
      setError(null)
      setSuccessMessage(`${child.childFirstName} marked as arrived.`)
    } catch (err) {
      setError(formatFirestoreError(err, 'Could not save arrival. Please try again.'))
    } finally {
      setActionId(null)
    }
  }

  async function handleDropOff(child) {
    if (!activeSession?.id) {
      setError('No walk is in progress. Refresh the page and try again.')
      return
    }

    const dropOffId = child.id ?? `${child.userId}_${child.childId}`
    const previousWalkStatus = child.walkStatus
    const previousDroppedOffAt = child.droppedOffAt ?? null

    setError(null)
    setSuccessMessage(null)
    setActionId(dropOffId)

    const optimisticDroppedOffAt = new Date()
    setSessionChildren((current) =>
      current.map((entry) =>
        entry.id === child.id
        || (entry.userId === child.userId && entry.childId === child.childId)
          ? { ...entry, walkStatus: 'dropped_off', droppedOffAt: optimisticDroppedOffAt }
          : entry,
      ),
    )

    const showDropOffSuccess = (firstName, completed) => {
      setError(null)
      setSuccessMessage(
        completed
          ? `All children dropped off — walk complete.`
          : `${firstName} marked as dropped off.`,
      )
    }

    try {
      const result = await markChildDroppedOff(
        activeSession.id,
        child.userId,
        child.childId,
        child.id,
      )

      showDropOffSuccess(child.childFirstName, Boolean(result?.completed))
    } catch (err) {
      try {
        const verification = await verifyDropOffSaved(
          activeSession.id,
          child.userId,
          child.childId,
          child.id,
        )

        if (verification.saved) {
          showDropOffSuccess(child.childFirstName, verification.walkComplete)
          return
        }
      } catch (verifyError) {
        console.warn('[dropOff] verification failed after error', verifyError)
      }

      setSessionChildren((current) =>
        current.map((entry) =>
          entry.id === child.id
          || (entry.userId === child.userId && entry.childId === child.childId)
            ? {
                ...entry,
                walkStatus: previousWalkStatus,
                droppedOffAt: previousDroppedOffAt,
              }
            : entry,
        ),
      )
      setSuccessMessage(null)
      setError(formatFirestoreError(err, 'Could not save drop-off. Please try again.'))
    } finally {
      setActionId(null)
    }
  }

  if (loading) {
    return (
      <div>
        <PageHeader title="Group Leader View" description="Manage your walking group" />
        <p className="text-muted">Loading group…</p>
      </div>
    )
  }

  const hasAccess = group && (
    isUserActiveLeader(group, user?.uid)
    || isParticipant
    || walkInProgress
  )

  if (!hasAccess) {
    return (
      <div>
        <PageHeader title="Group Leader View" description="Manage your walking group" />
        <p className="text-muted">
          Group not found or you don&apos;t have access.{' '}
          <Link to="/groups" className="font-semibold text-primary hover:underline">
            Back to Groups
          </Link>
        </p>
      </div>
    )
  }

  const pickupLabel = isBuildingWalk
    ? group.buildingWalkType === 'morning_to_school'
      ? 'Walk started from home'
      : group.buildingWalkType === 'afternoon_from_school'
        ? 'Walk started from school'
        : 'Walk started from activity'
    : 'Walk started'

  const dropOffLabel = isBuildingWalk
    ? group.buildingWalkType === 'morning_to_school'
      ? 'Mark arrival and drop-off for each child.'
      : 'Mark arrival and drop-off for each child at home.'
    : 'Mark arrival and drop-off for each child at their activity.'

  return (
    <div>
      <PageHeader
        title="Group Leader View"
        description="Manage your walking group"
      />

      <div className="kr-card mb-6 p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-lg font-semibold text-[var(--color-text)]">{group.location}</p>
            <p className="mt-1 text-sm text-muted">
              {isBuildingWalk
                ? `${buildingWalkConfig?.route} · ${buildingWalkConfig?.scheduleLabel}`
                : `${group.day} · ${formatGroupTimes(group)}`}
            </p>
            {isWalkGroup && (
              <p className="mt-1 text-sm text-muted">
                {preWalkParties.length} children in this group
              </p>
            )}
          </div>
          <span className={
            walkComplete
              ? 'badge-walk-upcoming'
              : walkInProgress
                ? 'badge-walk-active'
                : 'badge-walk-upcoming'
          }>
            {walkComplete ? 'Walk complete' : walkInProgress ? 'Walk in progress' : 'Ready to start'}
          </span>
        </div>

        {!walkInProgress && (
          <>
            <p className="mt-4 text-sm text-muted">
              {isWalkGroup
                ? 'All accepted children in the group appear below. Mark each child as arrived when they join the walk, then dropped off at their destination.'
                : isBuildingWalk
                  ? 'Children are automatically confirmed on weekdays. They show as absent only when a parent has marked them absent for today.'
                  : 'Children are automatically confirmed on scheduled class days. They show as absent only when a parent has marked them absent for today.'}
            </p>
            <button
              type="button"
              onClick={handleStartWalk}
              disabled={actionId === 'start' || !groupReadyForWalk}
              className="btn-primary mt-4"
            >
              {actionId === 'start'
                ? 'Starting…'
                : !groupReadyForWalk
                  ? 'Loading group…'
                  : 'Start walk'}
            </button>
          </>
        )}

        {walkInProgress && !walkComplete && (
          <>
            <p className="mt-4 text-sm text-muted">
              {pickupLabel}: {formatHistoryTime(activeSession.startedAt)}
            </p>
            <p className="mt-2 text-sm text-muted">{dropOffLabel}</p>
          </>
        )}

        {walkComplete && (
          <p className="mt-4 text-sm text-[var(--color-walk-green)]">
            All children have been dropped off. This walk is complete.
          </p>
        )}
      </div>

      {successMessage && (
        <p className="mb-4 rounded-md bg-green-50 px-4 py-3 text-sm text-green-700">{successMessage}</p>
      )}

      {error && (
        <p className="alert-error mb-4">{error}</p>
      )}

      <h2 className="kr-section-title">Children</h2>
      <ul className="kr-card mt-3 divide-y divide-border">
        {children.map((child) => {
          const status = getChildWalkStatus(child)
          const childKey = child.id ?? `${child.userId}_${child.childId}`
          const arrivalId = `arrive_${childKey}`
          const isInactive =
            child.walkStatus === 'absent' ||
            child.walkStatus === 'off_day' ||
            child.walkStatus === 'dropped_off'
          const hasArrived =
            child.walkStatus === 'confirmed' ||
            child.walkStatus === 'dropped_off' ||
            Boolean(child.pickedUpAt)
          const canArrive =
            walkInProgress &&
            !walkComplete &&
            !isInactive &&
            isWalkGroup &&
            child.walkStatus === 'waiting_arrival' &&
            !hasArrived
          const canDropOff =
            walkInProgress &&
            !walkComplete &&
            !isInactive &&
            (hasArrived || !isWalkGroup)

          return (
            <li key={childKey} className="px-5 py-4">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-3">
                    <p className="font-semibold text-[var(--color-text)]">{child.childFirstName}</p>
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${status.style}`}>
                      {status.label}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-muted">Parent: {child.parentName}</p>
                  <p className="text-sm text-muted">Phone: {child.contactPhone}</p>
                  {child.pickedUpAt && (
                    <p className="mt-2 text-sm text-muted">
                      Arrived: {formatHistoryTime(child.pickedUpAt)}
                    </p>
                  )}
                  {child.droppedOffAt && (
                    <p className="text-sm text-muted">
                      Dropped off: {formatHistoryTime(child.droppedOffAt)}
                    </p>
                  )}
                </div>

                <div className="flex shrink-0 flex-wrap gap-2">
                  {canArrive && (
                    <button
                      type="button"
                      onClick={() => handleArrival(child)}
                      disabled={actionId === arrivalId}
                      className="rounded-xl border border-[var(--color-walk-green)] px-3 py-1.5 text-sm font-semibold text-[var(--color-walk-green)] hover:bg-[var(--color-walk-green-bg)] disabled:opacity-50"
                    >
                      {actionId === arrivalId ? 'Saving…' : 'Mark as arrived'}
                    </button>
                  )}
                  {canDropOff && (
                    <button
                      type="button"
                      onClick={() => handleDropOff(child)}
                      disabled={actionId === childKey}
                      className="btn-primary py-1.5"
                    >
                      {actionId === childKey ? 'Saving…' : 'Mark as dropped off'}
                    </button>
                  )}
                </div>
              </div>
            </li>
          )
        })}
      </ul>

      <p className="mt-6 flex flex-wrap gap-4">
        <Link to="/leader" className="text-sm font-semibold text-primary hover:underline">
          ← All leader groups
        </Link>
        <Link to="/groups" className="text-sm font-semibold text-primary hover:underline">
          Back to Groups
        </Link>
      </p>
    </div>
  )
}

function normalizePartyForDisplay(party) {
  return {
    ...party,
    parentName: party.parentName || 'Parent',
    contactPhone: party.contactPhone || 'Not provided',
  }
}
