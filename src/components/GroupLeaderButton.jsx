import { Link } from 'react-router-dom'
import { getActiveLeaders } from '../firebase/groupLeaders'
import { isWalkGroupDocument, walkGroupUserHasAccepted } from '../firebase/walkGroups'

function LeaderConfirmedIcon() {
  return (
    <svg
      className="h-2.5 w-2.5"
      viewBox="0 0 12 12"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.5 6l2.5 2.5 4.5-5" />
    </svg>
  )
}

export default function GroupLeaderButton({ group, userId, className = '' }) {
  const showButton = isWalkGroupDocument(group) && userId && walkGroupUserHasAccepted(group, userId)

  if (!showButton) return null

  const hasConfirmedLeader = getActiveLeaders(group).length > 0

  return (
    <Link
      to={`/groups/${group.id}/leader#group-leaders`}
      className={`btn-group-leader relative ${className}`}
    >
      Group Leader
      {hasConfirmedLeader && (
        <span
          className="flex h-4 w-4 items-center justify-center rounded-full bg-[var(--color-walk-green)] text-white"
          title="Leader confirmed"
          aria-label="Leader confirmed"
        >
          <LeaderConfirmedIcon />
        </span>
      )}
    </Link>
  )
}
