import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore'
import { db } from './db'

export const GRADES = ['K', '1', '2', '3', '4', '5']
export const SCHOOLS = ['PS 150']

function kidsCollection(userId) {
  return collection(db, 'users', userId, 'children')
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

export function addKid(userId, { firstName, grade, school }) {
  return addDoc(kidsCollection(userId), {
    firstName: firstName.trim(),
    grade,
    school,
    createdAt: serverTimestamp(),
  })
}

export function updateKid(userId, kidId, { firstName, grade, school }) {
  return updateDoc(doc(db, 'users', userId, 'children', kidId), {
    firstName: firstName.trim(),
    grade,
    school,
    updatedAt: serverTimestamp(),
  })
}

export function deleteKid(userId, kidId) {
  return deleteDoc(doc(db, 'users', userId, 'children', kidId))
}
