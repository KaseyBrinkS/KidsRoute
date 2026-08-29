import { collection, onSnapshot } from 'firebase/firestore'
import { db } from './db'

/**
 * Set VITE_ADMIN_UID in .env.local to your Firebase Auth UID
 * (Firebase Console → Authentication → Users → copy User UID).
 */
export const ADMIN_UID = import.meta.env.VITE_ADMIN_UID ?? ''

export function isAdmin(userId) {
  return Boolean(ADMIN_UID) && userId === ADMIN_UID
}

export function subscribeToAllAccounts(onData, onError) {
  return onSnapshot(
    collection(db, 'users'),
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

function formatAccountStatus(status) {
  if (!status) return 'Active'
  return status.replace(/_/g, ' ')
}

export { formatAccountStatus }
