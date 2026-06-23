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

export async function completeWalkHistoryEntry(historyId) {
  await updateDoc(doc(db, 'walkHistory', historyId), {
    droppedOffAt: serverTimestamp(),
  })
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
