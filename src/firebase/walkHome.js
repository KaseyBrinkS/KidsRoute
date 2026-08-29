import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore'
import { db } from './db'
import { formatStartTime } from './activities'
import { formatHomeAddressDisplay, normalizeBuildingMatchKey } from './buildingWalks'
import { timesWithinWindow } from './matching'
import { defaultSessions } from './sessions'
import { getUserProfile } from './users'
import { getKid } from './kids'

const MAX_WALK_GROUP_FAMILIES = 20

function homeAddressFromProfile(profile) {
  const streetNumber = profile.streetNumber?.trim() ?? ''
  const zipCode = profile.zipCode?.trim() ?? ''
  if (!streetNumber || !zipCode) return null
  return {
    streetNumber,
    streetName: profile.streetName?.trim() ?? '',
    zipCode,
  }
}

function getNonDeclinedParties(group) {
  return (group.parties ?? []).filter((party) => party.response !== 'declined')
}

function countWalkGroupFamilies(group) {
  return new Set(getNonDeclinedParties(group).map((party) => party.userId)).size
}

export const WALK_HOME_CLASS_MINUTES = 60
export const WALK_HOME_BUFFER_MINUTES = 15
export const WALK_HOME_DEPARTURE_OFFSET_MINUTES =
  WALK_HOME_CLASS_MINUTES + WALK_HOME_BUFFER_MINUTES
export const WALK_HOME_MATCH_WINDOW_MINUTES = 60

function timeToMinutes(startTime) {
  const [hoursStr, minutesStr] = startTime.split(':')
  return Number(hoursStr) * 60 + Number(minutesStr)
}

function minutesToTime(totalMinutes) {
  const normalized = ((totalMinutes % (24 * 60)) + 24 * 60) % (24 * 60)
  const hours = Math.floor(normalized / 60)
  const minutes = normalized % 60
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
}

export function calculateWalkHomeDeparture(activityStartTime) {
  if (!activityStartTime) return null
  return minutesToTime(timeToMinutes(activityStartTime) + WALK_HOME_DEPARTURE_OFFSET_MINUTES)
}

export function departureTimesWithinWindow(departureA, departureB) {
  return timesWithinWindow(departureA, departureB, WALK_HOME_MATCH_WINDOW_MINUTES)
}

function partyScheduleFields(source) {
  return {
    days: source.days ?? [],
    sessions: source.sessions ?? defaultSessions(),
    summerStartDate: source.summerStartDate ?? null,
    summerEndDate: source.summerEndDate ?? null,
  }
}

function buildWalkHomeParty(userId, activityId, activity, departureTime, response = 'pending') {
  const party = {
    userId,
    childId: activity.childId,
    childFirstName: activity.childFirstName,
    activityId,
    activityStartTime: activity.startTime,
    startTime: departureTime,
    departureTime,
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

function departureWindowBounds(parties, fallbackStart, fallbackEnd) {
  const departures = parties
    .map((party) => party.departureTime ?? party.startTime)
    .filter(Boolean)
    .sort()

  if (departures.length === 0) {
    return { windowStartTime: fallbackStart, windowEndTime: fallbackEnd ?? fallbackStart }
  }

  return {
    windowStartTime: departures[0],
    windowEndTime: departures[departures.length - 1],
  }
}

function activityFitsWalkHomeWindow(group, departureTime) {
  const activeParties = getNonDeclinedParties(group)
  if (activeParties.length === 0) {
    return departureTimesWithinWindow(group.windowStartTime, departureTime)
  }

  return activeParties.some((party) =>
    departureTimesWithinWindow(party.departureTime ?? party.startTime, departureTime),
  )
}

async function findWalkHomeGroup(location, buildingMatchKey, day, departureTime) {
  const snapshot = await getDocs(
    query(
      collection(db, 'walkGroups'),
      where('groupType', '==', 'walk_home'),
      where('location', '==', location),
      where('day', '==', day),
    ),
  )

  return (
    snapshot.docs
      .map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))
      .filter((group) => group.buildingMatchKey === buildingMatchKey)
      .filter((group) => group.status === 'open' || group.status === 'active')
      .filter((group) => activityFitsWalkHomeWindow(group, departureTime))
      .filter((group) => countWalkGroupFamilies(group) < MAX_WALK_GROUP_FAMILIES)
      .sort((a, b) => countWalkGroupFamilies(b) - countWalkGroupFamilies(a))[0] ?? null
  )
}

