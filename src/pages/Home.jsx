import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import HomeNotificationAlerts from '../components/HomeNotificationAlerts'
import PageHeader from '../components/PageHeader'
import { useAuth } from '../context/AuthContext'
import { partitionHomeData } from '../firebase/appModel'
import { syncWalkGroupsForUser } from '../firebase/activities'
import { subscribeToUserActiveWalkSessions } from '../firebase/groupWalk'
import {
  respondToWalkGroup,
  subscribeToWalkGroups,
  walkGroupHasMultipleFamilies,
} from '../firebase/walkGroups'
import { subscribeToUserProfile } from '../firebase/users'
import { resolveContactPhoneForSharing } from '../utils/contactInfo'

function safeFilterWalkGroups(groups) {
  if (!Array.isArray(groups)) return []
  return groups.filter((group) => {
    if (!group?.id) return false
    try {
      return walkGroupHasMultipleFamilies(group)
    } catch (err) {
      console.error('[Home] skipping invalid walk group', group?.id, err)
      return false
    }
  })
}

function safePartitionHomeData(walkGroups, userId, activeSessions) {
  try {
    return partitionHomeData(walkGroups, userId, activeSessions)
  } catch (err) {
    console.error('[Home] partitionHomeData failed', err)
    return { todayTrips: [], uncoveredTrips: [], pendingRequests: [] }
  }
}

function TripCard({ trip, action }) {
  return (
    <div className="kr-card px-4 py-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="font-semibold text-[var(--color-text)]">{trip.childName}</p>
          <p className="text-sm text-muted">{trip.destination}</p>
          <p className="mt-1 text-sm text-muted">
            {trip.time} · Guide: {trip.guideName}
          </p>
          <span className="mt-2 inline-block rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
            {trip.statusLabel}
          </span>
        </div>
        {action}
      </div>
    </div>
  )
}

function Section({ title, description, empty, children }) {
  return (
    <section className="space-y-3">
      <div>
        <h2 className="kr-section-title">{title}</h2>
        {description ? <p className="kr-section-desc">{description}</p> : null}
      </div>
      {empty ? <p className="text-sm text-muted">{empty}</p> : children}
    </section>
  )
}

export default function Home() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [walkGroups, setWalkGroups] = useState([])
  const [activeSessions, setActiveSessions] = useState({})
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [respondingId, setRespondingId] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!user) {
      setLoading(false)
      return undefined
    }

    setLoading(true)
    setError(null)

    syncWalkGroupsForUser(user.uid).catch((err) => {
      console.error('[Home] syncWalkGroupsForUser failed', err)
    })

    const unsubGroups = subscribeToWalkGroups(
      user.uid,
      (data) => {
        setWalkGroups(safeFilterWalkGroups(data))
        setLoading(false)
      },
      (err) => {
        console.error('[Home] subscribeToWalkGroups failed', err)
        setError(err.message ?? 'Could not load your trips.')
        setLoading(false)
      },
    )

    const unsubSessions = subscribeToUserActiveWalkSessions(
      user.uid,
      setActiveSessions,
      (err) => console.error('[Home] subscribeToUserActiveWalkSessions failed', err),
    )

    const unsubProfile = subscribeToUserProfile(
      user.uid,
      setProfile,
      (err) => console.error('[Home] subscribeToUserProfile failed', err),
    )

    return () => {
      unsubGroups()
      unsubSessions()
      unsubProfile()
    }
  }, [user])

  const { todayTrips, uncoveredTrips, pendingRequests } = useMemo(
    () => safePartitionHomeData(walkGroups, user?.uid, activeSessions),
    [walkGroups, user?.uid, activeSessions],
  )

  async function handleRespond(groupId, response) {
    if (!user || !profile) return
    setError(null)
    setRespondingId(groupId)
    try {
      const phone = resolveContactPhoneForSharing(profile, user)
      await respondToWalkGroup(groupId, user.uid, response, phone, profile.displayName)
    } catch (err) {
      setError(err.message)
    } finally {
      setRespondingId(null)
    }
  }

  if (!user) {
    return null
  }

  if (loading) {
    return (
      <div className="py-12 text-center text-muted">Loading your trips…</div>
    )
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Home"
        description="Today's rides, coverage gaps, and requests that need your attention."
      />

      {error ? <p className="alert-error">{error}</p> : null}

      <HomeNotificationAlerts />

      <Section
        title="Today's Trips"
        description="Confirmed rides happening today."
        empty={todayTrips.length === 0 ? 'No trips scheduled for today.' : null}
      >
        <div className="space-y-3">
          {todayTrips.map((trip) => (
            <TripCard
              key={trip.id}
              trip={trip}
              action={
                <Link to={`/rides/${trip.groupId}`} className="btn-primary shrink-0 py-2 text-sm">
                  View ride
                </Link>
              }
            />
          ))}
        </div>
      </Section>

      <Section
        title="Uncovered Trips"
        description="Upcoming trips without a confirmed guide yet."
        empty={uncoveredTrips.length === 0 ? 'All upcoming trips have guide coverage.' : null}
      >
        <div className="space-y-3">
          {uncoveredTrips.map((trip) => (
            <TripCard
              key={trip.id}
              trip={trip}
              action={
                <button
                  type="button"
                  onClick={() => navigate('/matches', { state: { findGuide: trip.groupId } })}
                  className="btn-accent shrink-0 py-2 text-sm"
                >
                  Find a guide
                </button>
              }
            />
          ))}
        </div>
      </Section>

      <Section
        title="Pending Requests"
        description="Match requests waiting for your response."
        empty={pendingRequests.length === 0 ? 'No pending requests right now.' : null}
      >
        <div className="space-y-3">
          {pendingRequests.map((match) => (
            <div key={match.id} className="kr-card-invite px-4 py-4">
              <p className="font-semibold text-[var(--color-text)]">{match.sharedActivity}</p>
              <p className="mt-1 text-sm text-muted">{match.scheduleOverlap}</p>
              <p className="mt-1 text-sm text-muted">
                {match.sharedConnections} other {match.sharedConnections === 1 ? 'family' : 'families'} joining
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={respondingId === match.groupId}
                  onClick={() => handleRespond(match.groupId, 'accepted')}
                  className="btn-primary py-2 text-sm"
                >
                  Accept
                </button>
                <button
                  type="button"
                  disabled={respondingId === match.groupId}
                  onClick={() => handleRespond(match.groupId, 'declined')}
                  className="btn-secondary py-2 text-sm"
                >
                  Decline
                </button>
                <Link to={`/matches/${match.groupId}`} className="btn-ghost py-2 text-sm">
                  Details
                </Link>
              </div>
            </div>
          ))}
        </div>
      </Section>
    </div>
  )
}
