import {
  addDoc,
  collection,
  doc,
  getDoc,
  runTransaction,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore'
import { db } from './db'
import { getApprovalFamilyIds } from './groupLeaders'
import { countWalkGroupFamilies, isWalkGroupDocument } from './walkGroups'

function generateId() {
  return crypto.randomUUID()
}

async function createUserNotification(userId, notification) {
  await addDoc(collection(db, 'users', userId, 'notifications'), {
    ...notification,
    read: false,
    createdAt: serverTimestamp(),
  })
}

async function loadWalkGroup(groupId) {
  const snapshot = await getDoc(doc(db, 'walkGroups', groupId))
  if (!snapshot.exists()) return null
  return { id: snapshot.id, ...snapshot.data() }
}

export function getMeetingPointProposals(group) {
  return group?.meetingPointProposals ?? []
}

export function getConfirmedMeetingPoint(group) {
  const point = group?.meetingPoint
  if (!point?.location) return null
  return point
}

export function getPendingMeetingPointProposals(group) {
  return getMeetingPointProposals(group).filter(
    (proposal) => proposal.status === 'pending_approval',
  )
}

function isFullyApproved(group, proposal) {
  const familyIds = getApprovalFamilyIds(group)
  return familyIds.every((id) => proposal.approvals?.[id] === 'approved')
}

export function walkGroupCanProposeMeetingPoint(group) {
  if (!isWalkGroupDocument(group)) return false
  if (group.status !== 'active') return false
  return countWalkGroupFamilies(group) >= 2
}

export function shouldShowMeetingPointUI(group, userId) {
  if (!isWalkGroupDocument(group) || !userId) return false

  const familyIds = getApprovalFamilyIds(group)
  if (!familyIds.includes(userId)) return false

  if (getConfirmedMeetingPoint(group)) return true
  if (getPendingMeetingPointForUser(group, userId).length > 0) return true
  if (
    getPendingMeetingPointProposals(group).some((proposal) => proposal.proposedBy === userId)
  ) {
    return true
  }

  return walkGroupCanProposeMeetingPoint(group)
}

export function getPendingMeetingPointForUser(group, userId) {
  const familyIds = getApprovalFamilyIds(group)
  if (!familyIds.includes(userId)) return []

  return getPendingMeetingPointProposals(group).filter((proposal) => {
    if (proposal.proposedBy === userId) return false
    return !proposal.approvals?.[userId]
  })
}

export function formatMeetingPointProposalMessage(proposal) {
  return `${proposal.proposerName} proposed a meeting point: ${proposal.location}. Approve?`
}

export async function proposeMeetingPoint(groupId, userId, location, proposerName) {
  const trimmed = location?.trim()
  if (!trimmed) throw new Error('Enter a meeting point description.')

  const group = await loadWalkGroup(groupId)
  if (!group) throw new Error('Group not found.')

  if (!walkGroupCanProposeMeetingPoint(group)) {
    throw new Error('Meeting points can be set once at least two families have joined the group.')
  }

  const familyIds = getApprovalFamilyIds(group)
  if (!familyIds.includes(userId)) {
    throw new Error('You must be a group member to propose a meeting point.')
  }

  const now = new Date().toISOString()
  const clearedProposals = getMeetingPointProposals(group).map((proposal) =>
    proposal.status === 'pending_approval'
      ? { ...proposal, status: 'rejected', updatedAt: now }
      : proposal,
  )

  const proposal = {
    id: generateId(),
    location: trimmed,
    proposedBy: userId,
    proposerName: proposerName?.trim() || 'A parent',
    status: 'pending_approval',
    approvals: { [userId]: 'approved' },
    createdAt: now,
    updatedAt: now,
  }

  await updateDoc(doc(db, 'walkGroups', groupId), {
    meetingPointProposals: [...clearedProposals, proposal],
    updatedAt: serverTimestamp(),
  })

  const otherFamilies = familyIds.filter((id) => id !== userId)
  await Promise.all(
    otherFamilies.map((memberId) =>
      createUserNotification(memberId, {
        type: 'meeting_point_proposed',
        groupId,
        proposalId: proposal.id,
        message: formatMeetingPointProposalMessage(proposal),
      }),
    ),
  )

  return proposal
}

export async function respondToMeetingPointProposal(groupId, userId, proposalId, response) {
  if (!['approved', 'declined'].includes(response)) {
    throw new Error('Invalid response.')
  }

  const groupRef = doc(db, 'walkGroups', groupId)

  const result = await runTransaction(db, async (transaction) => {
    const groupSnap = await transaction.get(groupRef)
    if (!groupSnap.exists()) throw new Error('Group not found.')

    const group = groupSnap.data()
    const familyIds = getApprovalFamilyIds({ ...group, id: groupId })
    if (!familyIds.includes(userId)) {
      throw new Error('You are not a member of this group.')
    }

    const proposals = getMeetingPointProposals(group)
    const index = proposals.findIndex((proposal) => proposal.id === proposalId)
    if (index === -1) throw new Error('Meeting point proposal not found.')

    const proposal = { ...proposals[index] }
    if (proposal.status !== 'pending_approval') {
      throw new Error('This proposal is no longer pending.')
    }

    proposal.approvals = { ...proposal.approvals, [userId]: response }
    proposal.updatedAt = new Date().toISOString()

    if (response === 'declined') {
      proposal.status = 'rejected'
      proposals[index] = proposal
      transaction.update(groupRef, {
        meetingPointProposals: proposals,
        updatedAt: serverTimestamp(),
      })
      return { type: 'rejected', proposal }
    }

    if (isFullyApproved({ ...group, id: groupId }, proposal)) {
      proposal.status = 'confirmed'
      proposals[index] = proposal

      transaction.update(groupRef, {
        meetingPointProposals: proposals,
        meetingPoint: {
          location: proposal.location,
          proposalId: proposal.id,
          confirmedAt: new Date().toISOString(),
        },
        updatedAt: serverTimestamp(),
      })

      return { type: 'confirmed', proposal }
    }

    proposals[index] = proposal
    transaction.update(groupRef, {
      meetingPointProposals: proposals,
      updatedAt: serverTimestamp(),
    })
    return { type: 'pending', proposal }
  })

  if (result.type === 'rejected' && result.proposal.proposedBy) {
    await createUserNotification(result.proposal.proposedBy, {
      type: 'meeting_point_rejected',
      groupId,
      proposalId,
      message: `Your meeting point proposal was declined: "${result.proposal.location}"`,
    })
  }

  if (result.type === 'confirmed') {
    const familyIds = getApprovalFamilyIds(await loadWalkGroup(groupId))
    await Promise.all(
      familyIds.map((memberId) =>
        createUserNotification(memberId, {
          type: 'meeting_point_confirmed',
          groupId,
          proposalId,
          message: `Meeting point confirmed: ${result.proposal.location}`,
        }),
      ),
    )
  }

  return result
}
