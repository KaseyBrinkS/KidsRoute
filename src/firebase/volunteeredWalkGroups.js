import { onSnapshot, query, collection, where } from 'firebase/firestore'
import { db } from './db'
import {
  walkGroupIsDeclinedForUser,
  walkGroupUserHasAccepted,
} from './walkGroups'
import { userLeadsWalkGroup } from './leaderVolunteers'

function groupIsEligible(group, userId) {
  if (walkGroupIsDeclinedForUser(group, userId)) return false
  return walkGroupUserHasAccepted(group, userId)
}

/**
 * Walk groups where the user has volunteered as Walk Leader or is an active leader.
 */
export function subscribeToVolunteeredWalkGroups(userId, onData, onError) {
  if (!userId) {
    onData([])
    return () => {}
  }

  let groupsById = new Map()
  let volunteersByGroup = new Map()
  const volunteerUnsubs = new Map()

  function syncVolunteerListener(groupId) {
    if (volunteerUnsubs.has(groupId)) return
    const unsub = onSnapshot(
      query(collection(db, 'leaderVolunteers'), where('groupId', '==', groupId)),
      (snapshot) => {
        volunteersByGroup.set(
          groupId,
          snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() })),
        )
        emit()
      },
      onError,
    )
    volunteerUnsubs.set(groupId, unsub)
  }

  function removeVolunteerListener(groupId) {
    volunteerUnsubs.get(groupId)?.()
    volunteerUnsubs.delete(groupId)
    volunteersByGroup.delete(groupId)
  }

  function emit() {
    const groups = [...groupsById.values()].filter((group) =>
      userLeadsWalkGroup(group, userId, volunteersByGroup.get(group.id) ?? []),
    )
    onData(groups)
  }

  const unsubGroups = onSnapshot(
    query(collection(db, 'walkGroups'), where('participantIds', 'array-contains', userId)),
    (snapshot) => {
      const nextIds = new Set()
      groupsById = new Map()
      for (const docSnap of snapshot.docs) {
        const group = { id: docSnap.id, source: 'walkGroup', ...docSnap.data() }
        if (!groupIsEligible(group, userId)) continue
        groupsById.set(group.id, group)
        nextIds.add(group.id)
        syncVolunteerListener(group.id)
      }
      for (const groupId of volunteerUnsubs.keys()) {
        if (!nextIds.has(groupId)) removeVolunteerListener(groupId)
      }
      emit()
    },
    onError,
  )

  return () => {
    unsubGroups()
    for (const unsub of volunteerUnsubs.values()) unsub()
  }
}
