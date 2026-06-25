import { getConfirmedMeetingPoint } from '../firebase/meetingPoints'

export default function ConfirmedMeetingPoint({ group, compact = false }) {
  const meetingPoint = getConfirmedMeetingPoint(group)
  if (!meetingPoint) return null

  if (compact) {
    return (
      <p className="mt-1.5 text-xs font-semibold opacity-90">
        📍 Meet: {meetingPoint.location}
      </p>
    )
  }

  return (
    <div className="rounded-xl border-2 border-primary/30 bg-primary/5 px-4 py-3">
      <p className="text-xs font-bold uppercase tracking-wide text-primary">Meeting point</p>
      <p className="mt-1 text-sm font-semibold text-[var(--color-text)]">{meetingPoint.location}</p>
    </div>
  )
}
