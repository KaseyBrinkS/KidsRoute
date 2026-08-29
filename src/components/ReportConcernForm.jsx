import { useEffect, useMemo, useState } from 'react'
import { REPORT_REASONS, submitUserReport } from '../firebase/reports'

export default function ReportConcernForm({
  groupId,
  reporterUid,
  reporterName,
  groupName,
  participants,
}) {
  const [open, setOpen] = useState(false)
  const [reportedUserUid, setReportedUserUid] = useState('')
  const [reason, setReason] = useState(REPORT_REASONS[0].value)
  const [details, setDetails] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [submitted, setSubmitted] = useState(false)

  const otherParticipants = useMemo(
    () => participants.filter((participant) => participant.userId !== reporterUid),
    [participants, reporterUid],
  )

  useEffect(() => {
    if (otherParticipants.length === 1) {
      setReportedUserUid(otherParticipants[0].userId)
    }
  }, [otherParticipants])

  function resetForm() {
    setReason(REPORT_REASONS[0].value)
    setDetails('')
    setError(null)
    setSubmitted(false)
    if (otherParticipants.length === 1) {
      setReportedUserUid(otherParticipants[0].userId)
    } else {
      setReportedUserUid('')
    }
  }

  function handleOpen() {
    resetForm()
    setOpen(true)
  }

  function handleClose() {
    if (submitting) return
    setOpen(false)
  }

  async function handleSubmit(event) {
    event.preventDefault()
    if (!reportedUserUid) {
      setError('Select the person you are reporting.')
      return
    }

    setError(null)
    setSubmitting(true)
    try {
      const reportedParticipant = otherParticipants.find(
        (participant) => participant.userId === reportedUserUid,
      )

      await submitUserReport({
        reporterUid,
        reportedUserUid,
        groupId,
        reason,
        details,
        reporterName,
        reportedUserName: reportedParticipant?.parentName || '',
        groupName,
      })
      setSubmitted(true)
    } catch (err) {
      setError(err.message || 'Could not submit report. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={handleOpen}
        className="link-accent text-sm"
        disabled={otherParticipants.length === 0}
      >
        Report a concern
      </button>
    )
  }

  return (
    <div className="kr-card mt-6 p-5">
      <h3 className="font-heading text-base font-semibold text-[var(--color-text)]">
        Report a concern
      </h3>

      {submitted ? (
        <p className="mt-3 text-sm text-green-700">
          Thank you — we&apos;ll review this within 24 hours.
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {otherParticipants.length > 1 && (
            <div>
              <label htmlFor="report-user" className="block text-sm font-medium text-[var(--color-text)]">
                Who are you reporting?
              </label>
              <select
                id="report-user"
                value={reportedUserUid}
                onChange={(event) => setReportedUserUid(event.target.value)}
                className="input-kr mt-1 max-w-md"
                required
              >
                <option value="">Select a person</option>
                {otherParticipants.map((participant) => (
                  <option key={participant.userId} value={participant.userId}>
                    {participant.parentName || 'Parent'}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label htmlFor="report-reason" className="block text-sm font-medium text-[var(--color-text)]">
              Reason
            </label>
            <select
              id="report-reason"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              className="input-kr mt-1 max-w-md"
              required
            >
              {REPORT_REASONS.map((entry) => (
                <option key={entry.value} value={entry.value}>
                  {entry.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="report-details" className="block text-sm font-medium text-[var(--color-text)]">
              Details <span className="font-normal text-muted">(optional)</span>
            </label>
            <textarea
              id="report-details"
              value={details}
              onChange={(event) => setDetails(event.target.value)}
              rows={3}
              maxLength={500}
              placeholder="Briefly describe your concern"
              className="input-kr mt-1 max-w-md resize-y"
            />
          </div>

          {error && (
            <p className="text-sm text-red-700">{error}</p>
          )}

          <div className="flex flex-wrap gap-3">
            <button type="submit" disabled={submitting} className="btn-primary">
              {submitting ? 'Submitting…' : 'Submit'}
            </button>
            <button type="button" onClick={handleClose} disabled={submitting} className="btn-secondary">
              Cancel
            </button>
          </div>
        </form>
      )}

      {submitted && (
        <button type="button" onClick={handleClose} className="link-accent mt-4 text-sm">
          Close
        </button>
      )}
    </div>
  )
}
