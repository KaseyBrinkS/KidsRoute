import { doc, getDoc } from 'firebase/firestore'
import { db } from './db'
import { ACCOUNT_STATUS } from './accessControl'
import { updateUserProfile } from './users'

export const INVITE_CODE_INVALID_MESSAGE =
  'This app is currently invite-only. Please contact your school coordinator for an access code.'

function normalizeInviteCode(code) {
  return code.trim().toUpperCase()
}

export async function verifyInviteCode(userId, code) {
  const normalized = normalizeInviteCode(code)
  if (!normalized) {
    throw new Error(INVITE_CODE_INVALID_MESSAGE)
  }

  const codeRef = doc(db, 'inviteCodes', normalized)
  const snapshot = await getDoc(codeRef)

  if (!snapshot.exists() || snapshot.data().active === false) {
    throw new Error(INVITE_CODE_INVALID_MESSAGE)
  }

  await updateUserProfile(userId, {
    inviteCodeVerified: true,
    accountStatus: ACCOUNT_STATUS.PENDING,
    inviteCodeUsed: normalized,
  })
}
