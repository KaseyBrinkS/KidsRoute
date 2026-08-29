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
    where('accountStatus', 'in', [ACCOUNT_STATUS.PENDING, ACCOUNT_STATUS.NEEDS_INVITE]),
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
