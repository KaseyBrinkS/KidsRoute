import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore'
import { db } from './db'
import { ACCOUNT_STATUS } from './accessControl'
import { getUserProfile } from './users'
import {
  resolveWalkGroupParticipantIds,
  walkGroupIsDeclinedForUser,
  walkGroupUserHasAccepted,
} from './walkGroups'

export const LEADER_ROLES = {
  parent: 'Parent',
  nanny: 'Nanny',
  older_student: 'Older Student',
}

export const EXTERNAL_LEADER_ROLES = ['nanny', 'older_student']

function generateId() {
  return crypto.randomUUID()
}

function generateInviteToken() {
  return crypto.randomUUID().replace(/-/g, '')
}

export function getGroupLeaders(group) {
  return group?.groupLeaders ?? []
}

export function getActiveLeaders(group) {
  return getGroupLeaders(group).filter((leader) => leader.status === 'active')
}

export function getPendingLeaderProposals(group) {
  return getGroupLeaders(group).filter((leader) => leader.status === 'pending_approval')
}

export function getApprovalFamilyIds(group) {
  const ids = resolveWalkGroupParticipantIds(group)
  if (ids.length > 0) return ids
  return [...new Set(group?.participantIds ?? [])]
}

export function isUserActiveLeader(group, userId) {
  if (!group || !userId) return false

  if (group.source === 'walkGroup') {
    if (walkGroupIsDeclinedForUser(group, userId)) return false
    return resolveWalkGroupParticipantIds(group).includes(userId)
  }

  if ((group.leaderUserIds ?? []).includes(userId)) return true
  return getActiveLeaders(group).some((leader) => leader.userId === userId)
}

export function userHasVolunteeredAsParentLeader(group, userId) {
  return getActiveLeaders(group).some(
    (leader) => leader.userId === userId && leader.role === 'parent',
  )
}

export function getLeaderRecord(group, leaderId) {
  return getGroupLeaders(group).find((leader) => leader.id === leaderId) ?? null
}

function isFullyApproved(group, leader) {
  const familyIds = getApprovalFamilyIds(group)
  return familyIds.every((id) => leader.approvals?.[id] === 'approved')
}

