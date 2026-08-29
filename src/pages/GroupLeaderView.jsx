import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import PageHeader from '../components/PageHeader'
import { useAuth } from '../context/AuthContext'
import { formatGroupTimes } from '../firebase/groups'
import { BUILDING_WALK_TYPES, isBuildingWalkMatch } from '../firebase/buildingWalks'
import { matchIsConnectedForUser } from '../firebase/matching'
import {
  getGroupWalkParties,
  subscribeToGroupDocument,
  subscribeToGroupAbsences,
} from '../firebase/groupWalk'
import { isWalkGroupDocument, resolveWalkGroupParticipantIds, walkGroupUserHasAccepted } from '../firebase/walkGroups'
import { isUserActiveLeader } from '../firebase/groupLeaders'
import { formatSharedContactPhone } from '../utils/contactInfo'
import GroupPhoneSharingToggle from '../components/GroupPhoneSharingToggle'
import ConfirmedMeetingPoint from '../components/ConfirmedMeetingPoint'
import GroupNote from '../components/GroupNote'
import GroupLeaderControls from '../components/GroupLeaderControls'
import ReportConcernForm from '../components/ReportConcernForm'
import {
  getUpcomingScheduleEntries,
  recordRatioAlertMessage,
  subscribeToLeaderVolunteers,
  syncRatioAlert,
} from '../firebase/leaderVolunteers'
import { formatDisplayDate, todayKey } from '../firebase/sessions'

export default function GroupLeaderView() {
  const { groupId } = useParams()
  const { user } = useAuth()
  const [group, setGroup] = useState(null)
  const [absences, setAbsences] = useState([])
  const [groupLoaded, setGroupLoaded] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [volunteers, setVolunteers] = useState([])

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
    if (!groupLoaded || !group) return undefined
    if (window.location.hash !== '#group-leaders') return undefined

    const frameId = requestAnimationFrame(() => {
      document.getElementById('group-leaders')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })

    return () => cancelAnimationFrame(frameId)
  }, [groupLoaded, group])

  useEffect(() => {
    if (!user || !groupId) return undefined

    const unsubAbsences = subscribeToGroupAbsences(
      groupId,
      user.uid,
      setAbsences,
      (err) => setError(err.message),
      { leaderAccess: true },
    )

    return () => unsubAbsences()
  }, [user, groupId])

  useEffect(() => {
    if (!groupId) return undefined
    return subscribeToLeaderVolunteers(groupId, setVolunteers, (err) => setError(err.message))
  }, [groupId])

  const ratioWarnings = useMemo(() => {
    if (!group) return []
    return getUpcomingScheduleEntries(group, volunteers, absences)
      .filter((entry) => entry.hasWalk && !entry.sufficient)
  }, [group, volunteers, absences])

  useEffect(() => {
    if (!groupId || !group) return undefined

    let cancelled = false

    async function syncAlerts() {
      const entries = getUpcomingScheduleEntries(group, volunteers, absences)
      await Promise.all(
        entries.map(async (entry) => {
          if (cancelled) return
          const needsAlert = entry.hasWalk && !entry.sufficient
          await syncRatioAlert(groupId, entry.dateKey, needsAlert, recordRatioAlertMessage.bind(null, groupId))
        }),
      )
    }

    syncAlerts().catch((err) => {
      console.warn('[GroupLeaderView] ratio alert sync failed', err)
    })

    return () => {
      cancelled = true
    }
  }, [groupId, group, volunteers, absences])

  const isBuildingWalk = isBuildingWalkMatch(group)
  const isWalkGroup = isWalkGroupDocument(group)
  const isParticipant =
    resolveWalkGroupParticipantIds(group ?? {}).includes(user?.uid)
    || group?.parties?.some((party) => party.userId === user?.uid)
  const canManageWalk = isUserActiveLeader(group, user?.uid)

  const preWalkParties = useMemo(
    () =>
      getGroupWalkParties(group ?? {}).map((party) => ({
        ...party,
        parentName: party.parentName || 'Parent',
        contactPhone: formatSharedContactPhone(party.contactPhone),
      })),
    [group],
  )

  const reportParticipants = useMemo(() => {
    const seen = new Set()
    return preWalkParties.filter((party) => {
      if (!party.userId || seen.has(party.userId)) return false
      seen.add(party.userId)
      return true
    })
  }, [preWalkParties])

  const buildingWalkConfig = isBuildingWalk ? BUILDING_WALK_TYPES[group.buildingWalkType] : null
  const editorName =
    preWalkParties.find((party) => party.userId === user?.uid)?.parentName || 'A parent'

  if (loading) {
    return (
      <div>
        <PageHeader title="Manage Group" description="Manage your walking group" />
        <p className="text-muted">Loading group…</p>
      </div>
    )
  }

  const hasAccess = group && (canManageWalk || isParticipant)

  if (!hasAccess) {
    return (
      <div>
        <PageHeader title="Manage Group" description="Manage your walking group" />
        <p className="text-muted">
          Group not found or you don&apos;t have access.{' '}
          <Link to="/groups" className="link-accent">
            Back to Groups
          </Link>
        </p>
      </div>
    )
  }

  const showPhoneSharingToggle =
    user
    && isParticipant
    && (isWalkGroup
      ? walkGroupUserHasAccepted(group, user.uid)
      : matchIsConnectedForUser(group, user.uid))

  return (
    <div>
      <PageHeader title="Manage Group" description="Manage your walking group" />

      <div className="kr-card mb-6 p-6">
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
        {(canManageWalk || isParticipant) && (
          <Link to={`/groups/${groupId}/walk`} className="btn-primary mt-4 inline-flex">
            Manage Walk →
          </Link>
        )}
      </div>

      {error && <p className="alert-error mb-4">{error}</p>}

      {ratioWarnings.length > 0 && (
        <div className="mb-4 space-y-3">
          {ratioWarnings.slice(0, 3).map((entry) => (
            <div
              key={entry.dateKey}
              className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
            >
              Heads up — {entry.kidCount} kid{entry.kidCount === 1 ? '' : 's'} are signed up for{' '}
              {entry.dateKey === todayKey() ? 'today' : formatDisplayDate(entry.dateKey)} but only{' '}
              {entry.leaderCount} adult{entry.leaderCount === 1 ? '' : 's'} have volunteered. Consider adding more leaders or
              coordinating in the group chat.
            </div>
          ))}
        </div>
      )}

      {isWalkGroup && (
        <div className="mb-6 space-y-4">
          <GroupNote group={group} userId={user.uid} editorName={editorName} />
          <ConfirmedMeetingPoint group={group} />
        </div>
      )}

      {isWalkGroup && user && (
        <div id="group-leaders" className="mb-6 scroll-mt-24">
          <GroupLeaderControls group={group} userId={user.uid} absences={absences} />
        </div>
      )}

      {showPhoneSharingToggle && (
        <GroupPhoneSharingToggle group={group} groupId={groupId} userId={user.uid} />
      )}

      <p className="mt-6 flex flex-wrap gap-4">
        <Link to="/leader" className="link-accent text-sm">
          ← My Groups
        </Link>
        <Link to="/groups" className="link-accent text-sm">
          Back to Groups
        </Link>
      </p>

      {user && (
        <ReportConcernForm
          groupId={groupId}
          reporterUid={user.uid}
          reporterName={editorName}
          groupName={group?.location || ''}
          participants={reportParticipants}
        />
      )}
    </div>
  )
}
