import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import PageHeader from '../components/PageHeader'
import ChildAvatar, { childAvatarPropsFromParty } from '../components/ChildAvatar'
import { useAuth } from '../context/AuthContext'
import { formatGroupTimes } from '../firebase/groups'
import { BUILDING_WALK_TYPES, isBuildingWalkMatch } from '../firebase/buildingWalks'
import { formatFirestoreError } from '../firebase/errors'
import { matchIsConnectedForUser } from '../firebase/matching'
import {
  endWalkSession,
  ensureSessionChildRecord,
  getChildWalkStatus,
  getGroupWalkParties,
  markChildDroppedOff,
  mergePartiesWithScheduleStatus,
  mergeWalkSessionChildren,
  startGroupWalk,
  subscribeToGroupAbsences,
  subscribeToGroupDocument,
  subscribeToActiveWalkSession,
  subscribeToWalkSessionChildren,
  toggleParticipantAttendanceToday,
  verifyDropOffSaved,
} from '../firebase/groupWalk'
import {
  isWalkGroupDocument,
  resolveWalkGroupParticipantIds,
  walkGroupIsReadyForWalk,
  walkGroupUserHasAccepted,
} from '../firebase/walkGroups'
import { subscribeToKids } from '../firebase/kids'
import { isUserActiveLeader } from '../firebase/groupLeaders'
import { formatParentContactForGroup, formatSharedContactPhone } from '../utils/contactInfo'
import { formatHistoryTime } from '../firebase/walkHistory'

const SUCCESS_DISMISS_MS = 4000

function normalizePartyForDisplay(party) {
  return {
    ...party,
    parentName: party.parentName || 'Parent',
    contactPhone: formatSharedContactPhone(party.contactPhone),
  }
}

function walkPageStatus(walkInProgress) {
  if (walkInProgress) {
    return { label: 'In progress', badge: 'badge-walk-active' }
  }
  return { label: 'Not started', badge: 'badge-walk-upcoming' }
}

function displayStatusLabel(child, walkInProgress) {
  if (child.walkStatus === 'absent') return 'Absent'
  if (child.walkStatus === 'dropped_off') return 'Dropped off'
  if (walkInProgress) {
    if (child.walkStatus === 'confirmed' || child.pickedUpAt) return 'Arrived'
    return 'Not arrived'
  }
  return 'Confirmed'
}