function hasDecline(leader) {
  return Object.values(leader.approvals ?? {}).some((value) => value === 'declined')
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

function buildLeaderUserIds(leaders) {
  return [
    ...new Set(
      leaders
        .filter((leader) => leader.status === 'active' && leader.userId)
        .map((leader) => leader.userId),
    ),
  ]
}

/** All user IDs who can lead this group: participants + active leader records. */
export function resolveLeaderUserIds(group) {
  const storedParticipantIds = group.participantIds ?? []
  const partyUserIds = [
    ...new Set(
      (group.parties ?? [])
        .filter((party) => party.response !== 'declined')
        .map((party) => party.userId),
    ),
  ]
  const resolvedParticipantIds = resolveWalkGroupParticipantIds(group)
  const fromLeaders = buildLeaderUserIds(getGroupLeaders(group))

  return [
    ...new Set([
      ...storedParticipantIds,
      ...partyUserIds,
      ...resolvedParticipantIds,
      ...fromLeaders,
      ...(group.leaderUserIds ?? []),
    ]),
  ].filter(Boolean)
}

export async function repairLeaderUserIdsForUser(userId) {
  if (!userId) return

  const snapshot = await getDocs(
    query(collection(db, 'walkGroups'), where('participantIds', 'array-contains', userId)),
  )

  await Promise.all(
    snapshot.docs.map(async (docSnap) => {
      const group = { id: docSnap.id, ...docSnap.data() }
      const merged = resolveLeaderUserIds(group)
      const stored = group.leaderUserIds ?? []

      if (
        merged.length === stored.length &&
        merged.every((id) => stored.includes(id))
      ) {
        return
      }

      await updateDoc(docSnap.ref, {
        leaderUserIds: merged,
        updatedAt: serverTimestamp(),
      })
    }),
  )
}

export function ensureParentLeaderOnGroup(group, userId, { displayName, phoneNumber } = {}) {
  const leaders = getGroupLeaders(group)
  const activeLeader = leaders.find(
    (leader) => leader.userId === userId && leader.status === 'active',
  )
  if (activeLeader) {
    return {
      groupLeaders: leaders,
      leaderUserIds: resolveLeaderUserIds(group),
    }
  }

  const leaderRecord = {
    id: generateId(),
    userId,
    role: 'parent',
    name: displayName || 'Parent',
    phone: phoneNumber || '',
    status: 'active',
    proposedBy: null,
    approvals: null,
    inviteToken: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }

  const updatedLeaders = [
    ...leaders.filter((leader) => !(leader.userId === userId && leader.role === 'parent')),
    leaderRecord,
  ]

  return {
    groupLeaders: updatedLeaders,
    leaderUserIds: resolveLeaderUserIds({
      ...group,
      groupLeaders: updatedLeaders,
    }),
  }
}

export async function volunteerAsParentLeader(groupId, userId) {
  const profile = await getUserProfile(userId)
  const group = await loadWalkGroup(groupId)
  if (!group) throw new Error('Group not found.')

  const familyIds = getApprovalFamilyIds(group)
  if (!familyIds.includes(userId)) {
    throw new Error('You must be a group member to volunteer as leader.')
  }

  const { groupLeaders, leaderUserIds } = ensureParentLeaderOnGroup(group, userId, {
    displayName: profile.displayName || 'Parent',
    phoneNumber: profile.phoneNumber || '',
  })

  if (isUserActiveLeader(group, userId)) {
    return
  }

  await updateDoc(doc(db, 'walkGroups', groupId), {
    groupLeaders,
    leaderUserIds,
    updatedAt: serverTimestamp(),
  })
}

export async function proposeExternalLeader(groupId, proposedBy, { name, phone, role }) {
  const trimmedName = name?.trim()
  const trimmedPhone = phone?.trim()
  if (!trimmedName) throw new Error('Enter the leader’s name.')
  if (!trimmedPhone) throw new Error('Enter the leader’s phone number.')
  if (!EXTERNAL_LEADER_ROLES.includes(role)) {
    throw new Error('Select a valid leader role.')
  }

  const group = await loadWalkGroup(groupId)
  if (!group) throw new Error('Group not found.')

  const familyIds = getApprovalFamilyIds(group)
  if (!familyIds.includes(proposedBy)) {
    throw new Error('You must be a group member to propose a leader.')
  }

  const approvals = { [proposedBy]: 'approved' }

  const leaderRecord = {
    id: generateId(),
    userId: null,
    role,
    name: trimmedName,
    phone: trimmedPhone,
    status: 'pending_approval',
    proposedBy,
    approvals,
    inviteToken: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }

  const updatedLeaders = [...getGroupLeaders(group), leaderRecord]

  await updateDoc(doc(db, 'walkGroups', groupId), {
    groupLeaders: updatedLeaders,
    updatedAt: serverTimestamp(),
  })

  const otherFamilies = familyIds.filter((id) => id !== proposedBy)
  await Promise.all(
    otherFamilies.map((userId) =>
      createUserNotification(userId, {
        type: 'leader_proposed',
        groupId,
        leaderId: leaderRecord.id,
        message: `${trimmedName} has been proposed as a Walk Leader. Approve?`,
      }),
    ),
  )
}

export async function respondToLeaderProposal(groupId, userId, leaderId, response) {
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

    const leaders = getGroupLeaders(group)
    const index = leaders.findIndex((leader) => leader.id === leaderId)
    if (index === -1) throw new Error('Leader proposal not found.')

    const leader = { ...leaders[index] }
    if (leader.status !== 'pending_approval') {
      throw new Error('This proposal is no longer pending.')
    }

    leader.approvals = { ...leader.approvals, [userId]: response }
    leader.updatedAt = new Date().toISOString()

    if (response === 'declined') {
      leader.status = 'rejected'
      leaders[index] = leader
      transaction.update(groupRef, {
        groupLeaders: leaders,
        updatedAt: serverTimestamp(),
      })
      return { type: 'rejected', leader }
    }

    if (isFullyApproved({ ...group, id: groupId }, leader)) {
      const inviteToken = generateInviteToken()
      leader.status = 'active'
      leader.inviteToken = inviteToken
      leaders[index] = leader

      transaction.update(groupRef, {
        groupLeaders: leaders,
        leaderUserIds: buildLeaderUserIds(leaders),
        updatedAt: serverTimestamp(),
      })

      transaction.set(doc(db, 'leaderInvites', inviteToken), {
        groupId,
        leaderId: leader.id,
        name: leader.name,
        phone: leader.phone,
        role: leader.role,
        status: 'pending',
        claimedBy: null,
        createdAt: serverTimestamp(),
      })

      return { type: 'approved', leader, inviteToken }
    }

    leaders[index] = leader
    transaction.update(groupRef, {
      groupLeaders: leaders,
      updatedAt: serverTimestamp(),
    })
    return { type: 'pending', leader }
  })

  if (result.type === 'rejected' && result.leader.proposedBy) {
    await createUserNotification(result.leader.proposedBy, {
      type: 'leader_rejected',
      groupId,
      leaderId,
      message: `${result.leader.name} was not approved as Walk Leader. The request was declined.`,
    })
  }

  if (result.type === 'approved' && result.leader.proposedBy) {
    await createUserNotification(result.leader.proposedBy, {
      type: 'leader_approved',
      groupId,
      leaderId,
      inviteToken: result.inviteToken,
      message: `${result.leader.name} was approved as Walk Leader. Share the invite link so they can sign in.`,
    })
  }

  return result
}

