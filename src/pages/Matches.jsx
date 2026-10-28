import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import PageHeader from '../components/PageHeader'
import { useAuth } from '../context/AuthContext'
import { buildMatchFromGroup } from '../firebase/appModel'
import { syncWalkGroupsForUser } from '../firebase/activities'
import {
  subscribeToWalkGroups,
  walkGroupHasMultipleFamilies,
} from '../firebase/walkGroups'

const QUICK_ACTIONS = [
  { id: 'need-guide', emoji: '🙋', label: 'I need a guide', description: 'Find someone to escort my child' },
  { id: 'be-guide', emoji: '🚶', label: 'I can be a guide', description: 'Offer to escort other children' },
  { id: 'swap', emoji: '🔄', label: 'I can swap', description: 'Trade pickup or drop-off with another parent' },
  { id: 'backup', emoji: '✕', label: 'Cancel / Find backup', description: 'Cancel a trip and search for backup' },
]

function MatchCard({ match }) {
  return (
    <Link to={`/matches/${match.groupId}`} className="kr-card block px-4 py-4 transition-shadow hover:shadow-md">
      <p className="font-semibold text-[var(--color-text)]">{match.sharedActivity}</p>
      <p className="mt-1 text-sm text-muted">{match.scheduleOverlap}</p>
      <div className="mt-3 flex flex-wrap gap-2 text-xs">
        <span className="rounded-full bg-bg-warm px-2.5 py-1 font-medium text-muted">
          {match.sharedConnections} shared {match.sharedConnections === 1 ? 'connection' : 'connections'}
        </span>
        {match.needsHelp ? (
          <span className="rounded-full bg-amber-50 px-2.5 py-1 font-medium text-amber-800">
            Needs response
          </span>
        ) : (
          <span className="rounded-full bg-green-50 px-2.5 py-1 font-medium text-green-800">
            {match.offeringHelp ? 'Offering help' : 'Matched'}
          </span>
        )}
      </div>
    </Link>
  )
}

export default function Matches() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [walkGroups, setWalkGroups] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return undefined
    syncWalkGroupsForUser(user.uid).catch(console.error)
    return subscribeToWalkGroups(user.uid, (data) => {
      setWalkGroups(data.filter(walkGroupHasMultipleFamilies))
      setLoading(false)
    })
  }, [user])

  const matches = useMemo(
    () => walkGroups.map((g) => buildMatchFromGroup(g, user?.uid)).filter(Boolean),
    [walkGroups, user?.uid],
  )

  const discoveryMatches = useMemo(
    () => matches.filter((m) => m.accepted || m.pending),
    [matches],
  )

  function handleQuickAction(actionId) {
    if (actionId === 'need-guide') {
      navigate('/schedule')
      return
    }
    if (actionId === 'be-guide') {
      navigate('/profile')
      return
    }
    if (actionId === 'backup') {
      const confirmed = matches.find((m) => m.accepted)
      if (confirmed) navigate(`/rides/${confirmed.groupId}`)
      return
    }
    navigate('/matches', { state: { intent: actionId } })
  }

  useEffect(() => {
    if (location.state?.findGuide) {
      navigate(`/matches/${location.state.findGuide}`, { replace: true })
    }
  }, [location.state, navigate])

  if (loading) {
    return <div className="py-12 text-center text-muted">Finding matches…</div>
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Matches"
        description="Find families with overlapping routes and coordinate guide coverage."
      />

      <section className="grid gap-2 sm:grid-cols-2">
        {QUICK_ACTIONS.map((action) => (
          <button
            key={action.id}
            type="button"
            onClick={() => handleQuickAction(action.id)}
            className="rounded-2xl border border-border bg-surface px-4 py-3 text-left transition-colors hover:border-primary/25 hover:bg-bg-warm"
          >
            <p className="font-semibold text-[var(--color-text)]">
              {action.emoji} {action.label}
            </p>
            <p className="mt-1 text-sm text-muted">{action.description}</p>
          </button>
        ))}
      </section>

      <section className="space-y-3">
        <h2 className="kr-section-title">Discovery</h2>
        <p className="kr-section-desc">Families with overlapping schedules and shared connections.</p>
        {discoveryMatches.length === 0 ? (
          <p className="text-sm text-muted">
            No matches yet. Add activities in Schedule — KidsRoute will find overlapping families automatically.
          </p>
        ) : (
          <div className="space-y-3">
            {discoveryMatches.map((match) => (
              <MatchCard key={match.id} match={match} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
