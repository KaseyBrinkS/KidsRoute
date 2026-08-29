import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getUserProfile } from '../firebase/users'
import {
  filterMessagesForSession,
  formatMessageTime,
  getCurrentSessionConversationLabel,
  getPastSessionKeys,
  groupMessagesByDate,
  markGroupChatRead,
  sendGroupMessage,
  subscribeToGroupMessages,
  userCanAccessGroupChat,
} from '../firebase/groupMessages'
import { getCurrentSessionKey, getSessionConversationLabel } from '../firebase/sessions'
import { subscribeToGroupDocument } from '../firebase/groupWalk'
import { formatGroupTimes } from '../firebase/groups'

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
  const [viewSessionKey, setViewSessionKey] = useState(getCurrentSessionKey())
  const [showPastConversations, setShowPastConversations] = useState(false)
  const bottomRef = useRef(null)

  const currentSessionKey = getCurrentSessionKey()
  const viewingCurrentSession = viewSessionKey === currentSessionKey

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

    const unsubMessages = subscribeToGroupMessages(
      groupId,
      setMessages,
      (err) => setError(err.message),
    )

    return unsubMessages
  }, [groupId, user, group])

  useEffect(() => {
    if (!groupId || !viewSessionKey) return
    markGroupChatRead(groupId, viewSessionKey)
  }, [groupId, viewSessionKey, messages.length])

  useEffect(() => {
    if (viewingCurrentSession) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, viewSessionKey, viewingCurrentSession])

  const pastSessionKeys = useMemo(
    () => getPastSessionKeys(messages, currentSessionKey),
    [messages, currentSessionKey],
  )

  const visibleMessages = useMemo(
    () => filterMessagesForSession(messages, viewSessionKey),
    [messages, viewSessionKey],
  )

  const timelineItems = useMemo(() => groupMessagesByDate(visibleMessages), [visibleMessages])

  const hasAccess = group && user && userCanAccessGroupChat(group, user.uid)

  async function handleSend(event) {
    event.preventDefault()
    if (!user || !groupId || !draft.trim() || !viewingCurrentSession) return

    setError(null)
    setSending(true)
    try {
      await sendGroupMessage(groupId, user.uid, senderName, draft)
      setDraft('')
      markGroupChatRead(groupId, currentSessionKey)
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
        <Link to="/groups" className="link-accent mt-4 inline-block text-sm">
          ← Back to Groups
        </Link>
      </div>
    )
  }

  return (
    <div className="flex flex-col sm:-mx-0" style={{ height: 'calc(100dvh - 7.5rem)' }}>
      <div className="shrink-0 border-b border-border pb-4">
        <Link to="/groups" className="link-accent text-sm">
          ← Groups
        </Link>
        <span className="text-muted">·</span>
        <Link to="/leader" className="link-accent text-sm">
          Leader
        </Link>
        <h1 className="font-heading mt-2 text-xl font-semibold text-primary">Group messages</h1>
        <p className="mt-1 text-sm text-muted">
          {group.location} · {group.day} · {formatGroupTimes(group)}
        </p>
        <p className="mt-2 text-sm font-medium text-primary">
          {viewingCurrentSession
            ? getCurrentSessionConversationLabel()
            : getSessionConversationLabel(viewSessionKey)}
        </p>

        {pastSessionKeys.length > 0 && (
          <div className="mt-3">
            <button
              type="button"
              onClick={() => setShowPastConversations((value) => !value)}
              className="link-accent text-sm"
            >
              {showPastConversations ? 'Hide past conversations' : 'Past conversations'}
            </button>
            {showPastConversations && (
              <ul className="mt-2 space-y-1">
                {viewingCurrentSession ? null : (
                  <li>
                    <button
                      type="button"
                      onClick={() => setViewSessionKey(currentSessionKey)}
                      className="text-sm text-primary hover:underline"
                    >
                      {getCurrentSessionConversationLabel()}
                    </button>
                  </li>
                )}
                {pastSessionKeys.map((sessionKey) => (
                  <li key={sessionKey}>
                    <button
                      type="button"
                      onClick={() => {
                        setViewSessionKey(sessionKey)
                        setShowPastConversations(false)
                      }}
                      className={`text-sm hover:underline ${
                        viewSessionKey === sessionKey ? 'font-semibold text-primary' : 'text-muted'
                      }`}
                    >
                      {getSessionConversationLabel(sessionKey)}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto py-4" aria-live="polite">
        {timelineItems.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border bg-bg-warm px-4 py-8 text-center text-sm text-muted">
            {viewingCurrentSession
              ? 'No messages yet. Say hello and coordinate your walk!'
              : 'No messages in this conversation.'}
          </p>
        ) : (
          <ul className="space-y-3">
            {timelineItems.map((item) => {
              if (item.type === 'date') {
                return (
                  <li key={item.id} className="flex justify-center py-2">
                    <span className="rounded-full bg-bg-warm px-3 py-1 text-xs font-medium text-muted">
                      {item.label}
                    </span>
                  </li>
                )
              }

              const isMine = item.userId === user.uid
              const isSystem = item.userId === 'system' || item.isAlert

              return (
                <li
                  key={item.id}
                  className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-3 sm:max-w-[70%] ${
                      isSystem
                        ? 'rounded-md border border-amber-200 bg-amber-50'
                        : isMine
                          ? 'rounded-br-md bg-primary text-white'
                          : 'rounded-bl-md border border-border bg-surface'
                    }`}
                  >
                    {!isMine && (
                      <p className={`text-xs font-semibold ${isSystem ? 'text-amber-900' : 'text-primary'}`}>
                        {item.displayName}
                      </p>
                    )}
                    <p
                      className={`text-sm leading-relaxed ${
                        isSystem
                          ? 'text-amber-900'
                          : isMine
                            ? 'text-white'
                            : 'text-[var(--color-text)]'
                      }`}
                    >
                      {item.text}
                    </p>
                    <p
                      className={`mt-1.5 text-[10px] ${
                        isSystem ? 'text-amber-700' : isMine ? 'text-white/75' : 'text-muted'
                      }`}
                    >
                      {formatMessageTime(item.createdAt)}
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

      {viewingCurrentSession ? (
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
      ) : (
        <p className="shrink-0 border-t border-border py-3 text-center text-sm text-muted">
          This is a past conversation — read only.
        </p>
      )}
    </div>
  )
}
