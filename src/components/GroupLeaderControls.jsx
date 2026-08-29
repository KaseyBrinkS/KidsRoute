import { useEffect, useMemo, useState } from 'react'
import {
  EXTERNAL_LEADER_ROLES,
  LEADER_ROLES,
  getActiveLeaders,
  getLeaderInviteUrl,
  getPendingProposalForUser,
  groupCanBeLed,
  proposeExternalLeader,
  respondToLeaderProposal,
} from '../firebase/groupLeaders'
import {
  getUpcomingScheduleEntries,
  removeLeaderVolunteer,
  subscribeToLeaderVolunteers,
} from '../firebase/leaderVolunteers'
import { getUserProfile } from '../firebase/users'
import LeaderScheduleCalendar from './LeaderScheduleCalendar'
import LeaderVolunteerPanel from './LeaderVolunteerPanel'

function LeaderPersonIcon({ className = '' }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"
      />
      <circle cx="9" cy="7" r="4" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 8v6M22 11h-6" />
    </svg>
  )
}

function AddExternalLeaderCard({ onClick, disabled }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="w-full rounded-2xl border-2 border-dashed border-primary/30 bg-surface p-4 text-left transition-all hover:border-primary/60 hover:bg-bg-warm disabled:opacity-50"
    >
      <div className="flex gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <LeaderPersonIcon className="h-6 w-6" />
        </div>
        <div className="min-w-0">
          <p className="font-heading text-sm font-semibold text-primary">Add group leader</p>
          <p className="mt-1.5 text-xs leading-relaxed text-muted">
            Add a nanny, older child, or trusted chaperone to lead this group. All families in the
            group must approve before they are accepted. We recommend messaging the group first to
            introduce them.
          </p>
        </div>
      </div>
    </button>
  )
}

export default function GroupLeaderControls({ group, userId, absences = [] }) {
  const [showAddForm, setShowAddForm] = useState(false)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [role, setRole] = useState('nanny')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [copiedToken, setCopiedToken] = useState(null)
  const [volunteers, setVolunteers] = useState([])
  const [leaderName, setLeaderName] = useState('Parent')
  const [removingId, setRemovingId] = useState(null)

  const activeLeaders = getActiveLeaders(group)
  const pendingForUser = getPendingProposalForUser(group, userId)
  const canVolunteer = groupCanBeLed(group)

  useEffect(() => {
    if (!group?.id) return undefined
    return subscribeToLeaderVolunteers(group.id, setVolunteers, (err) => setError(err.message))
  }, [group?.id])

  useEffect(() => {
    if (!userId) return
    getUserProfile(userId).then((profile) => {
      setLeaderName(profile.displayName || 'Parent')
    })
  }, [userId])

  const scheduleEntries = useMemo(
    () => getUpcomingScheduleEntries(group, volunteers, absences),
    [group, volunteers, absences],
  )

  async function handlePropose(event) {
    event.preventDefault()
    setError(null)
    setBusy(true)
    try {
      await proposeExternalLeader(group.id, userId, { name, phone, role })
      setName('')
      setPhone('')
      setShowAddForm(false)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  async function handleApproval(leaderId, response) {
    setError(null)
    setBusy(true)
    try {
      await respondToLeaderProposal(group.id, userId, leaderId, response)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  async function handleRemoveVolunteer(volunteerId) {
    setError(null)
    setRemovingId(volunteerId)
    try {
      await removeLeaderVolunteer(volunteerId)
    } catch (err) {
      setError(err.message)
    } finally {
      setRemovingId(null)
    }
  }

  async function copyInviteLink(token) {
    const url = getLeaderInviteUrl(token)
    try {
      await navigator.clipboard.writeText(url)
      setCopiedToken(token)
      setTimeout(() => setCopiedToken(null), 2500)
    } catch {
      setError('Could not copy link. Share manually: ' + url)
    }
  }

  return (
    <div className="kr-card-subsection mt-4">
      <p className="font-heading text-sm font-semibold text-primary">Group leaders</p>
      <p className="mt-1 text-xs leading-relaxed text-muted">
        Parent volunteers or approved chaperones who can start and manage walks for this group.
      </p>

      {activeLeaders.length > 0 && (
        <ul className="mt-3 space-y-2 rounded-xl border border-border bg-bg-warm p-3">
          {activeLeaders.map((leader) => (
            <li key={leader.id} className="text-sm text-[var(--color-text)]">
              <span className="font-semibold">{leader.name}</span>
              <span className="text-muted"> · {LEADER_ROLES[leader.role] ?? leader.role}</span>
              {leader.phone && (
                <span className="block text-xs text-muted">Phone: {leader.phone}</span>
              )}
              {leader.inviteToken && leader.proposedBy === userId && !leader.userId && (
                <button
                  type="button"
                  onClick={() => copyInviteLink(leader.inviteToken)}
                  className="link-accent text-xs"
                >
                  {copiedToken === leader.inviteToken ? 'Link copied!' : 'Copy sign-in link for leader'}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {pendingForUser.length > 0 && (
        <div className="mt-4 space-y-3">
          {pendingForUser.map((leader) => (
            <div key={leader.id} className="rounded-xl border border-accent/30 bg-accent-soft p-3">
              <p className="text-sm text-[var(--color-text)]">
                <span className="font-semibold">{leader.name}</span> has been proposed as a group
                leader ({LEADER_ROLES[leader.role]}). Approve?
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => handleApproval(leader.id, 'approved')}
                  className="btn-primary py-1.5 text-xs"
                >
                  Approve
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => handleApproval(leader.id, 'declined')}
                  className="btn-secondary py-1.5 text-xs"
                >
                  Decline
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {canVolunteer && (
        <LeaderVolunteerPanel
          group={group}
          userId={userId}
          leaderName={leaderName}
        />
      )}

      <LeaderScheduleCalendar
        scheduleEntries={scheduleEntries}
        volunteers={volunteers}
        currentUserId={userId}
        onRemoveVolunteer={handleRemoveVolunteer}
        removingId={removingId}
      />

      {!showAddForm ? (
        <div className="mt-4">
          <AddExternalLeaderCard onClick={() => setShowAddForm(true)} disabled={busy} />
        </div>
      ) : (
        <form onSubmit={handlePropose} className="mt-4 space-y-3 rounded-2xl border border-border bg-bg-warm p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <LeaderPersonIcon className="h-6 w-6" />
            </div>
            <div>
              <p className="font-heading text-sm font-semibold text-primary">Propose a group leader</p>
              <p className="mt-1 text-xs leading-relaxed text-muted">
                All families must approve before they get access.
              </p>
            </div>
          </div>
          <input
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Leader name"
            className="input-kr w-full text-sm"
            required
          />
          <input
            type="tel"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            placeholder="Phone number"
            className="input-kr w-full text-sm"
            required
          />
          <select
            value={role}
            onChange={(event) => setRole(event.target.value)}
            className="select-kr w-full text-sm"
          >
            {EXTERNAL_LEADER_ROLES.map((value) => (
              <option key={value} value={value}>
                {LEADER_ROLES[value]}
              </option>
            ))}
          </select>
          <div className="flex flex-wrap gap-2">
            <button type="submit" disabled={busy} className="btn-primary py-1.5 text-xs">
              {busy ? 'Proposing…' : 'Propose leader'}
            </button>
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="btn-link-accent py-1.5 text-xs"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  )
}
