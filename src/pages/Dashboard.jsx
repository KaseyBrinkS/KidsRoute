import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import DaySelector, { todayWeekday } from '../components/DaySelector'
import PageHeader from '../components/PageHeader'
import { useAuth } from '../context/AuthContext'
import { getGroupWalkStatus } from '../firebase/groups'
import {
  countOtherJoiningFamilies,
  formatWalkGroupDetails,
  formatWalkGroupInvitation,
  getActiveParties,
  getPartiesForUser,
  respondToWalkGroup,
  subscribeToWalkGroups,
  walkGroupIsActiveForUser,
  walkGroupIsDeclinedForUser,
  walkGroupNeedsUserResponse,
  walkGroupUserHasAccepted,
  walkGroupHasMultipleFamilies,
} from '../firebase/walkGroups'
import { subscribeToUserActiveWalkSessions } from '../firebase/groupWalk'
import { getUserProfile } from '../firebase/users'
import { syncWalkGroupsForUser } from '../firebase/activities'
import {
  walkStatusBadgeClass,
  walkStatusCardClass,
  walkStatusLabel,
} from '../utils/walkStatus'

function groupCardStatus(group, activeSessions) {
  if (activeSessions[group.id]) return 'in progress'
  if (group.status === 'completed') return 'completed'
  return getGroupWalkStatus(group)
}

