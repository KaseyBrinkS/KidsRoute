import { doc, getDoc, serverTimestamp, updateDoc } from 'firebase/firestore'
import { db } from './db'
import { getApprovalFamilyIds } from './groupLeaders'

const MAX_NOTE_LENGTH = 280

export function getGroupNote(group) {
  const note = group?.groupNote
  if (!note?.text?.trim()) return null
  return note
}

export async function updateGroupNote(groupId, userId, text, editorName) {
  const trimmed = text?.trim() ?? ''
  if (trimmed.length > MAX_NOTE_LENGTH) {
    throw new Error(`Notes must be ${MAX_NOTE_LENGTH} characters or fewer.`)
  }

  const groupRef = doc(db, 'walkGroups', groupId)
  const snapshot = await getDoc(groupRef)
  if (!snapshot.exists()) throw new Error('Group not found.')

  const group = snapshot.data()
  const familyIds = getApprovalFamilyIds({ ...group, id: groupId })
  if (!familyIds.includes(userId)) {
    throw new Error('You must be a group member to update the note.')
  }

  if (!trimmed) {
    await updateDoc(groupRef, {
      groupNote: null,
      updatedAt: serverTimestamp(),
    })
    return null
  }

  const groupNote = {
    text: trimmed,
    updatedAt: new Date().toISOString(),
    updatedBy: userId,
    updatedByName: editorName?.trim() || 'A parent',
  }

  await updateDoc(groupRef, {
    groupNote,
    updatedAt: serverTimestamp(),
  })

  return groupNote
}
