import { useEffect, useState } from 'react'
import PageHeader from '../components/PageHeader'
import { useAuth } from '../context/AuthContext'
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
} from '../firebase/walkGroups'
import { getUserProfile } from '../firebase/users'
import { syncWalkGroupsForUser } from '../firebase/activities'

export default function Dashboard() {
  const { user } = useAuth()
  const [walkGroups, setWalkGroups] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [respondingId, setRespondingId] = useState(null)

  useEffect(() => {
    if (!user) return undefined

    syncWalkGroupsForUser(user.uid).catch((err) => {
      console.error('[Dashboard] syncWalkGroupsForUser failed', err)
    })

    const unsubscribe = subscribeToWalkGroups(
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

    return unsubscribe
  }, [user])

  const pendingWalkGroups = walkGroups.filter(
    (group) => walkGroupNeedsUserResponse(group, user?.uid),
  )

  const waitingWalkGroups = walkGroups.filter(
    (group) =>
      !walkGroupIsDeclinedForUser(group, user?.uid) &&
      group.status === 'open' &&
      walkGroupUserHasAccepted(group, user?.uid) &&
      countOtherJoiningFamilies(group, user?.uid) > 0,
  )

  const activeWalkGroups = walkGroups.filter(
    (group) => walkGroupIsActiveForUser(group, user?.uid),
  )

  const declinedWalkGroups = walkGroups.filter(
    (group) => walkGroupIsDeclinedForUser(group, user?.uid),
  )

  useEffect(() => {
    if (loading || !user) return
    console.log('[Dashboard] walkGroups filter results', {
      uid: user.uid,
      totalFromQuery: walkGroups.length,
      pending: pendingWalkGroups.length,
      waiting: waitingWalkGroups.length,
      active: activeWalkGroups.length,
      declined: declinedWalkGroups.length,
    })
  }, [loading, user, walkGroups, pendingWalkGroups, waitingWalkGroups, activeWalkGroups, declinedWalkGroups])

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
        description="Overview of today's walks and group status"
      />

      {error && (
        <p className="mb-4 rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
      )}

      <section>
        <h2 className="text-sm font-medium text-gray-900">Walk groups</h2>

        {loading ? (
          <p className="mt-4 text-sm text-gray-600">Loading groups…</p>
        ) : !hasActivity ? (
          <p className="mt-4 rounded-lg border border-dashed border-gray-300 bg-white px-4 py-8 text-center text-sm text-gray-600">
            No walk groups yet. Add an activity on My Activities to find families
            with the same schedule.
          </p>
        ) : (
          <div className="mt-4 space-y-4">
            {pendingWalkGroups.map((group) => (
              <div
                key={group.id}
                className="rounded-lg border border-indigo-200 bg-indigo-50 p-5"
              >
                <p className="font-medium text-gray-900">
                  {formatWalkGroupInvitation(group, user.uid)}
                </p>
                <p className="mt-2 text-sm text-gray-600">{formatWalkGroupDetails(group)}</p>
                <p className="mt-1 text-sm text-gray-600">
                  Your children:{' '}
                  {getPartiesForUser(group, user.uid)
                    .map((party) => party.childFirstName)
                    .join(', ')}
                </p>
                <div className="mt-4 flex gap-3">
                  <button
                    type="button"
                    onClick={() => handleWalkGroupResponse(group.id, 'accepted')}
                    disabled={respondingId === group.id}
                    className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                  >
                    Join group
                  </button>
                  <button
                    type="button"
                    onClick={() => handleWalkGroupResponse(group.id, 'declined')}
                    disabled={respondingId === group.id}
                    className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                  >
                    Decline
                  </button>
                </div>
              </div>
            ))}

            {waitingWalkGroups.map((group) => (
              <div
                key={group.id}
                className="rounded-lg border border-gray-200 bg-white p-5"
              >
                <p className="font-medium text-gray-900">
                  Waiting for {countOtherJoiningFamilies(group, user.uid)} other{' '}
                  {countOtherJoiningFamilies(group, user.uid) === 1 ? 'family' : 'families'} to
                  respond
                </p>
                <p className="mt-2 text-sm text-gray-600">{formatWalkGroupDetails(group)}</p>
                <p className="mt-1 text-sm text-gray-500">
                  You joined this group for{' '}
                  {getPartiesForUser(group, user.uid)
                    .map((party) => party.childFirstName)
                    .join(', ')}
                  .
                </p>
              </div>
            ))}

            {activeWalkGroups.map((group) => {
              const myParties = getPartiesForUser(group, user.uid)
              const otherParties = getActiveParties(group).filter(
                (party) => party.userId !== user.uid,
              )

              return (
                <div
                  key={group.id}
                  className="rounded-lg border border-green-200 bg-green-50 p-5"
                >
                  <p className="font-medium text-gray-900">
                    Active walk group at {group.location}
                  </p>
                  <p className="mt-2 text-sm text-gray-600">{formatWalkGroupDetails(group)}</p>
                  <p className="mt-2 text-sm text-gray-700">
                    Children: {getActiveParties(group).map((party) => party.childFirstName).join(', ')}
                  </p>
                  {otherParties.length > 0 && (
                    <div className="mt-3 space-y-1 text-sm text-gray-700">
                      {otherParties.map((party) => (
                        <p key={`${party.userId}_${party.childId}`}>
                          <span className="font-medium">{party.childFirstName}</span>
                          {' — '}
                          {party.parentName || 'Parent'} · {party.contactPhone || 'Not provided'}
                        </p>
                      ))}
                    </div>
                  )}
                  <p className="mt-2 text-xs text-gray-500">
                    Your contact shared: {myParties[0]?.contactPhone || 'Not provided'}
                  </p>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {!loading && declinedWalkGroups.length > 0 && (
        <section className="mt-10">
          <h2 className="text-sm font-medium text-gray-900">Declined groups</h2>
          <p className="mt-1 text-sm text-gray-500">
            Groups you left. The group continues for other families.
          </p>
          <div className="mt-4 space-y-4">
            {declinedWalkGroups.map((group) => (
              <div
                key={group.id}
                className="rounded-lg border border-gray-200 bg-white p-5"
              >
                <p className="font-medium text-gray-900">{formatWalkGroupDetails(group)}</p>
                <p className="mt-2 text-sm text-gray-600">
                  You declined this group. The group continues for other families.
                </p>
                <button
                  type="button"
                  onClick={() => handleWalkGroupResponse(group.id, 'accepted')}
                  disabled={respondingId === group.id}
                  className="mt-4 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
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