export default function Dashboard() {
  const { user } = useAuth()
  const [walkGroups, setWalkGroups] = useState([])
  const [activeSessions, setActiveSessions] = useState({})
  const [selectedDay, setSelectedDay] = useState(todayWeekday())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [respondingId, setRespondingId] = useState(null)

  useEffect(() => {
    if (!user) return undefined

    syncWalkGroupsForUser(user.uid).catch((err) => {
      console.error('[Dashboard] syncWalkGroupsForUser failed', err)
    })

    const unsubGroups = subscribeToWalkGroups(
      user.uid,
      (data) => {
        setWalkGroups(data)
        setLoading(false)
      },
      (err) => {
        setError(err.message)
        setLoading(false)
      },
    )

    const unsubSessions = subscribeToUserActiveWalkSessions(
      user.uid,
      setActiveSessions,
      (err) => setError(err.message),
    )

    return () => {
      unsubGroups()
      unsubSessions()
    }
  }, [user])

  const dashboardWalkGroups = useMemo(
    () => walkGroups.filter(walkGroupHasMultipleFamilies),
    [walkGroups],
  )

  const dayGroups = useMemo(
    () => dashboardWalkGroups.filter((group) => group.day === selectedDay),
    [dashboardWalkGroups, selectedDay],
  )

  const pendingWalkGroups = useMemo(
    () => dayGroups.filter((group) => walkGroupNeedsUserResponse(group, user?.uid)),
    [dayGroups, user?.uid],
  )

  const waitingWalkGroups = useMemo(
    () =>
      dayGroups.filter(
        (group) =>
          !walkGroupIsDeclinedForUser(group, user?.uid) &&
          group.status === 'open' &&
          walkGroupUserHasAccepted(group, user?.uid) &&
          countOtherJoiningFamilies(group, user?.uid) > 0,
      ),
    [dayGroups, user?.uid],
  )

  const activeWalkGroups = useMemo(
    () => dayGroups.filter((group) => walkGroupIsActiveForUser(group, user?.uid)),
    [dayGroups, user?.uid],
  )

  const declinedWalkGroups = useMemo(
    () => dayGroups.filter((group) => walkGroupIsDeclinedForUser(group, user?.uid)),
    [dayGroups, user?.uid],
  )

  const hasActivity =
    pendingWalkGroups.length > 0 ||
    waitingWalkGroups.length > 0 ||
    activeWalkGroups.length > 0 ||
    declinedWalkGroups.length > 0

  async function handleWalkGroupResponse(groupId, response) {
    setError(null)
    setRespondingId(groupId)
    try {
      const profile = await getUserProfile(user.uid)
      const parentName = profile?.displayName || user.displayName || 'Parent'
      const contactPhone =
        profile?.phoneNumber || user.phoneNumber || user.email || 'Not provided'

      await respondToWalkGroup(groupId, user.uid, response, contactPhone, parentName)
    } catch (err) {
      setError(err.message)
    } finally {
      setRespondingId(null)
    }
  }

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Overview of your walk groups by day"
      />

      {error && <p className="alert-error">{error}</p>}

      <DaySelector
        selectedDay={selectedDay}
        onSelectDay={setSelectedDay}
        className="mb-8"
      />

      <section>
        <h2 className="kr-section-title">{selectedDay} walk groups</h2>

        {loading ? (
          <p className="mt-4 text-muted">Loading groups…</p>
        ) : !hasActivity ? (
          <p className="kr-card-flat mt-4">
            No walk groups for {selectedDay}. Add an activity on My Activities to find
            families with the same schedule.
          </p>
        ) : (
          <div className="mt-4 space-y-4">
            {pendingWalkGroups.map((group) => (
              <div key={group.id} className="kr-card-invite p-6">
                <p className="text-lg font-semibold text-[var(--color-text)]">
                  {formatWalkGroupInvitation(group, user.uid)}
                </p>
                <p className="mt-2 text-sm text-muted">{formatWalkGroupDetails(group)}</p>
                <p className="mt-1 text-sm text-muted">
                  Your children:{' '}
                  {getPartiesForUser(group, user.uid)
                    .map((party) => party.childFirstName)
                    .join(', ')}
                </p>
                <div className="mt-4 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => handleWalkGroupResponse(group.id, 'accepted')}
                    disabled={respondingId === group.id}
                    className="btn-primary"
                  >
                    Join group
                  </button>
                  <button
                    type="button"
                    onClick={() => handleWalkGroupResponse(group.id, 'declined')}
                    disabled={respondingId === group.id}
                    className="btn-secondary"
                  >
                    Decline
                  </button>
                </div>
              </div>
            ))}

            {waitingWalkGroups.map((group) => (
              <div key={group.id} className={`p-6 ${walkStatusCardClass('upcoming')}`}>
                <span className={walkStatusBadgeClass('upcoming')}>Before pickup</span>
                <p className="mt-3 font-semibold text-[var(--color-text)]">
                  Waiting for {countOtherJoiningFamilies(group, user.uid)} other{' '}
                  {countOtherJoiningFamilies(group, user.uid) === 1 ? 'family' : 'families'} to
                  respond
                </p>
                <p className="mt-2 text-sm text-muted">{formatWalkGroupDetails(group)}</p>
                <p className="mt-1 text-sm text-muted">
                  You joined for{' '}
                  {getPartiesForUser(group, user.uid)
                    .map((party) => party.childFirstName)
                    .join(', ')}
                  .
                </p>
              </div>
            ))}

            {activeWalkGroups.map((group) => {
              const status = groupCardStatus(group, activeSessions)
              const myParties = getPartiesForUser(group, user.uid)
              const otherParties = getActiveParties(group).filter(
                (party) => party.userId !== user.uid,
              )

              return (
                <div key={group.id} className={`p-6 ${walkStatusCardClass(status)}`}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <p className="text-lg font-semibold text-[var(--color-text)]">
                      {group.location}
                    </p>
                    <span className={walkStatusBadgeClass(status)}>
                      {walkStatusLabel(status)}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-muted">{formatWalkGroupDetails(group)}</p>
                  <p className="mt-2 text-sm text-[var(--color-text)]">
                    Children:{' '}
                    {getActiveParties(group).map((party) => party.childFirstName).join(', ')}
                  </p>
                  {otherParties.length > 0 && (
                    <div className="mt-3 space-y-1 text-sm text-[var(--color-text)]">
                      {otherParties.map((party) => (
                        <p key={`${party.userId}_${party.childId}`}>
                          <span className="font-medium">{party.childFirstName}</span>
                          {' — '}
                          {party.parentName || 'Parent'} · {party.contactPhone || 'Not provided'}
                        </p>
                      ))}
                    </div>
                  )}
                  <p className="mt-2 text-xs text-muted">
                    Your contact: {myParties[0]?.contactPhone || 'Not provided'}
                  </p>
                  {status === 'in progress' && (
                    <Link to={`/groups/${group.id}/leader`} className="btn-leader">
                      Group Leader View
                    </Link>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </section>

      {!loading && declinedWalkGroups.length > 0 && (
        <section className="mt-10">
          <h2 className="kr-section-title">Declined groups</h2>
          <p className="kr-section-desc">
            Groups you left. The group continues for other families.
          </p>
          <div className="mt-4 space-y-4">
            {declinedWalkGroups.map((group) => (
              <div key={group.id} className="kr-card p-6">
                <p className="font-semibold text-[var(--color-text)]">
                  {formatWalkGroupDetails(group)}
                </p>
                <p className="mt-2 text-sm text-muted">
                  You declined this group. You can rejoin anytime.
                </p>
                <button
                  type="button"
                  onClick={() => handleWalkGroupResponse(group.id, 'accepted')}
                  disabled={respondingId === group.id}
                  className="btn-primary mt-4"
                >
                  {respondingId === group.id ? 'Joining…' : 'Join group'}
                </button>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
