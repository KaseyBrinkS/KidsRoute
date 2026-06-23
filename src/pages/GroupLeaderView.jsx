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
  markChildDroppedOff,
  mergePartiesWithScheduleStatus,
  startGroupWalk,
  subscribeToActiveWalkSession,
  subscribeToGroup,
  subscribeToGroupAbsences,
  subscribeToWalkSessionChildren,
} from '../firebase/groupWalk'
import { formatHistoryTime } from '../firebase/walkHistory'

export default function GroupLeaderView() {
  const { groupId } = useParams()
  const { user } = useAuth()
  const [group, setGroup] = useState(null)
  const [activeSession, setActiveSession] = useState(null)
  const [sessionChildren, setSessionChildren] = useState([])
  const [absences, setAbsences] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [actionId, setActionId] = useState(null)

  useEffect(() => {
    if (!user || !groupId) return

    const unsubGroup = subscribeToGroup(groupId, setGroup, (err) => {
      setError(err.message)
      setLoading(false)
    })
    const unsubSession = subscribeToActiveWalkSession(groupId, setActiveSession)
    const unsubAbsences = subscribeToGroupAbsences(groupId, setAbsences)

    return () => {
      unsubGroup()
      unsubSession()
      unsubAbsences()
    }
  }, [user, groupId])

  useEffect(() => {
    if (!activeSession?.id) {
      setSessionChildren([])
      setLoading(false)
      return
    }

    const unsubscribe = subscribeToWalkSessionChildren(
      activeSession.id,
      (children) => {
        setSessionChildren(children)
        setLoading(false)
      },
      (err) => setError(err.message),
    )

    return unsubscribe
  }, [activeSession?.id])

  useEffect(() => {
    if (group) setLoading(false)
  }, [group])

  const isParticipant = group?.participantIds?.includes(user?.uid)
  const walkInProgress = Boolean(activeSession)
  const children = useMemo(() => {
    if (walkInProgress) return sessionChildren
    return mergePartiesWithScheduleStatus(group?.parties ?? [], absences, group?.day)
  }, [walkInProgress, sessionChildren, group?.parties, group?.day, absences])

  const isBuildingWalk = isBuildingWalkMatch(group)
  const buildingWalkConfig = isBuildingWalk
    ? BUILDING_WALK_TYPES[group.buildingWalkType]
    : null

  async function handleStartWalk() {
    setError(null)
    setActionId('start')
    try {
      await startGroupWalk(groupId, user.uid)
    } catch (err) {
      setError(formatFirestoreError(err, 'Could not start the walk.'))
    } finally {
      setActionId(null)
    }
  }

  async function handleDropOff(child) {
    if (!activeSession?.id) {
      setError('No walk is in progress. Refresh the page and try again.')
      return
    }

    const dropOffId = child.id ?? `${child.userId}:${child.childId}`
    setError(null)
    setActionId(dropOffId)
    try {
      await markChildDroppedOff(activeSession.id, child.userId, child.childId, child.id)
    } catch (err) {
      setError(formatFirestoreError(err, 'Could not save drop-off. Please try again.'))
    } finally {
      setActionId(null)
    }
  }

  if (loading) {
    return (
      <div>
        <PageHeader title="Group Leader View" description="Manage your walking group" />
        <p className="text-sm text-gray-600">Loading group…</p>
      </div>
    )
  }

  if (!group || !isParticipant || !matchIsConnectedForUser(group, user?.uid)) {
    return (
      <div>
        <PageHeader title="Group Leader View" description="Manage your walking group" />
        <p className="text-sm text-gray-600">
          Group not found or you don&apos;t have access.{' '}
          <Link to="/groups" className="font-medium text-indigo-600 hover:text-indigo-700">
            Back to Groups
          </Link>
        </p>
      </div>
    )
  }

  const pickupLabel = isBuildingWalk
    ? group.buildingWalkType === 'morning_to_school'
      ? 'Picked up from home'
      : group.buildingWalkType === 'afternoon_from_school'
        ? 'Picked up from school'
        : 'Picked up from activity'
    : 'Picked up from school'

  const dropOffLabel = isBuildingWalk
    ? group.buildingWalkType === 'morning_to_school'
      ? 'Mark each child as dropped off at school.'
      : 'Mark each child as dropped off at home.'
    : 'Mark each child as dropped off at their activity.'

  return (
    <div>
      <PageHeader
        title="Group Leader View"
        description="Manage your walking group"
      />

      <div className="mb-6 rounded-lg border border-gray-200 bg-white p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="font-medium text-gray-900">{group.location}</p>
            <p className="mt-1 text-sm text-gray-600">
              {isBuildingWalk
                ? `${buildingWalkConfig?.route} · ${buildingWalkConfig?.scheduleLabel}`
                : `${group.day} · ${formatGroupTimes(group)}`}
            </p>
          </div>
          <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">
            {walkInProgress ? 'Walk in progress' : 'Ready to start'}
          </span>
        </div>

        {!walkInProgress && (
          <>
            <p className="mt-4 text-sm text-gray-600">
              {isBuildingWalk
                ? 'Children are automatically confirmed on weekdays. They show as absent only when a parent has marked them absent for today.'
                : 'Children are automatically confirmed on scheduled class days. They show as absent only when a parent has marked them absent for today.'}
            </p>
            <button
              type="button"
              onClick={handleStartWalk}
              disabled={actionId === 'start'}
              className="mt-4 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {actionId === 'start' ? 'Starting…' : 'Start walk'}
            </button>
          </>
        )}

        {walkInProgress && (
          <>
            <p className="mt-4 text-sm text-gray-600">
              {pickupLabel}: {formatHistoryTime(activeSession.startedAt)}
            </p>
            <p className="mt-2 text-sm text-gray-600">{dropOffLabel}</p>
          </>
        )}
      </div>

      {error && (
        <p className="mb-4 rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
      )}

      <h2 className="text-sm font-medium text-gray-900">Children</h2>
      <ul className="mt-3 divide-y divide-gray-200 rounded-lg border border-gray-200 bg-white">
        {children.map((child) => {
          const status = getChildWalkStatus(child)
          const dropOffId = child.id ?? `${child.userId}:${child.childId}`
          const canDropOff =
            walkInProgress &&
            child.walkStatus !== 'absent' &&
            child.walkStatus !== 'dropped_off'

          return (
            <li key={dropOffId} className="px-4 py-4 sm:px-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-3">
                    <p className="font-medium text-gray-900">{child.childFirstName}</p>
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${status.style}`}>
                      {status.label}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-gray-600">Parent: {child.parentName}</p>
                  <p className="text-sm text-gray-600">Phone: {child.contactPhone}</p>
                  {child.pickedUpAt && (
                    <p className="mt-2 text-sm text-gray-500">
                      Picked up: {formatHistoryTime(child.pickedUpAt)}
                    </p>
                  )}
                  {child.droppedOffAt && (
                    <p className="text-sm text-gray-500">
                      Dropped off: {formatHistoryTime(child.droppedOffAt)}
                    </p>
                  )}
                </div>

                {canDropOff && (
                  <button
                    type="button"
                    onClick={() => handleDropOff(child)}
                    disabled={actionId === dropOffId}
                    className="shrink-0 rounded-md border border-indigo-600 px-3 py-1.5 text-sm font-medium text-indigo-600 hover:bg-indigo-50 disabled:opacity-50"
                  >
                    {actionId === dropOffId ? 'Saving…' : 'Dropped off'}
                  </button>
                )}
              </div>
            </li>
          )
        })}
      </ul>

      <p className="mt-6">
        <Link to="/groups" className="text-sm font-medium text-indigo-600 hover:text-indigo-700">
          ← Back to Groups
        </Link>
      </p>
    </div>
  )
}
