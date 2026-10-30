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
import { DEFAULT_SCHOOL, SCHOOLS as DEFAULT_SCHOOLS } from './schools'

function schoolDocId(name) {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

export function isCommunitySchoolVisible(docSnap) {
  if (docSnap.isCommunity === false) return true
  if (!docSnap.isCommunity) return true
  const status = docSnap.status
  return !status || status === 'approved'
}

export function mergeSchoolOptions(communityDocs = []) {
  const defaults = DEFAULT_SCHOOLS.map((name) => ({
    name,
    isCommunity: false,
    isDefault: true,
  }))

  const defaultNames = new Set(DEFAULT_SCHOOLS)
  const community = communityDocs
    .filter(isCommunitySchoolVisible)
    .map((docSnap) => ({
      name: docSnap.name?.trim() ?? '',
      isCommunity: docSnap.isCommunity !== false,
      isDefault: false,
    }))
    .filter((entry) => entry.name && !defaultNames.has(entry.name))
    .sort((a, b) => a.name.localeCompare(b.name))

  return [...defaults, ...community]
}

export function allSchoolNames(options) {
  return options.map((option) => option.name)
}

export function subscribeToSchools(onData, onError) {
  return onSnapshot(
    collection(db, 'schools'),
    (snapshot) => {
      const docs = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      }))
      onData(mergeSchoolOptions(docs))
    },
    onError,
  )
}

export function subscribeToPendingSchools(onData, onError) {
  return onSnapshot(
    query(collection(db, 'schools'), where('status', '==', 'pending')),
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

export async function registerCommunitySchool(name, submittedBy = null) {
  const trimmed = name?.trim()
  if (!trimmed || DEFAULT_SCHOOLS.includes(trimmed)) return

  const id = schoolDocId(trimmed)
  if (!id) return

  const ref = doc(db, 'schools', id)
  const existing = await getDoc(ref)
  if (existing.exists()) return

  await setDoc(ref, {
    name: trimmed,
    isCommunity: true,
    isDefault: false,
    status: 'pending',
    submittedBy: submittedBy ?? null,
    createdAt: serverTimestamp(),
  })
}

export async function approveCommunitySchool(schoolId) {
  const ref = doc(db, 'schools', schoolId)
  await updateDoc(ref, {
    status: 'approved',
    verifiedAt: serverTimestamp(),
  })
}

export async function rejectCommunitySchool(schoolId) {
  await deleteDoc(doc(db, 'schools', schoolId))
}

export { DEFAULT_SCHOOL, DEFAULT_SCHOOLS }
