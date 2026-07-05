import { useState } from 'react'
import {
  formatMeetingPointProposalMessage,
  getConfirmedMeetingPoint,
  getPendingMeetingPointForUser,
  getPendingMeetingPointProposals,
  proposeMeetingPoint,
  respondToMeetingPointProposal,
  shouldShowMeetingPointUI,
  walkGroupCanProposeMeetingPoint,
} from '../firebase/meetingPoints'

export default function MeetingPointControls({ group, userId, proposerName = 'A parent' }) {
  const [showForm, setShowForm] = useState(false)
  const [location, setLocation] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  const canPropose = walkGroupCanProposeMeetingPoint(group)
  const showSection = shouldShowMeetingPointUI(group, userId)
  const confirmed = getConfirmedMeetingPoint(group)
  const pendingForUser = getPendingMeetingPointForUser(group, userId)
  const pendingProposals = getPendingMeetingPointProposals(group)
  const userPendingProposal = pendingProposals.find((proposal) => proposal.proposedBy === userId)

  async function handlePropose(event) {
    event.preventDefault()
    setError(null)
    setBusy(true)
    try {
      await proposeMeetingPoint(group.id, userId, location, proposerName)
      setLocation('')
      setShowForm(false)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  async function handleApproval(proposalId, response) {
    setError(null)
    setBusy(true)
    try {
      await respondToMeetingPointProposal(group.id, userId, proposalId, response)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  if (!showSection) return null

  return (
    <div className="mt-4 rounded-xl border border-border bg-bg-warm p-4">
      <p className="text-sm font-semibold text-primary">Meeting point</p>

      {userPendingProposal && (
        <p className="mt-2 text-sm text-muted">
          Waiting for other families to approve your proposal:{' '}
          <span className="font-semibold text-[var(--color-text)]">
            {userPendingProposal.location}
          </span>
        </p>
      )}

      {pendingForUser.length > 0 && (
        <div className="mt-3 space-y-3">
          {pendingForUser.map((proposal) => (
            <div key={proposal.id} className="rounded-xl border border-border bg-surface p-3">
              <p className="text-sm text-[var(--color-text)]">
                {formatMeetingPointProposalMessage(proposal)}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => handleApproval(proposal.id, 'approved')}
                  className="btn-primary py-1.5 text-xs"
                >
                  Approve
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => handleApproval(proposal.id, 'declined')}
                  className="btn-secondary py-1.5 text-xs"
                >
                  Decline
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {!showForm && !userPendingProposal && canPropose && (
        <div className="mt-3">
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="btn-secondary py-1.5 text-xs"
          >
            {confirmed ? 'Propose new meeting point' : 'Propose meeting point'}
          </button>
        </div>
      )}

      {showForm && (
        <form onSubmit={handlePropose} className="mt-3 space-y-3 border-t border-border pt-3">
          <p className="text-xs text-muted">
            All families in the group must approve before the meeting point is confirmed.
          </p>
          <input
            type="text"
            value={location}
            onChange={(event) => setLocation(event.target.value)}
            placeholder='e.g. "Corner of Warren St and Greenwich St"'
            className="input-kr w-full text-sm"
            required
          />
          <div className="flex flex-wrap gap-2">
            <button type="submit" disabled={busy} className="btn-primary py-1.5 text-xs">
              {busy ? 'Proposing…' : 'Submit proposal'}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
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
