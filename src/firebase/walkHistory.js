import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore'
import { db } from './db'

export function subscribeToWalkHistory(userId, onData, onError) {
  return onSnapshot(
    query(collection(db, 'walkHistory'), where('userId', '==', userId)),
    (snapshot) => {
      const entries = snapshot.docs
        .map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))
        .sort((a, b) => toMillis(b.pickedUpAt) - toMillis(a.pickedUpAt))
      onData(entries)
    },
    onError,
  )
}

export async function createWalkHistoryEntry({
  userId,
  childId,
  childFirstName,
  groupId,
  sessionId,
  location,
  scheduleDay,
  pickedUpAt,
  droppedOffAt,
}) {
  const entry = {
    userId,
    childId,
    childFirstName,
    groupId,
    sessionId,
    location,
    scheduleDay,
    pickedUpAt: pickedUpAt ?? serverTimestamp(),
    droppedOffAt: droppedOffAt ?? null,
    createdAt: serverTimestamp(),
  }

  return addDoc(collection(db, 'walkHistory'), entry)
}

function normalizeHistoryId(historyId) {
  if (!historyId) return null
  if (typeof historyId === 'string') {
    const trimmed = historyId.trim()
    return trimmed || null
  }
  if (typeof historyId === 'object' && typeof historyId.id === 'string') {
    return historyId.id
  }
  return null
}

export async function completeWalkHistoryEntry(historyId) {
  const normalizedHistoryId = normalizeHistoryId(historyId)
  if (!normalizedHistoryId) {
    throw new Error('Missing walk history entry id.')
  }

  await updateDoc(doc(db, 'walkHistory', normalizedHistoryId), {
    droppedOffAt: serverTimestamp(),
  })
}

export async function syncWalkHistoryDropOff({
  historyId,
  userId,
  childId,
  childFirstName,
  groupId,
  sessionId,
  location,
  scheduleDay,
  pickedUpAt,
}) {
  const normalizedHistoryId = normalizeHistoryId(historyId)
  console.log('[dropOff] syncWalkHistoryDropOff', {
    historyId,
    normalizedHistoryId,
    userId,
    childId,
    sessionId,
  })

  if (normalizedHistoryId) {
    try {
      console.log('[dropOff] updating walk history entry', { historyId: normalizedHistoryId })
      await completeWalkHistoryEntry(normalizedHistoryId)
      console.log('[dropOff] walk history entry updated')
      return normalizedHistoryId
    } catch (error) {
      console.warn('[dropOff] walk history update failed, will create fallback entry', {
        code: error?.code,
        message: error?.message,
      })
    }
  }

  console.log('[dropOff] creating walk history entry (fallback)')
  const historyRef = await createWalkHistoryEntry({
    userId,
    childId,
    childFirstName,
    groupId,
    sessionId,
    location,
    scheduleDay,
    pickedUpAt,
    droppedOffAt: serverTimestamp(),
  })

  console.log('[dropOff] walk history entry created', { historyId: historyRef.id })
  return historyRef.id
}

export function hasDropOffTime(entry) {
  return entry.droppedOffAt != null && entry.droppedOffAt !== ''
}

function toMillis(timestamp) {
  if (!timestamp) return 0
  if (typeof timestamp.toMillis === 'function') return timestamp.toMillis()
  if (timestamp.seconds) return timestamp.seconds * 1000
  return new Date(timestamp).getTime()
}

export function formatHistoryDate(timestamp) {
  if (!timestamp) return '—'
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
  return date.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function formatHistoryTime(timestamp) {
  if (!timestamp) return '—'
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
  return date.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  })
}
