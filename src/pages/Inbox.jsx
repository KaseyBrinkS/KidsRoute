import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import PageHeader from '../components/PageHeader'
import { useAuth } from '../context/AuthContext'
import { subscribeToInboxThreads } from '../firebase/inbox'

function ThreadRow({ thread }) {
  return (
    <Link
      to={thread.pending ? `/matches/${thread.groupId}` : `/inbox/${thread.groupId}`}
      className={`kr-card block px-4 py-4 transition-shadow hover:shadow-md ${
        thread.unread ? 'border-l-4 border-l-accent' : ''
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-semibold text-[var(--color-text)]">
            {thread.familyName}
            {thread.pending ? (
              <span className="ml-2 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-800">
                Request
              </span>
            ) : null}
          </p>
          <p className="text-sm text-primary">{thread.activity}</p>
          <p className="mt-1 truncate text-sm text-muted">{thread.lastMessage}</p>
        </div>
        {thread.lastMessageTime ? (
          <span className="shrink-0 text-xs text-muted">{thread.lastMessageTime}</span>
        ) : null}
      </div>
    </Link>
  )
}

export default function Inbox() {
  const { user } = useAuth()
  const [threads, setThreads] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!user) return undefined
    return subscribeToInboxThreads(
      user.uid,
      (data) => {
        setThreads(data)
        setLoading(false)
      },
      (err) => {
        setError(err.message)
        setLoading(false)
      },
    )
  }, [user])

  if (loading) {
    return <div className="py-12 text-center text-muted">Loading inbox…</div>
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Inbox"
        description="Match requests, ride confirmations, and messages with matched families."
      />

      {error ? <p className="alert-error">{error}</p> : null}

      {threads.length === 0 ? (
        <p className="text-sm text-muted">
          No conversations yet. When you match with another family, messages will appear here.
        </p>
      ) : (
        <div className="space-y-3">
          {threads.map((thread) => (
            <ThreadRow key={thread.id} thread={thread} />
          ))}
        </div>
      )}
    </div>
  )
}