async function createWalkHomeGroup(
  userId,
  activityId,
  activity,
  day,
  buildingMatchKey,
  homeAddressDisplay,
) {
  const departureTime = calculateWalkHomeDeparture(activity.startTime)
  const party = buildWalkHomeParty(userId, activityId, activity, departureTime)

  await addDoc(collection(db, 'walkGroups'), {
    groupType: 'walk_home',
    location: activity.location,
    buildingMatchKey,
    homeAddressDisplay,
    day,
    windowStartTime: departureTime,
    windowEndTime: departureTime,
    windowMinutes: WALK_HOME_MATCH_WINDOW_MINUTES,
    status: 'open',
    participantIds: [userId],
    parties: [party],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
}

async function addFamilyToWalkHomeGroup(groupId, userId, activityId, activity) {
  const groupRef = doc(db, 'walkGroups', groupId)
  const groupSnap = await getDoc(groupRef)
  if (!groupSnap.exists()) return 'missing'

  const group = { id: groupSnap.id, ...groupSnap.data() }
  const departureTime = calculateWalkHomeDeparture(activity.startTime)
  let parties = [...(group.parties ?? [])]
  const existingIndex = findPartyIndex(parties, userId, activityId, activity.childId)

  if (existingIndex >= 0) {
    if (parties[existingIndex].response !== 'declined') {
      return 'exists'
    }
    parties[existingIndex] = buildWalkHomeParty(userId, activityId, activity, departureTime)
  } else {
    if (countWalkGroupFamilies(group) >= MAX_WALK_GROUP_FAMILIES) {
      return 'full'
    }
    parties.push(buildWalkHomeParty(userId, activityId, activity, departureTime))
  }

  parties.sort((a, b) => partyKey(a).localeCompare(partyKey(b)))
  const participantIds = [...new Set([...(group.participantIds ?? []), userId])]
  const activeParties = parties.filter((party) => party.response !== 'declined')
  const { windowStartTime, windowEndTime } = departureWindowBounds(
    activeParties,
    group.windowStartTime,
    group.windowEndTime,
  )

  await updateDoc(groupRef, {
    parties,
    participantIds,
    windowStartTime,
    windowEndTime,
    status: computeWalkGroupStatus(parties),
    updatedAt: serverTimestamp(),
  })

  return 'added'
}

export function formatWalkHomeWindow(group) {
  const start = group.windowStartTime
  const end = group.windowEndTime ?? start
  if (!start) return ''
  if (!end || start === end) return `~${formatStartTime(start)}`
  return `~${formatStartTime(start)} – ${formatStartTime(end)}`
}

export function isWalkHomeGroup(group) {
  return group?.groupType === 'walk_home'
}

export async function processWalkHomeGrouping(userId, activityId, activity) {
  if (!activity.walkHomeEnabled) {
    await removeWalkHomePartiesForActivity(userId, activityId)
    return
  }

  const profile = await getUserProfile(userId)
  if (profile.matchingOptOut) return

  const addressFields = homeAddressFromProfile(profile)
  if (!addressFields) return

  const buildingMatchKey = normalizeBuildingMatchKey(
    addressFields.streetNumber,
    addressFields.zipCode,
  )
  const homeAddressDisplay = formatHomeAddressDisplay(addressFields)

  let enrichedActivity = { ...activity }
  if (activity.childId) {
    const kid = await getKid(userId, activity.childId)
    if (kid) {
      enrichedActivity = { ...enrichedActivity, colorKey: kid.colorKey }
    }
  }

  if (!Array.isArray(enrichedActivity.days) || enrichedActivity.days.length === 0) return

  const departureTime = calculateWalkHomeDeparture(enrichedActivity.startTime)
  if (!departureTime) return

  for (const day of enrichedActivity.days) {
    const existingGroup = await findWalkHomeGroup(
      enrichedActivity.location,
      buildingMatchKey,
      day,
      departureTime,
    )

    if (existingGroup) {
      const result = await addFamilyToWalkHomeGroup(
        existingGroup.id,
        userId,
        activityId,
        enrichedActivity,
      )
      if (result === 'full') {
        await createWalkHomeGroup(
          userId,
          activityId,
          enrichedActivity,
          day,
          buildingMatchKey,
          homeAddressDisplay,
        )
      }
    } else {
      await createWalkHomeGroup(
        userId,
        activityId,
        enrichedActivity,
        day,
        buildingMatchKey,
        homeAddressDisplay,
      )
    }
  }
}

export async function removeWalkHomePartiesForActivity(userId, activityId) {
  const snapshot = await getDocs(
    query(collection(db, 'walkGroups'), where('participantIds', 'array-contains', userId)),
  )

  await Promise.all(
    snapshot.docs.map(async (docSnap) => {
      const group = docSnap.data()
      if (group.groupType !== 'walk_home') return

      const hasParty = (group.parties ?? []).some(
        (party) => party.userId === userId && party.activityId === activityId,
      )
      if (!hasParty) return

      const parties = (group.parties ?? []).map((party) => {
        if (party.userId !== userId || party.activityId !== activityId) return party
        return { ...party, response: 'declined' }
      })

      const activeParties = parties.filter((party) => party.response !== 'declined')
      const { windowStartTime, windowEndTime } = departureWindowBounds(
        activeParties,
        null,
        null,
      )

      await updateDoc(docSnap.ref, {
        parties,
        windowStartTime: windowStartTime ?? null,
        windowEndTime: windowEndTime ?? null,
        status: computeWalkGroupStatus(parties),
        updatedAt: serverTimestamp(),
      })
    }),
  )
}

export async function syncWalkHomePartiesForActivity(userId, activityId, activity) {
  const snapshot = await getDocs(
    query(collection(db, 'walkGroups'), where('participantIds', 'array-contains', userId)),
  )

  const departureTime = calculateWalkHomeDeparture(activity.startTime)

  await Promise.all(
    snapshot.docs.map(async (docSnap) => {
      const group = docSnap.data()
      if (group.groupType !== 'walk_home') return

      let changed = false
      const parties = (group.parties ?? []).map((party) => {
        if (party.userId !== userId || party.activityId !== activityId) return party
        changed = true
        return {
          ...party,
          childId: activity.childId,
          childFirstName: activity.childFirstName,
          activityStartTime: activity.startTime,
          startTime: departureTime,
          departureTime,
          grade: activity.grade,
          ...partyScheduleFields(activity),
        }
      })

      if (!changed) return

      const activeParties = parties.filter((party) => party.response !== 'declined')
      const { windowStartTime, windowEndTime } = departureWindowBounds(
        activeParties,
        group.windowStartTime,
        group.windowEndTime,
      )

      await updateDoc(docSnap.ref, {
        parties,
        windowStartTime,
        windowEndTime,
        updatedAt: serverTimestamp(),
      })
    }),
  )
}
