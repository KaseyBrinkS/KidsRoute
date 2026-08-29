import {
  addDoc,
  collection,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
} from 'firebase/firestore'
import { db } from './db'
import {
  formatDateKey,
  formatDisplayDate,
  getCurrentSessionKey,
  getSessionConversationLabel,
  getSessionKeyFromTimestamp,
} from './sessions'
import { isWalkGroupDocument, walkGroupUserHasAccepted } from './walkGroups'

const READ_STORAGE_PREFIX = 'kidsroute.chat.read'

export function userCanAccessGroupChat(group, userId) {
  if (!group || !userId || !isWalkGroupDocument(group)) return false
  return walkGroupUserHasAccepted(group, userId)
}

function messagesCollection(groupId) {
  return collection(db, 'walkGroups', groupId, 'messages')
}

function readStorageKey(groupId, sessionKey = null) {
  return sessionKey
    ? `${READ_STORAGE_PREFIX}.${groupId}.${sessionKey}`
    : `${READ_STORAGE_PREFIX}.${groupId}`
}

export function getGroupChatLastReadMs(groupId, sessionKey = null) {
  try {
    const raw = localStorage.getItem(readStorageKey(groupId, sessionKey))
    if (!raw) return 0
    const parsed = Date.parse(raw)
    return Number.isNaN(parsed) ? 0 : parsed
  } catch {
    return 0
  }
}

export function markGroupChatRead(groupId, sessionKey = null) {
  try {
    localStorage.setItem(readStorageKey(groupId, sessionKey), new Date().toISOString())
  } catch {
    // Ignore storage failures.
  }
}

function normalizeMessage(docSnap) {
  const data = docSnap.data()
  const sessionKey = data.sessionKey || getSessionKeyFromTimestamp(data.createdAt)
  return {
    id: docSnap.id,
    ...data,
    sessionKey,
  }
}

export function subscribeToGroupMessages(groupId, onData, onError) {
  const messagesQuery = query(messagesCollection(groupId), orderBy('createdAt', 'asc'))

  return onSnapshot(
    messagesQuery,
    (snapshot) => {
      const messages = snapshot.docs.map(normalizeMessage)
      onData(messages)
    },
    onError,
  )
}

export function subscribeToGroupUnreadCount(groupId, userId, onCount, onError) {
  if (!groupId || !userId) {
    onCount(0)
    return () => {}
  }

  const currentSessionKey = getCurrentSessionKey()
  const messagesQuery = query(messagesCollection(groupId), orderBy('createdAt', 'asc'))

  return onSnapshot(
    messagesQuery,
    (snapshot) => {
      const lastReadMs = getGroupChatLastReadMs(groupId, currentSessionKey)
      let count = 0
      for (const docSnap of snapshot.docs) {
        const message = normalizeMessage(docSnap)
        if (message.sessionKey !== currentSessionKey) continue
        if (message.userId === userId) continue
        const createdMs = message.createdAt?.toMillis?.() ?? 0
        if (createdMs > lastReadMs) count += 1
      }
      onCount(count)
    },
    onError,
  )
}

export async function sendGroupMessage(groupId, userId, displayName, text) {
  const trimmed = text?.trim()
  if (!trimmed) throw new Error('Enter a message to send.')

  const groupRef = doc(db, 'walkGroups', groupId)
  const groupSnap = await getDoc(groupRef)
  if (!groupSnap.exists()) throw new Error('Group not found.')

  const group = { id: groupSnap.id, ...groupSnap.data() }
  if (!userCanAccessGroupChat(group, userId)) {
    throw new Error('You must be an approved group member to send messages.')
  }

  const firstName = displayName?.trim().split(/\s+/)[0] || 'Parent'

  await addDoc(messagesCollection(groupId), {
    userId,
    displayName: firstName,
    text: trimmed,
    sessionKey: getCurrentSessionKey(),
    createdAt: serverTimestamp(),
  })
}

export function getMessageDateKey(message) {
  if (!message?.createdAt) return null
  const date = message.createdAt.toDate ? message.createdAt.toDate() : new Date(message.createdAt)
  return formatDateKey(date)
}

export function groupMessagesByDate(messages) {
  const items = []

  messages.forEach((message, index) => {
    const dateKey = getMessageDateKey(message)
    const previousDateKey = index > 0 ? getMessageDateKey(messages[index - 1]) : null
    if (dateKey && dateKey !== previousDateKey) {
      items.push({ type: 'date', id: `date-${dateKey}`, dateKey, label: formatDateSeparator(dateKey) })
    }
    items.push({ type: 'message', ...message })
  })

  return items
}

export function formatDateSeparator(dateKey) {
  const today = formatDateKey(new Date())
  const date = new Date(`${dateKey}T12:00:00`)
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayKey = formatDateKey(yesterday)

  if (dateKey === today) return 'Today'
  if (dateKey === yesterdayKey) return 'Yesterday'
  return formatDisplayDate(dateKey)
}

export function getPastSessionKeys(messages, currentSessionKey = getCurrentSessionKey()) {
  return [...new Set(messages.map((message) => message.sessionKey))]
    .filter((sessionKey) => sessionKey && sessionKey !== currentSessionKey)
    .sort((a, b) => b.localeCompare(a))
}

export function filterMessagesForSession(messages, sessionKey) {
  return messages.filter((message) => message.sessionKey === sessionKey)
}

export function getCurrentSessionConversationLabel(referenceDate = new Date()) {
  return getSessionConversationLabel(getCurrentSessionKey(referenceDate))
}

export function formatMessageTime(timestamp) {
  if (!timestamp) return ''
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
  const now = new Date()
  const isToday =
    date.getDate() === now.getDate()
    && date.getMonth() === now.getMonth()
    && date.getFullYear() === now.getFullYear()

  if (isToday) {
    return date.toLocaleTimeString(undefined, {
      hour: 'numeric',
      minute: '2-digit',
    })
  }

  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}
