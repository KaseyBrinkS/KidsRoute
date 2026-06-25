import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  formatMeetingPointProposalMessage,
  getPendingMeetingPointForUser,
  respondToMeetingPointProposal,
} from '../firebase/meetingPoints'
import { formatWalkGroupDetails } from '../firebase/walkGroups'

export default function MeetingPointProposalAlerts({ groups, userId }) {
  const [busyId, setBusyId] = useState(null)
  const [error, setError] = useState(null)

  const alerts = groups.flatMap((group) =>
    getPendingMeetingPointForUser(group, userId).map((proposal) => ({
      group,
      proposal,
    })),
  )

  if (alerts.length === 0) return null

  async function handleResponse(groupId, proposalId, response) {
    setError(null)
    setBusyId(`${groupId}_${proposalId}`)
    try {
      await respondToMeetingPointProposal(groupId, userId, proposalId, response)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusyId(null)
    }
  }

  return (
    <section className="mb-8">
      <h2 className="kr-section-title">Meeting point proposals</h2>
      <p className="kr-section-desc">
        Approve where your group should meet before each walk.
      </p>
      {error && <p className="alert-error mt-2">{error}</p>}
      <div className="mt-4 space-y-4">
        {alerts.map(({ group, proposal }) => {
          const busyKey = `${group.id}_${proposal.id}`
          return (
            <div key={busyKey} className="kr-card p-6">
              <span className="badge-accent">Meeting point</span>
              <p className="mt-3 text-lg font-semibold text-[var(--color-text)]">
                {formatMeetingPointProposalMessage(proposal)}
              </p>
              <p className="mt-2 text-sm text-muted">{formatWalkGroupDetails(group)}</p>
              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  type="button"
                  disabled={busyId === busyKey}
                  onClick={() => handleResponse(group.id, proposal.id, 'approved')}
                  className="btn-primary"
                >
                  Approve
                </button>
                <button
                  type="button"
                  disabled={busyId === busyKey}
                  onClick={() => handleResponse(group.id, proposal.id, 'declined')}
                  className="btn-secondary"
                >
                  Decline
                </button>
                <Link to="/groups" className="btn-ghost self-center">
                  View on Groups
                </Link>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
