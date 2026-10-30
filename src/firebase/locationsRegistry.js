import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore'
import { db } from './db'
import { PRESET_LOCATIONS } from '../data/locations'

function locationDocId(name) {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

export function isCommunityLocationVisible(docSnap) {
  const status = docSnap.status
  return !status || status === 'approved'
}

export function mergeLocationNames(communityDocs = []) {
  const approved = communityDocs
    .filter(isCommunityLocationVisible)
    .map((docSnap) => docSnap.name?.trim() ?? '')
    .filter(Boolean)

  return [...new Set([...PRESET_LOCATIONS, ...approved])].sort((a, b) =>
    a.localeCompare(b),
  )
}

export function subscribeToApprovedLocations(onData, onError) {
  return onSnapshot(
    collection(db, 'locations'),
    (snapshot) => {
      const docs = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      }))
      onData(mergeLocationNames(docs))
    },
    onError,
  )
}

export function subscribeToPendingLocations(onData, onError) {
  return onSnapshot(
    query(collection(db, 'locations'), where('status', '==', 'pending')),
    (snapshot) => {
      const docs = snapshot.docs
        .map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        }))
        .sort((a, b) => {
          const aTime = a.createdAt?.seconds ?? 0
          const bTime = b.createdAt?.seconds ?? 0
          return bTime - aTime
        })
      onData(docs)
    },
    onError,
  )
}

export async function registerPendingLocation(name, submittedBy) {
  const trimmed = name?.trim()
  if (!trimmed) return

  const normalized = trimmed.toLowerCase()
  if (PRESET_LOCATIONS.some((location) => location.toLowerCase() === normalized)) {
    return
  }

  const id = locationDocId(trimmed)
  if (!id) return

  const ref = doc(db, 'locations', id)
  const existing = await getDoc(ref)
  if (existing.exists()) return

  await setDoc(ref, {
    name: trimmed,
    status: 'pending',
    submittedBy: submittedBy ?? null,
    createdAt: serverTimestamp(),
  })
}

export async function approveCommunityLocation(locationId) {
  const ref = doc(db, 'locations', locationId)
  await updateDoc(ref, {
    status: 'approved',
    verifiedAt: serverTimestamp(),
  })
}

export async function rejectCommunityLocation(locationId) {
  await deleteDoc(doc(db, 'locations', locationId))
}
