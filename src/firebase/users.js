import { doc, getDoc, onSnapshot, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore'
import { db } from './db'

export const DEFAULT_SCHOOL = 'PS 150'

export const DEFAULT_USER_SETTINGS = {
  phoneNumber: '',
  emailNotifications: true,
  smsNotifications: false,
  matchingOptOut: false,
  school: DEFAULT_SCHOOL,
}

export function userProfileRef(userId) {
  return doc(db, 'users', userId)
}

export function normalizeUserProfile(data) {
  return {
    ...DEFAULT_USER_SETTINGS,
    ...data,
  }
}

export async function saveUserProfile(user) {
  if (!user) return

  await setDoc(
    userProfileRef(user.uid),
    {
      email: user.email ?? '',
      displayName: user.displayName ?? '',
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  )
}

export function subscribeToUserProfile(userId, onData, onError) {
  return onSnapshot(
    userProfileRef(userId),
    (snapshot) => {
      if (!snapshot.exists()) {
        onData({ ...DEFAULT_USER_SETTINGS })
        return
      }
      onData(normalizeUserProfile(snapshot.data()))
    },
    onError,
  )
}

export async function getUserProfile(userId) {
  const snapshot = await getDoc(userProfileRef(userId))
  return snapshot.exists() ? normalizeUserProfile(snapshot.data()) : { ...DEFAULT_USER_SETTINGS }
}

export async function updateUserProfile(userId, fields) {
  await setDoc(
    userProfileRef(userId),
    {
      ...fields,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  )
}
