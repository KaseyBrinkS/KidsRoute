import { doc, serverTimestamp, updateDoc } from 'firebase/firestore'
import { db } from './db'
import { formatSharedContactPhone } from '../utils/contactInfo'
import { getUserProfile } from './users'

function groupDocumentRef(group) {
  if (!group?.id) throw new Error('Group not found.')
  if (group.source === 'walkGroup') return doc(db, 'walkGroups', group.id)
  return doc(db, 'matches', group.id)
}

export function isGroupPhoneShared(group, userId) {
  if (!group || !userId) return false
  return group.phoneSharing?.[userId] === true
}

export async function setGroupPhoneSharing(groupId, userId, shared, group) {
  if (!groupId || !userId || !group) throw new Error('Missing group context.')

  const profile = await getUserProfile(userId)
  const phone = formatSharedContactPhone(profile?.phoneNumber)

  if (shared && phone === 'Not provided') {
    throw new Error('Add a phone number in Settings before sharing with this group.')
  }

  const phoneSharing = { ...(group.phoneSharing ?? {}), [userId]: shared }
  const updates = {
    phoneSharing,
    updatedAt: serverTimestamp(),
  }

  if (shared) {
    updates.parties = (group.parties ?? []).map((party) =>
      party.userId === userId
        ? { ...party, contactPhone: phone, parentName: party.parentName || profile.displayName || 'Parent' }
        : party,
    )
  }

  await updateDoc(groupDocumentRef({ ...group, id: groupId }), updates)
}
