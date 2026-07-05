import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  formatMessageTime,
  markGroupChatRead,
  sendGroupMessage,
  subscribeToGroupMessages,
  userCanAccessGroupChat,
} from '../firebase/groupMessages'
import { subscribeToGroupDocument } from '../firebase/groupWalk'
import { formatGroupTimes } from '../firebase/groups'
import { getUserProfile } from '../firebase/users'

export default function GroupChat() {
  const { groupId } = useParams()
  const { user } = useAuth()
  const [group, setGroup] = useState(null)
  const [messages, setMessages] = useState([])
  const [draft, setDraft] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState(null)
  const [senderName, setSenderName] = useState('Parent')
  const bottomRef = useRef(null)
  const listRef = useRef(null)

  useEffect(() => {
    if (!user) return undefined
    getUserProfile(user.uid).then((profile) => {
      setSenderName(profile.displayName || user.displayName || 'Parent')
    })
  }, [user])

  useEffect(() => {
    if (!groupId) return undefined

    const unsubGroup = subscribeToGroupDocument(
      groupId,
      (data) => {
        setGroup(data)
        setLoading(false)
      },
      (err) => {
        setError(err.message)
        setLoading(false)
      },
    )

    return unsubGroup
  }, [groupId])

  useEffect(() => {
    if (!groupId || !user || !group || !userCanAccessGroupChat(group, user.uid)) return undefined

    markGroupChatRead(groupId)

    const unsubMessages = subscribeToGroupMessages(
      groupId,
      setMessages,
      (err) => setError(err.message),
    )

    return unsubMessages
  }, [groupId, user, group])

  useEffect(() => {
    if (!groupId) return
    markGroupChatRead(groupId)
  }, [groupId, messages.length])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const hasAccess = group && user && userCanAccessGroupChat(group, user.uid)

  async function handleSend(event) {
    event.preventDefault()
    if (!user || !groupId || !draft.trim()) return

    setError(null)
    setSending(true)
    try {
      await sendGroupMessage(groupId, user.uid, senderName, draft)
      setDraft('')
      markGroupChatRead(groupId)
    } catch (err) {
      setError(err.message)
    } finally {
      setSending(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <p className="text-muted">Loading chat…</p>
      </div>
    )
  }

  if (!hasAccess) {
    return (
      <div className="kr-card p-6">
        <p className="text-muted">
          You don&apos;t have access to this group chat. Join and accept the group invitation
          first.
        </p>
        <Link to="/groups" className="mt-4 inline-block text-sm font-semibold text-primary hover:underline">
          ← Back to Groups
        </Link>
      </div>
    )
  }

  return (
    <div className="flex flex-col sm:-mx-0" style={{ height: 'calc(100dvh - 7.5rem)' }}>
      <div className="shrink-0 border-b border-border pb-4">
        <Link to="/groups" className="text-sm font-semibold text-primary hover:underline">
          ← Groups
        </Link>
        <h1 className="font-heading mt-2 text-xl font-semibold text-primary">Group messages</h1>
        <p className="mt-1 text-sm text-muted">
          {group.location} · {group.day} · {formatGroupTimes(group)}
        </p>
      </div>

      <div
        ref={listRef}
        className="min-h-0 flex-1 overflow-y-auto py-4"
        aria-live="polite"
      >
        {messages.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border bg-bg-warm px-4 py-8 text-center text-sm text-muted">
            No messages yet. Say hello and coordinate your walk!
          </p>
        ) : (
          <ul className="space-y-3">
            {messages.map((message) => {
              const isMine = message.userId === user.uid
              return (
                <li
                  key={message.id}
                  className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-3 sm:max-w-[70%] ${
                      isMine
                        ? 'rounded-br-md bg-primary text-white'
                        : 'rounded-bl-md border border-border bg-surface'
                    }`}
                  >
                    {!isMine && (
                      <p className="text-xs font-semibold text-primary">{message.displayName}</p>
                    )}
                    <p className={`text-sm leading-relaxed ${isMine ? 'text-white' : 'text-[var(--color-text)]'}`}>
                      {message.text}
                    </p>
                    <p
                      className={`mt-1.5 text-[10px] ${
                        isMine ? 'text-white/75' : 'text-muted'
                      }`}
                    >
                      {formatMessageTime(message.createdAt)}
                    </p>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
        <div ref={bottomRef} />
      </div>

      {error && <p className="alert-error mb-3 shrink-0 py-2">{error}</p>}

      <form
        onSubmit={handleSend}
        className="sticky bottom-0 shrink-0 border-t border-border bg-bg pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:static sm:bg-transparent sm:pb-0"
      >
        <div className="flex gap-2">
          <input
            type="text"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Type a message…"
            className="input-kr mt-0 min-w-0 flex-1"
            maxLength={500}
            autoComplete="off"
          />
          <button type="submit" disabled={sending || !draft.trim()} className="btn-primary shrink-0 px-5">
            {sending ? '…' : 'Send'}
          </button>
        </div>
      </form>
    </div>
  )
}
