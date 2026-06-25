import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore'
import { db } from './db'
import { ensureParentLeaderOnGroup, resolveLeaderUserIds } from './groupLeaders'
import { getActiveSession } from './groupWalk'
import { MATCH_WINDOW_MINUTES, timesWithinWindow } from './matching'
import { defaultSessions } from './sessions'
import { getUserProfile } from './users'
import { getKid } from './kids'

export const MAX_WALK_GROUP_FAMILIES = 20

const DEBUG_WALK_GROUPS = true

function debugLog(...args) {
  if (DEBUG_WALK_GROUPS) {
    console.log('[walkGroups]', ...args)
  }
}

function partyScheduleFields(source) {
  return {
    days: source.days ?? [],
    sessions: source.sessions ?? defaultSessions(),
    summerStartDate: source.summerStartDate ?? null,
    summerEndDate: source.summerEndDate ?? null,
  }
}

function buildWalkGroupParty(userId, activityId, activity, startTime, response = 'pending') {
  const party = {
    userId,
    childId: activity.childId,
    childFirstName: activity.childFirstName,
    activityId,
    startTime,
    grade: activity.grade,
    walkStatus: 'unconfirmed',
    response,
    ...partyScheduleFields(activity),
  }
  if (typeof activity.colorKey === 'number') party.colorKey = activity.colorKey
  return party
}

function partyKey(party) {
  return `${party.userId}:${party.childId}:${party.activityId}`
}

