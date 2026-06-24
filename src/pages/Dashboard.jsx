import { useEffect, useState } from 'react'
import PageHeader from '../components/PageHeader'
import { useAuth } from '../context/AuthContext'
import {
  formatConnectedTitle,
  formatMatchDetails,
  formatMatchTitle,
  getOtherChildFirstName,
  getOtherParty,
  getPartiesForUser as getMatchPartiesForUser,
  isActivityMatch,
  isSameFamilyMatch,
  matchIsConnectedForUser,
  matchIsDeclinedForUser,
  matchNeedsUserResponse,
  respondToMatch,
  subscribeToMatches,
  userHasAccepted,
} from '../firebase/matching'
import {
  countOtherJoiningFamilies,
  formatWalkGroupDetails,
  formatWalkGroupInvitation,
  getActiveParties,
  getPartiesForUser as getWalkGroupPartiesForUser,
  respondToWalkGroup,
  subscribeToWalkGroups,
  walkGroupIsActiveForUser,
  walkGroupIsDeclinedForUser,
  walkGroupNeedsUserResponse,
  walkGroupUserHasAccepted,
} from '../firebase/walkGroups'
import { getUserProfile } from '../firebase/users'

export default function Dashboard() {
  const { user } = useAuth()
  const [matches, setMatches] = useState([])
  const [walkGroups, setWalkGroups] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [respondingId, setRespondingId] = useState(null)

  useEffect(() => {
    if (!user) return undefined

    let matchesLoaded = false
    let groupsLoaded = false

    function checkLoaded() {
      if (matchesLoaded && groupsLoaded) setLoading(false)
    }

    const unsubMatches = subscribeToMatches(
      user.uid,
      (data) => {
        setMatches(data)
        matchesLoaded = true
        checkLoaded()
      },
      (err) => {
        setError(err.message)
        matchesLoaded = true
        checkLoaded()
      },
    )

    const unsubWalkGroups = subscribeToWalkGroups(
      user.uid,
      (data) => {
        setWalkGroups(data)
        groupsLoaded = true
        checkLoaded()
      },
      (err) => {
        setError(err.message)
        groupsLoaded = true
        checkLoaded()
      },
    )

    return () => {
      unsubMatches()
      unsubWalkGroups()
    }
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

  const pendingMatches = matches.filter(
    (match) => isActivityMatch(match) && matchNeedsUserResponse(match, user.uid),
  )

  const waitingMatches = matches.filter(
    (match) =>
      isActivityMatch(match) &&
      !matchIsDeclinedForUser(match, user.uid) &&
      match.status === 'pending' &&
      !isSameFamilyMatch(match) &&
      userHasAccepted(match, user.uid) &&
      getOtherParty(match, user.uid)?.response === 'pending',
  )

  const connectedMatches = matches.filter(
    (match) => isActivityMatch(match) && matchIsConnectedForUser(match, user.uid),
  )

  const declinedMatches = matches.filter(
    (match) => isActivityMatch(match) && matchIsDeclinedForUser(match, user.uid),
  )

  async function handleWalkGroupResponse(groupId, response) {
    setError(null)
    setRespondingId(`walkGroup:${groupId}`)
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

  async function handleMatchResponse(matchId, response) {
    setError(null)
    setRespondingId(`match:${matchId}`)
    try {
      const profile = await getUserProfile(user.uid)
      const parentName = profile?.displayName || user.displayName || 'Parent'
      const contactPhone =
        profile?.phoneNumber || user.phoneNumber || user.email || 'Not provided'

      await respondToMatch(matchId, user.uid, response, contactPhone, parentName)
    } catch (err) {
      setError(err.message)
    } finally {
      setRespondingId(null)
    }
  }

  const hasWalkGroupActivity =
    pendingWalkGroups.length > 0 ||
    waitingWalkGroups.length > 0 ||
    activeWalkGroups.length > 0 ||
    declinedWalkGroups.length > 0

  const hasPairMatchActivity =
    pendingMatches.length > 0 ||
    waitingMatches.length > 0 ||
    connectedMatches.length > 0 ||
    declinedMatches.length > 0

  const hasAnyActivity = hasWalkGroupActivity || hasPairMatchActivity

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
        <p className="mt-1 text-sm text-gray-500">
          Groups at your activity location within the same 75-minute window.
        </p>

        {loading ? (
          <p className="mt-4 text-sm text-gray-600">Loading groups…</p>
        ) : !hasWalkGroupActivity ? (
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
                  {getWalkGroupPartiesForUser(group, user.uid)
                    .map((party) => party.childFirstName)
                    .join(', ')}
                </p>
                <div className="mt-4 flex gap-3">
                  <button
                    type="button"
                    onClick={() => handleWalkGroupResponse(group.id, 'accepted')}
                    disabled={respondingId === `walkGroup:${group.id}`}
                    className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                  >
                    Join group
                  </button>
                  <button
                    type="button"
                    onClick={() => handleWalkGroupResponse(group.id, 'declined')}
                    disabled={respondingId === `walkGroup:${group.id}`}
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
                  {getWalkGroupPartiesForUser(group, user.uid)
                    .map((party) => party.childFirstName)
                    .join(', ')}
                  .
                </p>
              </div>
            ))}

            {activeWalkGroups.map((group) => {
              const myParties = getWalkGroupPartiesForUser(group, user.uid)
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

      <section className="mt-10">
        <h2 className="text-sm font-medium text-gray-900">Pair matches (legacy)</h2>
        <p className="mt-1 text-sm text-gray-500">
          Older two-family matches are still shown here while the new group system rolls out.
        </p>

        {loading ? (
          <p className="mt-4 text-sm text-gray-600">Loading matches…</p>
        ) : !hasPairMatchActivity ? (
          <p className="mt-4 rounded-lg border border-dashed border-gray-300 bg-white px-4 py-8 text-center text-sm text-gray-600">
            No pair matches.
          </p>
        ) : (
          <div className="mt-4 space-y-4">
            {pendingMatches.map((match) => {
              const otherParty = getOtherParty(match, user.uid)

              return (
                <div
                  key={match.id}
                  className="rounded-lg border border-indigo-200 bg-indigo-50 p-5"
                >
                  <p className="font-medium text-gray-900">{formatMatchTitle(match, user.uid)}</p>
                  <p className="mt-2 text-sm text-gray-600">{formatMatchDetails(match)}</p>
                  {otherParty && !isSameFamilyMatch(match) && (
                    <p className="mt-1 text-sm text-gray-600">
                      Matched with {otherParty.childFirstName}&apos;s family
                    </p>
                  )}
                  <div className="mt-4 flex gap-3">
                    <button
                      type="button"
                      onClick={() => handleMatchResponse(match.id, 'accepted')}
                      disabled={respondingId === `match:${match.id}`}
                      className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                    >
                      Accept
                    </button>
                    <button
                      type="button"
                      onClick={() => handleMatchResponse(match.id, 'declined')}
                      disabled={respondingId === `match:${match.id}`}
                      className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                    >
                      Decline
                    </button>
                  </div>
                </div>
              )
            })}

            {waitingMatches.map((match) => {
              const myParties = getMatchPartiesForUser(match, user.uid)
              const otherParty = getOtherParty(match, user.uid)

              return (
                <div
                  key={match.id}
                  className="rounded-lg border border-gray-200 bg-white p-5"
                >
                  <p className="font-medium text-gray-900">
                    Waiting for {otherParty?.childFirstName}&apos;s family to respond
                  </p>
                  <p className="mt-2 text-sm text-gray-600">{formatMatchDetails(match)}</p>
                  <p className="mt-1 text-sm text-gray-500">
                    You accepted the match for {myParties[0]?.childFirstName}.
                  </p>
                </div>
              )
            })}

            {connectedMatches.map((match) => {
              const myParties = getMatchPartiesForUser(match, user.uid)
              const otherParty = getOtherParty(match, user.uid)
              const sameFamily = isSameFamilyMatch(match)

              return (
                <div
                  key={match.id}
                  className="rounded-lg border border-green-200 bg-green-50 p-5"
                >
                  <p className="font-medium text-gray-900">
                    {formatConnectedTitle(match, user.uid)}
                  </p>
                  <p className="mt-2 text-sm text-gray-600">{formatMatchDetails(match)}</p>
                  {!sameFamily && (
                    <>
                      <p className="mt-3 text-sm text-gray-700">
                        <span className="font-medium">Contact:</span>{' '}
                        {otherParty?.contactPhone || 'Not provided'}
                      </p>
                      <p className="mt-1 text-xs text-gray-500">
                        Your contact shared: {myParties[0]?.contactPhone || 'Not provided'}
                      </p>
                    </>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </section>

      {!loading && declinedWalkGroups.length > 0 && (
        <section className="mt-10">
          <h2 className="text-sm font-medium text-gray-900">Declined walk groups</h2>
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
                  disabled={respondingId === `walkGroup:${group.id}`}
                  className="mt-4 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                >
                  {respondingId === `walkGroup:${group.id}` ? 'Joining…' : 'Join group'}
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {!loading && declinedMatches.length > 0 && (
        <section className="mt-10">
          <h2 className="text-sm font-medium text-gray-900">Declined pair matches</h2>
          <p className="mt-1 text-sm text-gray-500">
            Matches you declined or left. You can join again anytime.
          </p>
          <div className="mt-4 space-y-4">
            {declinedMatches.map((match) => {
              const otherChild = getOtherChildFirstName(match, user.uid)

              return (
                <div
                  key={match.id}
                  className="rounded-lg border border-gray-200 bg-white p-5"
                >
                  {otherChild && !isSameFamilyMatch(match) && (
                    <p className="font-medium text-gray-900">Matched with {otherChild}</p>
                  )}
                  {isSameFamilyMatch(match) && (
                    <p className="font-medium text-gray-900">
                      {getMatchPartiesForUser(match, user.uid)
                        .map((party) => party.childFirstName)
                        .join(' and ')}
                    </p>
                  )}
                  <p className="mt-2 text-sm text-gray-600">{formatMatchDetails(match)}</p>
                  <button
                    type="button"
                    onClick={() => handleMatchResponse(match.id, 'accepted')}
                    disabled={respondingId === `match:${match.id}`}
                    className="mt-4 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                  >
                    {respondingId === `match:${match.id}` ? 'Joining…' : 'Join group'}
                  </button>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {!loading && !hasAnyActivity && (
        <p className="mt-6 text-center text-sm text-gray-500">
          Add an activity on My Activities to get started.
        </p>
      )}
    </div>
  )
}
