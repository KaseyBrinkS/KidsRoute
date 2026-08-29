import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  formatMessageTime,
  getLatestWalkLeaderMessage,
  subscribeToGroupMessages,
  userCanAccessGroupChat,
} from '../firebase/groupMessages'
import { subscribeToLeaderVolunteers } from '../firebase/leaderVolunteers'
import { isWalkGroupDocument } from '../firebase/walkGroups'

export default function LatestLeaderMessageBanner({ group, userId, className = '' }) {
  const [messages, setMessages] = useState([])
  const [volunteers, setVolunteers] = useState([])

  const canShow =
    isWalkGroupDocument(group) && userId && userCanAccessGroupChat(group, userId)

  useEffect(() => {
    if (!canShow || !group?.id) return undefined

    const unsubMessages = subscribeToGroupMessages(group.id, setMessages)
    const unsubVolunteers = subscribeToLeaderVolunteers(group.id, setVolunteers)

    return () => {
      unsubMessages()
      unsubVolunteers()
    }
  }, [canShow, group?.id])

  const latestMessage = useMemo(
    () => getLatestWalkLeaderMessage(messages, group, volunteers),
    [messages, group, volunteers],
  )

  if (!canShow) return null

  return (
    <div className={`rounded-xl border-2 border-primary/25 bg-primary/5 px-4 py-3 ${className}`}>
      <p className="text-xs font-bold uppercase tracking-wide text-primary">Walk Leader message</p>
      {latestMessage ? (
        <>
          <p className="mt-1 text-sm font-medium text-[var(--color-text)]">{latestMessage.text}</p>
          <p className="mt-1 text-xs text-muted">
            {latestMessage.displayName} · {formatMessageTime(latestMessage.createdAt)}
          </p>
        </>
      ) : (
        <p className="mt-1 text-sm text-muted">No messages from Walk Leaders yet.</p>
      )}
      <Link to={`/groups/${group.id}/chat`} className="link-accent mt-2 inline-block text-xs font-semibold">
        View all messages →
      </Link>
    </div>
  )
}
