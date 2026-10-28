import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { buildMatchFromGroup } from '../firebase/appModel'
import {
  countOtherJoiningFamilies,
  formatWalkGroupDetails,
  getActiveParties,
  respondToWalkGroup,
  subscribeToWalkGroup,
  walkGroupNeedsUserResponse,
  walkGroupUserHasAccepted,
} from '../firebase/walkGroups'
import { subscribeToUserProfile } from '../firebase/users'
import { resolveContactPhoneForSharing } from '../utils/contactInfo'

export default function MatchDetail() {
  const { groupId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [group, setGroup] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!groupId) return undefined
    return subscribeToWalkGroup(groupId, (data) => {
      setGroup(data)
      setLoading(false)
    })
  }, [groupId])

  useEffect(() => {
    if (!user) return undefined
    return subscribeToUserProfile(user.uid, setProfile)
  }, [user])

  async function handleRespond(response) {
    if (!user || !profile || !groupId) return
    setBusy(true)
    setError(null)
    try {
      const phone = resolveContactPhoneForSharing(profile, user)
      await respondToWalkGroup(groupId, user.uid, response, phone, profile.displayName)
      if (response === 'accepted') navigate('/inbox')
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  if (loading) {
    return <div className="py-12 text-center text-muted">Loading match…</div>
  }

  if (!group) {
    return (
      <div className="space-y-4 py-12 text-center">
        <p className="text-muted">Match not found.</p>
        <Link to="/matches" className="link-accent">Back to Matches</Link>
      </div>
    )
  }

  const match = buildMatchFromGroup(group, user?.uid)
  const otherFamilies = getActiveParties(group).filter((p) => p.userId !== user?.uid)
  const sharedNames = [...new Set(otherFamilies.map((p) => p.parentName?.split(/\s+/)[0] ?? 'Parent'))]

  return (
    <div className="space-y-6">
      <Link to="/matches" className="link-accent text-sm font-medium">← Back to Matches</Link>

      <div className="kr-card px-5 py-6">
        <h1 className="font-heading text-2xl font-semibold text-primary">{match.sharedActivity}</h1>
        <p className="mt-2 text-muted">{formatWalkGroupDetails(group)}</p>

        <div className="mt-6 space-y-4">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Schedule compatibility</h2>
            <p className="mt-1 text-[var(--color-text)]">{match.scheduleOverlap}</p>
          </div>

          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Shared connections</h2>
            <p className="mt-1 text-[var(--color-text)]">
              {countOtherJoiningFamilies(group, user?.uid)} other{' '}
              {countOtherJoiningFamilies(group, user?.uid) === 1 ? 'family' : 'families'}
              {sharedNames.length > 0 ? `: ${sharedNames.join(', ')}` : ''}
            </p>
          </div>

          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Status</h2>
            <p className="mt-1 text-[var(--color-text)]">
              {match.needsHelp
                ? 'This family is requesting your participation'
                : walkGroupUserHasAccepted(group, user?.uid)
                  ? 'You are matched with this group'
                  : 'Review this match'}
            </p>
          </div>
        </div>

        {error ? <p className="alert-error mt-4">{error}</p> : null}

        <div className="mt-6 flex flex-wrap gap-2">
          {walkGroupNeedsUserResponse(group, user?.uid) ? (
            <>
              <button type="button" disabled={busy} onClick={() => handleRespond('accepted')} className="btn-primary">
                Send Request / Accept
              </button>
              <button type="button" disabled={busy} onClick={() => handleRespond('declined')} className="btn-secondary">
                Decline
              </button>
            </>
          ) : (
            <Link to={`/inbox/${groupId}`} className="btn-primary">
              Message families
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}
