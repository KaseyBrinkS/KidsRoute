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
import { isWalkGroupDocument, walkGroupUserHasAccepted } from './walkGroups'

const READ_STORAGE_PREFIX = 'kidsroute.chat.read'

export function userCanAccessGroupChat(group, userId) {
  if (!group || !userId || !isWalkGroupDocument(group)) return false
  return walkGroupUserHasAccepted(group, userId)
}

function messagesCollection(groupId) {
  return collection(db, 'walkGroups', groupId, 'messages')
}

export function getGroupChatLastReadMs(groupId) {
  try {
    const raw = localStorage.getItem(`${READ_STORAGE_PREFIX}.${groupId}`)
    if (!raw) return 0
    const parsed = Date.parse(raw)
    return Number.isNaN(parsed) ? 0 : parsed
  } catch {
    return 0
  }
}

export function markGroupChatRead(groupId) {
  try {
    localStorage.setItem(`${READ_STORAGE_PREFIX}.${groupId}`, new Date().toISOString())
  } catch {
    // Ignore storage failures.
  }
}

export function subscribeToGroupMessages(groupId, onData, onError) {
  const messagesQuery = query(messagesCollection(groupId), orderBy('createdAt', 'asc'))

  return onSnapshot(
    messagesQuery,
    (snapshot) => {
      const messages = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      }))
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

  const messagesQuery = query(messagesCollection(groupId), orderBy('createdAt', 'asc'))

  return onSnapshot(
    messagesQuery,
    (snapshot) => {
      const lastReadMs = getGroupChatLastReadMs(groupId)
      let count = 0
      for (const docSnap of snapshot.docs) {
        const data = docSnap.data()
        if (data.userId === userId) continue
        const createdMs = data.createdAt?.toMillis?.() ?? 0
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
    createdAt: serverTimestamp(),
  })
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
