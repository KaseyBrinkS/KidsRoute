import { doc, getDoc, onSnapshot, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore'
import { db } from './db'
import { ACCOUNT_STATUS } from './accessControl'

import { DEFAULT_SCHOOL } from './schools'

export { DEFAULT_SCHOOL }

export const DEFAULT_USER_SETTINGS = {
  phoneNumber: '',
  streetNumber: '',
  streetName: '',
  zipCode: '',
  emailNotifications: false,
  smsNotifications: true,
  matchingOptOut: false,
  school: DEFAULT_SCHOOL,
  schoolConfirmed: false,
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

export function hasCompletedBasicSetup(profile, kidCount = 0) {
  return Boolean(profile?.phoneNumber?.trim()) && kidCount >= 1
}

export function isSetupComplete(profile) {
  return profile?.welcomeCompleted === true
}

export function needsOnboarding(profile, kidCount = 0) {
  return !isSetupComplete(profile) && !hasCompletedBasicSetup(profile, kidCount)
}

/** @deprecated use needsOnboarding */
export const needsWelcome = needsOnboarding

export function shouldShowSetupReminder(profile, kidCount = 0) {
  return !hasCompletedBasicSetup(profile, kidCount)
}

export function getOnboardingRedirectPath(profile) {
  if (profile && isSetupComplete(profile)) return null
  const step = profile?.onboardingStep ?? 1
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

const LEGACY_ROUTE_REDIRECTS = {
  '/dashboard': '/home',
  '/my-activities': '/schedule',
  '/groups': '/matches',
  '/history': '/home',
}

/** Normalize legacy bookmarks and stored paths to the current app routes. */
export function normalizeAppPath(path) {
  if (!path || typeof path !== 'string') return '/home'
  const base = path.split('?')[0].split('#')[0]
  return LEGACY_ROUTE_REDIRECTS[base] ?? path
}

export async function getPostLoginPath(userId) {
  const profile = await getUserProfile(userId)
  if (profile.accountType === 'external_leader') return '/leader'
  return '/home'
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
        accountStatus: ACCOUNT_STATUS.APPROVED,
        createdAt: serverTimestamp(),
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
        onData({ ...DEFAULT_USER_SETTINGS, _profileExists: false })
        return
      }
      onData({ ...normalizeUserProfile(snapshot.data()), _profileExists: true })
    },
    onError,
  )
}

export async function getUserProfile(userId) {
  const snapshot = await getDoc(userProfileRef(userId))
  if (!snapshot.exists()) {
    return { ...DEFAULT_USER_SETTINGS, _profileExists: false }
  }
  return { ...normalizeUserProfile(snapshot.data()), _profileExists: true }
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
