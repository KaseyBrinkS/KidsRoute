import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { subscribeToGroupUnreadCount } from '../firebase/groupMessages'
import { isWalkGroupDocument, walkGroupUserHasAccepted } from '../firebase/walkGroups'

export default function GroupChatButton({ group, userId, className = '' }) {
  const [unreadCount, setUnreadCount] = useState(0)

  const showButton = isWalkGroupDocument(group) && userId && walkGroupUserHasAccepted(group, userId)

  useEffect(() => {
    if (!showButton) {
      setUnreadCount(0)
      return undefined
    }

    return subscribeToGroupUnreadCount(group.id, userId, setUnreadCount)
  }, [group.id, userId, showButton])

  if (!showButton) return null

  return (
    <Link
      to={`/groups/${group.id}/chat`}
      className={`btn-accent relative mt-3 w-full py-2.5 text-center text-sm ${className}`}
    >
      Messages
      {unreadCount > 0 && (
        <span
          className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-accent bg-surface px-1 text-[10px] font-bold text-accent"
          aria-label={`${unreadCount} unread messages`}
        >
          {unreadCount > 9 ? '9+' : unreadCount}
        </span>
      )}
    </Link>
  )
}
