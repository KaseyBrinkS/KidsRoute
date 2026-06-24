import { doc, getDoc, onSnapshot, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore'
import { db } from './db'

export const DEFAULT_SCHOOL = 'PS 150'

export const DEFAULT_USER_SETTINGS = {
  phoneNumber: '',
  streetNumber: '',
  streetName: '',
  zipCode: '',
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

export function needsWelcome(profile) {
  return profile?.welcomeCompleted === false
}

export async function completeWelcome(userId) {
  await updateUserProfile(userId, { welcomeCompleted: true })
}

export async function getPostLoginPath(userId) {
  const profile = await getUserProfile(userId)
  return needsWelcome(profile) ? '/welcome' : '/dashboard'
}

export async function saveUserProfile(user) {
  if (!user) return

  const ref = userProfileRef(user.uid)
  const existing = await getDoc(ref)
  const payload = {
    email: user.email ?? '',
    displayName: user.displayName ?? '',
    updatedAt: serverTimestamp(),
  }

  if (!existing.exists()) {
    await setDoc(
      ref,
      {
        ...DEFAULT_USER_SETTINGS,
        ...payload,
        welcomeCompleted: false,
      },
      { merge: true },
    )
    return
  }

  await setDoc(ref, payload, { merge: true })
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
