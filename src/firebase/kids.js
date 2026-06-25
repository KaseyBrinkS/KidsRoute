import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore'
import { db } from './db'
import { DEFAULT_SCHOOL, SCHOOLS } from './schools'
import { syncChildColorKeyToWalkGroups } from './walkGroups'

export { DEFAULT_SCHOOL, SCHOOLS }

export const GRADES = ['K', '1', '2', '3', '4', '5']

function kidsCollection(userId) {
  return collection(db, 'users', userId, 'children')
}

export async function getKid(userId, kidId) {
  const snapshot = await getDoc(doc(db, 'users', userId, 'children', kidId))
  if (!snapshot.exists()) return null
  return { id: snapshot.id, ...snapshot.data() }
}

export function subscribeToKids(userId, onData, onError) {
  const kidsQuery = query(kidsCollection(userId), orderBy('createdAt', 'desc'))
  return onSnapshot(
    kidsQuery,
    (snapshot) => {
      const kids = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      }))
      onData(kids)
    },
    onError,
  )
}

export function addKid(userId, { firstName, grade, school, colorKey }) {
  const payload = {
    firstName: firstName.trim(),
    grade,
    school,
    createdAt: serverTimestamp(),
  }
  if (typeof colorKey === 'number') {
    payload.colorKey = colorKey
  }
  return addDoc(kidsCollection(userId), payload)
}

export async function updateKid(userId, kidId, { firstName, grade, school, colorKey }) {
  const payload = {
    firstName: firstName.trim(),
    grade,
    school,
    updatedAt: serverTimestamp(),
  }
  if (typeof colorKey === 'number') {
    payload.colorKey = colorKey
  }
  await updateDoc(doc(db, 'users', userId, 'children', kidId), payload)

  if (typeof colorKey === 'number') {
    await syncChildColorKeyToWalkGroups(userId, kidId, colorKey)
  }
}

export function deleteKid(userId, kidId) {
  return deleteDoc(doc(db, 'users', userId, 'children', kidId))
}