export async function claimLeaderInvite(token, userId) {
  if (!token || !userId) return null

  const inviteRef = doc(db, 'leaderInvites', token)
  const inviteSnap = await getDoc(inviteRef)
  if (!inviteSnap.exists()) throw new Error('Invite link is invalid or expired.')

  const invite = inviteSnap.data()
  if (invite.status === 'claimed' && invite.claimedBy !== userId) {
    throw new Error('This invite link has already been used.')
  }
  if (invite.status === 'claimed' && invite.claimedBy === userId) {
    return invite
  }

  const groupRef = doc(db, 'walkGroups', invite.groupId)

  await runTransaction(db, async (transaction) => {
    const [freshInviteSnap, groupSnap] = await Promise.all([
      transaction.get(inviteRef),
      transaction.get(groupRef),
    ])

    if (!freshInviteSnap.exists()) throw new Error('Invite link is invalid or expired.')
    const freshInvite = freshInviteSnap.data()
    if (freshInvite.status === 'claimed') {
      throw new Error('This invite link has already been used.')
    }
    if (!groupSnap.exists()) throw new Error('Group not found.')

    const leaders = getGroupLeaders(groupSnap.data())
    const index = leaders.findIndex((leader) => leader.id === freshInvite.leaderId)
    if (index === -1) throw new Error('Leader record not found.')

    const leader = { ...leaders[index], userId, updatedAt: new Date().toISOString() }
    leaders[index] = leader

    transaction.update(groupRef, {
      groupLeaders: leaders,
      leaderUserIds: buildLeaderUserIds(leaders),
      updatedAt: serverTimestamp(),
    })

    transaction.update(inviteRef, {
      status: 'claimed',
      claimedBy: userId,
      claimedAt: serverTimestamp(),
    })
  })

  return invite
}

export async function syncLeaderProfileFromInvite(userId, invite) {
  if (!invite) return
  await setDoc(
    doc(db, 'users', userId),
    {
      accountType: 'external_leader',
      leaderName: invite.name,
      leaderPhone: invite.phone,
      leaderRole: invite.role,
      displayName: invite.name,
      phoneNumber: invite.phone,
      inviteCodeVerified: true,
      accountStatus: ACCOUNT_STATUS.APPROVED,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  )
}

export function subscribeToLeaderWalkGroups(userId, onData, onError) {
  if (!userId) {
    onData([])
    return () => {}
  }

  return onSnapshot(
    query(collection(db, 'walkGroups'), where('participantIds', 'array-contains', userId)),
    (snapshot) => {
      const groups = snapshot.docs
        .map((docSnap) => ({ id: docSnap.id, source: 'walkGroup', ...docSnap.data() }))
        .filter((group) => {
          if (walkGroupIsDeclinedForUser(group, userId)) return false
          if (!resolveWalkGroupParticipantIds(group).includes(userId)) return false
          return walkGroupUserHasAccepted(group, userId)
        })
      onData(groups)
    },
    onError,
  )
}

export function subscribeToUserNotifications(userId, onData, onError) {
  if (!userId) {
    onData([])
    return () => {}
  }

  return onSnapshot(
    query(collection(db, 'users', userId, 'notifications')),
    (snapshot) => {
      onData(
        snapshot.docs
          .map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))
          .sort((a, b) => {
            const aTime = a.createdAt?.toMillis?.() ?? 0
            const bTime = b.createdAt?.toMillis?.() ?? 0
            return bTime - aTime
          }),
      )
    },
    onError,
  )
}

export async function markNotificationRead(userId, notificationId) {
  await updateDoc(doc(db, 'users', userId, 'notifications', notificationId), { read: true })
}

export function getLeaderInviteUrl(token) {
  if (typeof window === 'undefined') return `/login?invite=${token}`
  return `${window.location.origin}/login?invite=${token}`
}

export function groupCanBeLed(group) {
  if (!group || group.source !== 'walkGroup') return false
  return group.status === 'active'
}

export function userCanVolunteerAsLeader(group, userId) {
  if (!groupCanBeLed(group)) return false
  const familyIds = getApprovalFamilyIds(group)
  return familyIds.includes(userId) && !userHasVolunteeredAsParentLeader(group, userId)
}

export function getPendingProposalForUser(group, userId) {
  return getPendingLeaderProposals(group).filter((leader) => {
    const familyIds = getApprovalFamilyIds(group)
    if (!familyIds.includes(userId)) return false
    if (leader.proposedBy === userId) return false
    return !leader.approvals?.[userId]
  })
}
