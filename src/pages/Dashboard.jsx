import { useEffect, useState } from 'react'
import PageHeader from '../components/PageHeader'
import { useAuth } from '../context/AuthContext'
import {
  formatConnectedTitle,
  formatMatchDetails,
  formatMatchTitle,
  getOtherChildFirstName,
  getOtherParty,
  getPartiesForUser,
  isSameFamilyMatch,
  matchIsConnectedForUser,
  matchIsDeclinedForUser,
  matchNeedsUserResponse,
  respondToMatch,
  subscribeToMatches,
  userHasAccepted,
} from '../firebase/matching'
import { getUserProfile } from '../firebase/users'

export default function Dashboard() {
  const { user } = useAuth()
  const [matches, setMatches] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [respondingId, setRespondingId] = useState(null)

  useEffect(() => {
    if (!user) return

    const unsubscribe = subscribeToMatches(
      user.uid,
      (data) => {
        setMatches(data)
        setLoading(false)
      },
      (err) => {
        setError(err.message)
        setLoading(false)
      },
    )

    return unsubscribe
  }, [user])

  const pendingMatches = matches.filter((match) => matchNeedsUserResponse(match, user.uid))

  const waitingMatches = matches.filter(
    (match) =>
      !matchIsDeclinedForUser(match, user.uid) &&
      match.status === 'pending' &&
      !isSameFamilyMatch(match) &&
      userHasAccepted(match, user.uid) &&
      getOtherParty(match, user.uid)?.response === 'pending',
  )

  const connectedMatches = matches.filter((match) => matchIsConnectedForUser(match, user.uid))

  const declinedMatches = matches.filter((match) => matchIsDeclinedForUser(match, user.uid))

  async function handleResponse(matchId, response) {
    setError(null)
    setRespondingId(matchId)
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

  const hasActiveMatches =
    pendingMatches.length > 0 ||
    waitingMatches.length > 0 ||
    connectedMatches.length > 0 ||
    declinedMatches.length > 0

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
        <h2 className="text-sm font-medium text-gray-900">Group matches</h2>

        {loading ? (
          <p className="mt-4 text-sm text-gray-600">Loading matches…</p>
        ) : !hasActiveMatches ? (
          <p className="mt-4 rounded-lg border border-dashed border-gray-300 bg-white px-4 py-8 text-center text-sm text-gray-600">
            No group matches yet. Add an activity on My Activities to find kids
            with the same schedule.
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
                      onClick={() => handleResponse(match.id, 'accepted')}
                      disabled={respondingId === match.id}
                      className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                    >
                      Accept
                    </button>
                    <button
                      type="button"
                      onClick={() => handleResponse(match.id, 'declined')}
                      disabled={respondingId === match.id}
                      className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                    >
                      Decline
                    </button>
                  </div>
                </div>
              )
            })}

            {waitingMatches.map((match) => {
              const myParties = getPartiesForUser(match, user.uid)
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
              const myParties = getPartiesForUser(match, user.uid)
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

      {!loading && declinedMatches.length > 0 && (
        <section className="mt-10">
          <h2 className="text-sm font-medium text-gray-900">Declined matches</h2>
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
                      {getPartiesForUser(match, user.uid)
                        .map((party) => party.childFirstName)
                        .join(' and ')}
                    </p>
                  )}
                  <p className="mt-2 text-sm text-gray-600">{formatMatchDetails(match)}</p>
                  <button
                    type="button"
                    onClick={() => handleResponse(match.id, 'accepted')}
                    disabled={respondingId === match.id}
                    className="mt-4 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                  >
                    {respondingId === match.id ? 'Joining…' : 'Join group'}
                  </button>
                </div>
              )
            })}
          </div>
        </section>
      )}
    </div>
  )
}