function formatTimeLabel(startTime) {
  if (!startTime) return ''
  const [hoursStr, minutesStr] = startTime.split(':')
  const hours = Number(hoursStr)
  const minutes = Number(minutesStr)
  const period = hours >= 12 ? 'PM' : 'AM'
  const displayHours = hours % 12 || 12
  return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`
}

export function getPartiesForUser(group, userId) {
  return (group.parties ?? []).filter((party) => party.userId === userId)
}

export function getActiveParties(group) {
  return (group.parties ?? []).filter((party) => party.response === 'accepted')
}

export function getAllGroupChildNames(group) {
  return getActiveParties(group).map((party) => party.childFirstName).join(', ')
}

/** All family user IDs in the group (pending or accepted — not declined). */
export function resolveWalkGroupParticipantIds(group) {
  const partyUserIds = [...new Set(getNonDeclinedParties(group).map((party) => party.userId))]
  const stored = group.participantIds ?? []
  return [...new Set([...stored, ...partyUserIds])].filter(Boolean)
}

/** Accepted families only — for walk roster / absence visibility. */
export function resolveWalkGroupAcceptedParticipantIds(group) {
  return [...new Set(getActiveParties(group).map((party) => party.userId))].filter(Boolean)
}

export function walkGroupIsReadyForWalk(group, userId) {
  if (walkGroupIsDeclinedForUser(group, userId)) return false
  if (!walkGroupUserHasAccepted(group, userId)) return false
  if (group.status !== 'active') return false
  return getActiveParties(group).length > 0
}

export function subscribeToWalkGroup(groupId, onData, onError) {
  return onSnapshot(
    doc(db, 'walkGroups', groupId),
    (snapshot) => {
      if (!snapshot.exists()) {
        onData(null)
        return
      }
      onData({ id: snapshot.id, source: 'walkGroup', ...snapshot.data() })
    },
    onError,
  )
}

export async function leaveWalkGroup(groupId, userId) {
  if (await getActiveSession(groupId, userId)) {
    throw new Error('Cannot leave group while a walk is in progress.')
  }
  await respondToWalkGroup(groupId, userId, 'declined', '', '')
}

export function walkGroupIsVisibleOnGroupsPage(group, userId) {
  if (walkGroupIsDeclinedForUser(group, userId)) return false
  return walkGroupUserHasAccepted(group, userId) && (group.status === 'active' || group.status === 'open')
}

function getNonDeclinedParties(group) {
  return (group.parties ?? []).filter((party) => party.response !== 'declined')
}

export function countWalkGroupFamilies(group) {
  return new Set(getNonDeclinedParties(group).map((party) => party.userId)).size
}

/** True for documents from the walkGroups collection (with or without normalized source field). */
export function isWalkGroupDocument(group) {
  if (!group) return false
  if (group.source === 'walkGroup') return true
  if (group.matchType || group.buildingWalkType) return false
  return (
    group.groupType === 'location_window'
    || (Array.isArray(group.parties) && Boolean(group.day) && Boolean(group.location))
  )
}

/** True when the group has children from at least two different families (non-declined). */
export function walkGroupHasMultipleFamilies(group) {
  return countWalkGroupFamilies(group) >= 2
}

export function countOtherJoiningFamilies(group, userId) {
  const userIds = new Set()
  for (const party of getNonDeclinedParties(group)) {
    if (party.userId === userId) continue
    userIds.add(party.userId)
  }
  return userIds.size
}

function activityFitsGroupWindow(group, startTime) {
  const activeParties = getNonDeclinedParties(group)
  if (activeParties.length === 0) {
    return timesWithinWindow(group.windowStartTime, startTime, group.windowMinutes ?? MATCH_WINDOW_MINUTES)
  }

  return activeParties.some((party) =>
    timesWithinWindow(party.startTime, startTime, group.windowMinutes ?? MATCH_WINDOW_MINUTES),
  )
}

function groupHasParty(group, userId, activityId, childId) {
  return getNonDeclinedParties(group).some(
    (party) =>
      party.userId === userId && party.activityId === activityId && party.childId === childId,
  )
}

function findPartyIndex(parties, userId, activityId, childId) {
  return parties.findIndex(
    (party) =>
      party.userId === userId && party.activityId === activityId && party.childId === childId,
  )
}

function computeWalkGroupStatus(parties) {
  const activeParties = parties.filter((party) => party.response !== 'declined')
  if (activeParties.length === 0) return 'completed'

  const accepted = activeParties.filter((party) => party.response === 'accepted')
  const acceptedFamilies = new Set(accepted.map((party) => party.userId)).size

  if (acceptedFamilies >= 2 || (acceptedFamilies === 1 && accepted.length >= 2)) {
    return 'active'
  }

  if (activeParties.some((party) => party.response === 'pending')) {
    return 'open'
  }

  return accepted.length > 0 ? 'active' : 'open'
}

function earliestStartTime(parties, fallback) {
  const times = parties.map((party) => party.startTime).filter(Boolean)
  if (times.length === 0) return fallback
  return times.sort()[0]
}

async function findWalkGroupForActivity(location, day, startTime) {
  const snapshot = await getDocs(
    query(
      collection(db, 'walkGroups'),
      where('location', '==', location),
      where('day', '==', day),
    ),
  )

  const candidates = snapshot.docs
    .map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))
    .filter((group) => group.status === 'open' || group.status === 'active')
    .filter((group) => activityFitsGroupWindow(group, startTime))
    .filter((group) => countWalkGroupFamilies(group) < MAX_WALK_GROUP_FAMILIES)
    .sort((a, b) => countWalkGroupFamilies(b) - countWalkGroupFamilies(a))

  return candidates[0] ?? null
}

async function createWalkGroup(userId, activityId, activity, day) {
  const party = buildWalkGroupParty(userId, activityId, activity, activity.startTime)

  const groupRef = await addDoc(collection(db, 'walkGroups'), {
    groupType: 'location_window',
    location: activity.location,
    day,
    windowStartTime: activity.startTime,
    windowMinutes: MATCH_WINDOW_MINUTES,
    status: 'open',
    participantIds: [userId],
    parties: [party],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })

  debugLog('created walkGroup', {
    groupId: groupRef.id,
    userId,
    activityId,
    day,
    location: activity.location,
    startTime: activity.startTime,
    participantIds: [userId],
  })

  return groupRef.id
}

async function addFamilyToWalkGroup(groupId, userId, activityId, activity) {
  const groupRef = doc(db, 'walkGroups', groupId)
  const groupSnap = await getDoc(groupRef)
  if (!groupSnap.exists()) return 'missing'

  const group = { id: groupSnap.id, ...groupSnap.data() }
  let parties = [...(group.parties ?? [])]
  const existingIndex = findPartyIndex(parties, userId, activityId, activity.childId)

  if (existingIndex >= 0) {
    if (parties[existingIndex].response !== 'declined') {
      return 'exists'
    }
    parties[existingIndex] = buildWalkGroupParty(userId, activityId, activity, activity.startTime)
  } else {
    if (countWalkGroupFamilies(group) >= MAX_WALK_GROUP_FAMILIES) {
      return 'full'
    }
    parties.push(buildWalkGroupParty(userId, activityId, activity, activity.startTime))
  }

  parties.sort((a, b) => partyKey(a).localeCompare(partyKey(b)))
  const participantIds = [...new Set([...(group.participantIds ?? []), userId])]
  const windowStartTime = earliestStartTime(getNonDeclinedParties({ parties }), group.windowStartTime)

  await updateDoc(groupRef, {
    parties,
    participantIds,
    windowStartTime,
    status: computeWalkGroupStatus(parties),
    updatedAt: serverTimestamp(),
  })

  debugLog('added family to walkGroup', {
    groupId,
    userId,
    activityId,
    participantIds,
    partyCount: parties.length,
  })

  return 'added'
}

export async function repairWalkGroupParticipantIds(userId) {
  const snapshot = await getDocs(
    query(collection(db, 'walkGroups'), where('participantIds', 'array-contains', userId)),
  )

  await Promise.all(
    snapshot.docs.map(async (docSnap) => {
      const group = docSnap.data()
      const mergedIds = resolveWalkGroupParticipantIds({ ...group, id: docSnap.id })
      const stored = group.participantIds ?? []
      if (mergedIds.length === stored.length && mergedIds.every((id) => stored.includes(id))) {
        return
      }
      await updateDoc(docSnap.ref, {
        participantIds: mergedIds,
        updatedAt: serverTimestamp(),
      })
      debugLog('repaired walkGroup participantIds', { groupId: docSnap.id, participantIds: mergedIds })
    }),
  )
}

export async function processActivityWalkGrouping(userId, activityId, activity) {
  const profile = await getUserProfile(userId)
  if (profile.matchingOptOut) {
    debugLog('processActivityWalkGrouping skipped — matchingOptOut', { userId, activityId })
    return
  }

  let enrichedActivity = { ...activity }
  if (activity.childId) {
    const kid = await getKid(userId, activity.childId)
    if (kid) {
      enrichedActivity = {
        ...enrichedActivity,
        colorKey: kid.colorKey,
      }
    }
  }

  debugLog('processActivityWalkGrouping', {
    userId,
    activityId,
    child: enrichedActivity.childFirstName,
    location: enrichedActivity.location,
    days: enrichedActivity.days,
    startTime: enrichedActivity.startTime,
  })

  if (!Array.isArray(enrichedActivity.days) || enrichedActivity.days.length === 0) {
    debugLog('processActivityWalkGrouping skipped — no days on activity', { userId, activityId })
    return
  }

  for (const day of enrichedActivity.days) {
    const existingGroup = await findWalkGroupForActivity(
      enrichedActivity.location,
      day,
      enrichedActivity.startTime,
    )

    if (existingGroup) {
      debugLog('found existing walkGroup for day', {
        day,
        existingGroupId: existingGroup.id,
        status: existingGroup.status,
        participantIds: existingGroup.participantIds,
      })
      const result = await addFamilyToWalkGroup(
        existingGroup.id,
        userId,
        activityId,
        enrichedActivity,
      )
      debugLog('addFamilyToWalkGroup result', { day, result })
      if (result === 'full') {
        await createWalkGroup(userId, activityId, enrichedActivity, day)
      }
    } else {
      debugLog('no existing walkGroup — creating new group', {
        day,
        location: enrichedActivity.location,
      })
      await createWalkGroup(userId, activityId, enrichedActivity, day)
    }
  }
}

export function subscribeToWalkGroups(userId, onData, onError) {
  if (!userId) {
    debugLog('subscribeToWalkGroups — no userId')
    onData([])
    return () => {}
  }

  const groupsQuery = query(
    collection(db, 'walkGroups'),
    where('participantIds', 'array-contains', userId),
  )

  debugLog('subscribeToWalkGroups — listening', {
    userId,
    query: 'walkGroups where participantIds array-contains userId',
  })

  return onSnapshot(
    groupsQuery,
    (snapshot) => {
      const groups = snapshot.docs
        .map((docSnap) => ({ id: docSnap.id, source: 'walkGroup', ...docSnap.data() }))
        .sort((a, b) => (b.updatedAt?.seconds ?? 0) - (a.updatedAt?.seconds ?? 0))

      debugLog('subscribeToWalkGroups — snapshot', {
        userId,
        count: groups.length,
        groups: groups.map((group) => ({
          id: group.id,
          status: group.status,
          location: group.location,
          day: group.day,
          participantIds: group.participantIds,
          parties: group.parties?.map((party) => ({
            userId: party.userId,
            child: party.childFirstName,
            response: party.response,
          })),
          needsResponse: walkGroupNeedsUserResponse(group, userId),
          visibleOnGroups: walkGroupIsVisibleOnGroupsPage(group, userId),
        })),
      })

      onData(groups)
    },
    (error) => {
      console.error('[walkGroups] subscribeToWalkGroups error', { userId, error })
      onError?.(error)
    },
  )
}

export function walkGroupNeedsUserResponse(group, userId) {
  return getPartiesForUser(group, userId).some((party) => party.response === 'pending')
}

export function walkGroupUserHasAccepted(group, userId) {
  const parties = getPartiesForUser(group, userId)
  return parties.length > 0 && parties.every((party) => party.response === 'accepted')
}

export function walkGroupIsActiveForUser(group, userId) {
  if (walkGroupNeedsUserResponse(group, userId)) return false
  return walkGroupUserHasAccepted(group, userId) && group.status === 'active'
}

export function walkGroupIsDeclinedForUser(group, userId) {
  const parties = getPartiesForUser(group, userId)
  return parties.length > 0 && parties.every((party) => party.response === 'declined')
}

export function formatWalkGroupInvitation(group, userId) {
  const otherCount = countOtherJoiningFamilies(group, userId)
  const time = formatTimeLabel(group.windowStartTime)
  const familyLabel = otherCount === 1 ? 'family is' : 'families are'
  return `You have a group match at ${group.location} on ${group.day} at ${time} — ${otherCount} other ${familyLabel} joining. Want to join this group?`
}

export function formatWalkGroupDetails(group) {
  const time = formatTimeLabel(group.windowStartTime)
  const familyCount = countWalkGroupFamilies(group)
  return `${group.location} · ${group.day} · ${time} · ${familyCount} ${familyCount === 1 ? 'family' : 'families'}`
}

export async function respondToWalkGroup(groupId, userId, response, contactPhone, parentName) {
  const groupRef = doc(db, 'walkGroups', groupId)
  const groupSnap = await getDoc(groupRef)
  if (!groupSnap.exists()) return

  const group = { id: groupSnap.id, ...groupSnap.data() }

  if (response === 'declined') {
    const parties = (group.parties ?? []).map((party) => {
      if (party.userId !== userId) return party
      return { ...party, response: 'declined' }
    })

    await updateDoc(groupRef, {
      parties,
      windowStartTime: earliestStartTime(getNonDeclinedParties({ parties }), group.windowStartTime),
      status: computeWalkGroupStatus(parties),
      updatedAt: serverTimestamp(),
    })
    return
  }

  const parties = await Promise.all(
    (group.parties ?? []).map(async (party) => {
      if (party.userId !== userId) return party
      const kid = party.childId ? await getKid(userId, party.childId) : null
      return {
        ...party,
        response: 'accepted',
        walkStatus: party.walkStatus || 'unconfirmed',
        contactPhone: contactPhone || 'Not provided',
        parentName: parentName || 'Parent',
        ...(typeof kid?.colorKey === 'number' ? { colorKey: kid.colorKey } : {}),
      }
    }),
  )

  let participantIds = group.participantIds ?? []
  if (!participantIds.includes(userId)) {
    participantIds = [...participantIds, userId]
  }

  const updatedGroup = { ...group, parties, participantIds }

  const { groupLeaders } = ensureParentLeaderOnGroup(
    updatedGroup,
    userId,
    {
      displayName: parentName,
      phoneNumber: contactPhone,
    },
  )

  const leaderUserIds = resolveLeaderUserIds({
    ...updatedGroup,
    groupLeaders,
  })

  await updateDoc(groupRef, {
    parties,
    participantIds,
    status: computeWalkGroupStatus(parties),
    groupLeaders,
    leaderUserIds,
    updatedAt: serverTimestamp(),
  })
}

export async function syncChildColorKeyToWalkGroups(userId, childId, colorKey) {
  if (typeof colorKey !== 'number') return

  const snapshot = await getDocs(
    query(collection(db, 'walkGroups'), where('participantIds', 'array-contains', userId)),
  )

  await Promise.all(
    snapshot.docs.map(async (docSnap) => {
      const group = docSnap.data()
      let changed = false

      const parties = (group.parties ?? []).map((party) => {
        if (party.userId !== userId || party.childId !== childId) return party
        changed = true
        return { ...party, colorKey }
      })

      if (changed) {
        await updateDoc(docSnap.ref, {
          parties,
          updatedAt: serverTimestamp(),
        })
      }
    }),
  )
}

export async function syncWalkGroupPartiesForActivity(userId, activityId, activity) {
  let enrichedActivity = { ...activity }
  if (activity.childId) {
    const kid = await getKid(userId, activity.childId)
    if (kid) {
      enrichedActivity = {
        ...enrichedActivity,
        colorKey: kid.colorKey,
      }
    }
  }

  const snapshot = await getDocs(
    query(collection(db, 'walkGroups'), where('participantIds', 'array-contains', userId)),
  )

  await Promise.all(
    snapshot.docs.map(async (docSnap) => {
      const group = docSnap.data()
      let changed = false

      const parties = (group.parties ?? []).map((party) => {
        if (party.userId !== userId || party.activityId !== activityId) return party
        changed = true
        const next = {
          ...party,
          childId: enrichedActivity.childId,
          childFirstName: enrichedActivity.childFirstName,
          startTime: enrichedActivity.startTime,
          grade: enrichedActivity.grade,
          ...partyScheduleFields(enrichedActivity),
        }
        if (typeof enrichedActivity.colorKey === 'number') next.colorKey = enrichedActivity.colorKey
        return next
      })

      if (changed) {
        await updateDoc(docSnap.ref, {
          parties,
          windowStartTime: earliestStartTime(getNonDeclinedParties({ parties }), group.windowStartTime),
          updatedAt: serverTimestamp(),
        })
      }
    }),
  )
}
