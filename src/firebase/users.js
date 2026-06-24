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

export function needsOnboarding(profile) {
  return profile?.welcomeCompleted === false
}

/** @deprecated use needsOnboarding */
export const needsWelcome = needsOnboarding

export function getOnboardingRedirectPath(profile) {
  if (!needsOnboarding(profile)) return null
  const step = profile.onboardingStep ?? 1
  const paths = {
    1: '/welcome',
    2: '/onboarding/kids',
    3: '/onboarding/details',
    4: '/onboarding/activity',
  }
  return paths[step] ?? '/welcome'
}

export async function advanceOnboardingStep(userId, step) {
  await updateUserProfile(userId, { onboardingStep: step })
}

export async function completeOnboarding(userId) {
  await updateUserProfile(userId, { welcomeCompleted: true, onboardingStep: 4 })
}

/** @deprecated use completeOnboarding */
export const completeWelcome = completeOnboarding

export async function getPostLoginPath(userId) {
  const profile = await getUserProfile(userId)
  return getOnboardingRedirectPath(profile) ?? '/dashboard'
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
        onboardingStep: 1,
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
