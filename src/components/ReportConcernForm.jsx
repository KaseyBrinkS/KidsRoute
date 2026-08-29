import { useMemo, useState } from 'react'
import { GENERAL_CONCERN_VALUE, REPORT_REASONS, submitUserReport } from '../firebase/reports'

function firstNameFromParent(parentName) {
  const trimmed = parentName?.trim()
  if (!trimmed) return 'Parent'
  return trimmed.split(/\s+/)[0]
}

export default function ReportConcernForm({
  groupId,
  reporterUid,
  reporterName,
  groupName,
  participants,
}) {
  const [open, setOpen] = useState(false)
  const [reportTarget, setReportTarget] = useState('')
  const [reason, setReason] = useState(REPORT_REASONS[0].value)
  const [details, setDetails] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [submitted, setSubmitted] = useState(false)

  const otherParticipants = useMemo(
    () => participants.filter((participant) => participant.userId !== reporterUid),
    [participants, reporterUid],
  )

  function resetForm() {
    setReportTarget('')
    setReason(REPORT_REASONS[0].value)
    setDetails('')
    setError(null)
    setSubmitted(false)
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
    if (!reportTarget) {
      setError('Select who you are reporting, or choose general concern.')
      return
    }

    const isGeneralConcern = reportTarget === GENERAL_CONCERN_VALUE
    const reportedParticipant = isGeneralConcern
      ? null
      : otherParticipants.find((participant) => participant.userId === reportTarget)

    setError(null)
    setSubmitting(true)
    try {
      await submitUserReport({
        reporterUid,
        reportedUserUid: isGeneralConcern ? '' : reportTarget,
        isGeneralConcern,
        groupId,
        reason,
        details,
        reporterName,
        reportedUserName: isGeneralConcern
          ? 'General concern'
          : firstNameFromParent(reportedParticipant?.parentName),
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
          <div>
            <label htmlFor="report-user" className="block text-sm font-medium text-[var(--color-text)]">
              Who are you reporting?
            </label>
            <select
              id="report-user"
              value={reportTarget}
              onChange={(event) => setReportTarget(event.target.value)}
              className="input-kr mt-1 max-w-md"
              required
            >
              <option value="">Select a person or general concern</option>
              {otherParticipants.map((participant) => (
                <option key={participant.userId} value={participant.userId}>
                  {firstNameFromParent(participant.parentName)}
                </option>
              ))}
              <option value={GENERAL_CONCERN_VALUE}>General concern about this group</option>
            </select>
          </div>

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
