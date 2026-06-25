import {
  addDoc,
  collection,
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
import { ACCOUNT_STATUS } from './accessControl'

/**
 * Set VITE_ADMIN_UID in .env.local to your Firebase Auth UID
 * (Firebase Console → Authentication → Users → copy User UID).
 */
export const ADMIN_UID = import.meta.env.VITE_ADMIN_UID ?? ''

export function isAdmin(userId) {
  return Boolean(ADMIN_UID) && userId === ADMIN_UID
}

export function subscribeToPendingAccounts(onData, onError) {
  const pendingQuery = query(
    collection(db, 'users'),
    where('accountStatus', '==', ACCOUNT_STATUS.PENDING),
  )

  return onSnapshot(
    pendingQuery,
    (snapshot) => {
      const accounts = snapshot.docs
        .map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        }))
        .sort((a, b) => {
          const aTime = a.createdAt?.seconds ?? a.updatedAt?.seconds ?? 0
          const bTime = b.createdAt?.seconds ?? b.updatedAt?.seconds ?? 0
          return bTime - aTime
        })
      onData(accounts)
    },
    onError,
  )
}

export async function approveAccount(userId) {
  await updateDoc(doc(db, 'users', userId), {
    accountStatus: ACCOUNT_STATUS.APPROVED,
    approvedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })

  await addDoc(collection(db, 'users', userId, 'notifications'), {
    type: 'account_approved',
    message: 'Your account has been approved! You can now set up your family and join walk groups.',
    read: false,
    createdAt: serverTimestamp(),
  })
}

export async function rejectAccount(userId) {
  await updateDoc(doc(db, 'users', userId), {
    accountStatus: ACCOUNT_STATUS.REJECTED,
    rejectedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
}

export async function ensureDefaultInviteCode(code = 'PS150FALL26') {
  const normalized = code.trim().toUpperCase()
  const codeRef = doc(db, 'inviteCodes', normalized)
  const snapshot = await getDoc(codeRef)

  if (snapshot.exists()) {
    if (snapshot.data().active !== false) return { created: false, code: normalized }
    await updateDoc(codeRef, { active: true, updatedAt: serverTimestamp() })
    return { created: false, reactivated: true, code: normalized }
  }

  await setDoc(codeRef, {
    code: normalized,
    active: true,
    createdAt: serverTimestamp(),
  })
  return { created: true, code: normalized }
}
