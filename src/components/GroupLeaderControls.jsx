import { useState } from 'react'
import {
  EXTERNAL_LEADER_ROLES,
  LEADER_ROLES,
  getActiveLeaders,
  getLeaderInviteUrl,
  getPendingProposalForUser,
  proposeExternalLeader,
  respondToLeaderProposal,
  userCanVolunteerAsLeader,
  userHasVolunteeredAsParentLeader,
  volunteerAsParentLeader,
} from '../firebase/groupLeaders'

export default function GroupLeaderControls({ group, userId }) {
  const [showAddForm, setShowAddForm] = useState(false)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [role, setRole] = useState('nanny')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [copiedToken, setCopiedToken] = useState(null)

  const activeLeaders = getActiveLeaders(group)
  const pendingForUser = getPendingProposalForUser(group, userId)
  const canVolunteer = userCanVolunteerAsLeader(group, userId)
  const hasVolunteered = userHasVolunteeredAsParentLeader(group, userId)

  async function handleVolunteer() {
    setError(null)
    setBusy(true)
    try {
      await volunteerAsParentLeader(group.id, userId)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

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
    <div className="mt-4 rounded-xl border border-border bg-bg-warm p-4">
      <p className="text-sm font-semibold text-primary">Group leaders</p>

      {activeLeaders.length > 0 && (
        <ul className="mt-3 space-y-2">
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
                  className="mt-1 text-xs font-semibold text-primary hover:underline"
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
            <div key={leader.id} className="rounded-xl border border-border bg-surface p-3">
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

      <div className="mt-4 flex flex-wrap gap-2">
        {canVolunteer && (
          <button
            type="button"
            onClick={handleVolunteer}
            disabled={busy}
            className="btn-secondary py-1.5 text-xs"
          >
            {busy ? 'Saving…' : 'Volunteer as group leader'}
          </button>
        )}
        {hasVolunteered && (
          <span className="self-center text-xs font-semibold text-[var(--color-walk-green)]">
            You are a group leader
          </span>
        )}
        {!showAddForm && (
          <button
            type="button"
            onClick={() => setShowAddForm(true)}
            className="btn-ghost py-1.5 text-xs"
          >
            Add external leader
          </button>
        )}
      </div>

      {showAddForm && (
        <form onSubmit={handlePropose} className="mt-4 space-y-3 border-t border-border pt-4">
          <p className="text-xs text-muted">
            Propose a nanny or older student. All families must approve before they get access.
          </p>
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
              className="btn-ghost py-1.5 text-xs"
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