export default function GroupWalkPage() {
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
  const [kids, setKids] = useState([])

  useEffect(() => {
    if (!user) return undefined
    return subscribeToKids(user.uid, setKids)
  }, [user])

  useEffect(() => {
    if (!successMessage) return undefined
    const timeoutId = setTimeout(() => setSuccessMessage(null), SUCCESS_DISMISS_MS)
    return () => clearTimeout(timeoutId)
  }, [successMessage])

  useEffect(() => {
    if (!user || !groupId) return undefined

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

    return () => unsubGroup()
  }, [user, groupId])

  useEffect(() => {
    if (!user || !groupId) return undefined

    const unsubSession = subscribeToActiveWalkSession(
      groupId,
      user.uid,
      setActiveSession,
      (err) => setError(err.message),
      { leaderAccess: true },
    )
    const unsubAbsences = subscribeToGroupAbsences(
      groupId,
      user.uid,
      setAbsences,
      (err) => setError(err.message),
      { leaderAccess: true },
    )

    return () => {
      unsubSession()
      unsubAbsences()
    }
  }, [user, groupId])

  useEffect(() => {
    if (!activeSession?.id) {
      setSessionChildren([])
      return undefined
    }

    return subscribeToWalkSessionChildren(
      activeSession.id,
      setSessionChildren,
      (err) => setError(err.message),
    )
  }, [activeSession?.id])

  const isBuildingWalk = isBuildingWalkMatch(group)
  const isWalkGroup = isWalkGroupDocument(group)
  const isParticipant =
    resolveWalkGroupParticipantIds(group ?? {}).includes(user?.uid)
    || group?.parties?.some((party) => party.userId === user?.uid)
  const canManageWalk = isUserActiveLeader(group, user?.uid)

  const groupReadyForWalk = useMemo(() => {
    if (!groupLoaded || !group || !user?.uid) return false
    if (isWalkGroup && canManageWalk) {
      return (
        (group.status === 'active' || walkGroupIsReadyForWalk(group, user.uid))
        && getGroupWalkParties(group).length > 0
      )
    }
    if (isWalkGroup) return walkGroupIsReadyForWalk(group, user.uid)
    return matchIsConnectedForUser(group, user.uid) && getGroupWalkParties(group).length > 0
  }, [groupLoaded, group, user?.uid, isWalkGroup, canManageWalk])

  const walkInProgress = Boolean(activeSession)

  const preWalkParties = useMemo(
    () => getGroupWalkParties(group ?? {}).map((party) => normalizePartyForDisplay(party)),
    [group],
  )

  const children = useMemo(() => {
    if (walkInProgress) {
      return mergeWalkSessionChildren(sessionChildren, preWalkParties)
    }
    return mergePartiesWithScheduleStatus(preWalkParties, absences, group?.day).map((child) => ({
      ...child,
      walkStatus: child.walkStatus === 'absent' ? 'absent' : 'confirmed',
    }))
  }, [walkInProgress, sessionChildren, preWalkParties, group?.day, absences])

  const buildingWalkConfig = isBuildingWalk ? BUILDING_WALK_TYPES[group.buildingWalkType] : null
  const pageStatus = walkPageStatus(walkInProgress)

  async function handleStartWalk() {
    if (!groupReadyForWalk || !user || walkInProgress) return

    setError(null)
    setActionId('start')
    try {
      await startGroupWalk(groupId, user.uid, { group })
      setSuccessMessage('Walk started.')
    } catch (err) {
      setError(formatFirestoreError(err, 'Could not start the walk.'))
    } finally {
      setActionId(null)
    }
  }

  async function handleEndWalk() {
    if (!activeSession?.id || !walkInProgress) return

    setError(null)
    setActionId('end')
    try {
      await endWalkSession(activeSession.id)
      setSuccessMessage('Walk ended. All remaining children marked as dropped off.')
    } catch (err) {
      setError(formatFirestoreError(err, 'Could not end the walk.'))
    } finally {
      setActionId(null)
    }
  }

  async function handleToggleAttendance(child) {
    if (!canManageWalk || walkInProgress || !group) return

    const toggleId = `toggle_${child.userId}_${child.childId}`
    setError(null)
    setActionId(toggleId)

    try {
      const result = await toggleParticipantAttendanceToday({
        groupId,
        party: child,
        absences,
        group,
        leaderId: user.uid,
      })
      setSuccessMessage(
        result.status === 'absent'
          ? `${child.childFirstName} marked absent for today.`
          : `${child.childFirstName} marked as attending today.`,
      )
    } catch (err) {
      setError(formatFirestoreError(err, 'Could not update attendance.'))
    } finally {
      setActionId(null)
    }
  }

  async function handleDropOff(child) {
    if (!activeSession?.id || !walkInProgress) return

    const dropOffId = child.id ?? `${child.userId}_${child.childId}`
    const previousWalkStatus = child.walkStatus
    const previousDroppedOffAt = child.droppedOffAt ?? null

    setError(null)
    setSuccessMessage(null)
    setActionId(dropOffId)

    const optimisticDroppedOffAt = new Date()
    setSessionChildren((current) =>
      current.map((entry) =>
        entry.id === child.id || (entry.userId === child.userId && entry.childId === child.childId)
          ? { ...entry, walkStatus: 'dropped_off', droppedOffAt: optimisticDroppedOffAt }
          : entry,
      ),
    )

    try {
      if (child._missingFromSession) {
        await ensureSessionChildRecord(activeSession.id, child, activeSession)
      }
      const result = await markChildDroppedOff(
        activeSession.id,
        child.userId,
        child.childId,
        child.id,
      )
      setSuccessMessage(
        result?.completed
          ? 'All children dropped off — walk complete.'
          : `${child.childFirstName} marked as dropped off.`,
      )
    } catch (err) {
      try {
        const verification = await verifyDropOffSaved(
          activeSession.id,
          child.userId,
          child.childId,
          child.id,
        )
        if (verification.saved) {
          setSuccessMessage(
            verification.walkComplete
              ? 'All children dropped off — walk complete.'
              : `${child.childFirstName} marked as dropped off.`,
          )
          return
        }
      } catch (verifyError) {
        console.warn('[GroupWalkPage] drop-off verification failed', verifyError)
      }

      setSessionChildren((current) =>
        current.map((entry) =>
          entry.id === child.id || (entry.userId === child.userId && entry.childId === child.childId)
            ? { ...entry, walkStatus: previousWalkStatus, droppedOffAt: previousDroppedOffAt }
            : entry,
        ),
      )
      setError(formatFirestoreError(err, 'Could not save drop-off. Please try again.'))
    } finally {
      setActionId(null)
    }
  }

  if (loading) {
    return (
      <div>
        <PageHeader title="Manage Walk" description="Today's walk for this group" />
        <p className="text-muted">Loading…</p>
      </div>
    )
  }

  const hasAccess = group && (canManageWalk || isParticipant || activeSession)

  if (!hasAccess) {
    return (
      <div>
        <PageHeader title="Manage Walk" description="Today's walk for this group" />
        <p className="text-muted">
          Group not found or you don&apos;t have access.{' '}
          <Link to="/groups" className="link-accent">
            Back to Groups
          </Link>
        </p>
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title="Manage Walk"
        description={
          isBuildingWalk
            ? `${buildingWalkConfig?.route} · ${buildingWalkConfig?.scheduleLabel}`
            : `${group.day} · ${formatGroupTimes(group)}`
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-4">
        <Link to="/groups" className="link-accent text-sm">
          ← Back to group
        </Link>
        {canManageWalk && (
          <Link to={`/groups/${groupId}/leader`} className="btn-secondary py-1.5 text-sm">
            Group Settings
          </Link>
        )}
      </div>

      <div className="kr-card mb-6 p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-lg font-semibold text-[var(--color-text)]">{group.location}</p>
            {walkInProgress && activeSession?.startedAt && (
              <p className="mt-1 text-sm text-muted">
                Started {formatHistoryTime(activeSession.startedAt)}
              </p>
            )}
          </div>
          <span className={pageStatus.badge}>{pageStatus.label}</span>
        </div>

        {canManageWalk && !walkInProgress && (
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
                : 'Start Walk'}
          </button>
        )}

        {canManageWalk && walkInProgress && (
          <button
            type="button"
            onClick={handleEndWalk}
            disabled={actionId === 'end'}
            className="btn-primary mt-4"
          >
            {actionId === 'end' ? 'Ending…' : 'End Walk'}
          </button>
        )}

        {!canManageWalk && isParticipant && !walkInProgress && (
          <p className="mt-4 text-sm text-muted">
            A Walk Leader will start the walk when your group meets up.
          </p>
        )}
      </div>

      {successMessage && (
        <p className="mb-4 rounded-md bg-green-50 px-4 py-3 text-sm text-green-700">{successMessage}</p>
      )}

      {error && <p className="alert-error mb-4">{error}</p>}

      <h2 className="kr-section-title">Participants</h2>
      <p className="kr-section-desc">
        {canManageWalk && !walkInProgress
          ? 'Tap a name to mark absent or confirmed for today.'
          : 'Walk status for each child in the group.'}
      </p>

      <ul className="kr-card mt-3 divide-y divide-border">
        {children.length === 0 ? (
          <li className="px-5 py-8 text-center text-sm text-muted">No children in this group yet.</li>
        ) : (
          children.map((child) => {
            const status = getChildWalkStatus(child)
            const childKey = child.id ?? `${child.userId}_${child.childId}`
            const toggleId = `toggle_${child.userId}_${child.childId}`
            const isAbsent = child.walkStatus === 'absent'
            const isDroppedOff = child.walkStatus === 'dropped_off'
            const canToggleAttendance = canManageWalk && !walkInProgress && !isDroppedOff
            const canDropOff = canManageWalk && walkInProgress && !isAbsent && !isDroppedOff

            return (
              <li key={childKey} className="px-5 py-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-3">
                      <ChildAvatar {...childAvatarPropsFromParty(child, kids)} size="md" />
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          {canToggleAttendance ? (
                            <button
                              type="button"
                              onClick={() => handleToggleAttendance(child)}
                              disabled={actionId === toggleId}
                              className="font-semibold text-[var(--color-text)] underline-offset-2 hover:text-primary hover:underline disabled:opacity-50"
                            >
                              {child.childFirstName}
                            </button>
                          ) : (
                            <p className="font-semibold text-[var(--color-text)]">{child.childFirstName}</p>
                          )}
                          <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${status.style}`}>
                            {displayStatusLabel(child, walkInProgress)}
                          </span>
                        </div>
                        <p className="mt-1.5 text-sm text-muted">
                          {formatParentContactForGroup(child, group, user.uid)}
                        </p>
                      </div>
                    </div>
                    {child.pickedUpAt && (
                      <p className="mt-2 text-xs text-muted sm:ml-[3.25rem]">
                        Arrived {formatHistoryTime(child.pickedUpAt)}
                        {child.droppedOffAt && (
                          <> · Dropped off {formatHistoryTime(child.droppedOffAt)}</>
                        )}
                      </p>
                    )}
                  </div>

                  {canDropOff && (
                    <button
                      type="button"
                      onClick={() => handleDropOff(child)}
                      disabled={actionId === childKey}
                      className="btn-primary shrink-0 py-1.5"
                    >
                      {actionId === childKey ? 'Saving…' : 'Drop off'}
                    </button>
                  )}
                </div>
              </li>
            )
          })
        )}
      </ul>

      <p className="mt-6 flex flex-wrap gap-4">
        <Link to="/groups" className="link-accent text-sm">
          ← Back to group
        </Link>
        {canManageWalk && (
          <Link to={`/groups/${groupId}/leader`} className="link-accent text-sm">
            Group Settings
          </Link>
        )}
      </p>
    </div>
  )
}
