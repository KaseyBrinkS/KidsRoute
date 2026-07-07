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
import { formatSharedContactPhone } from '../utils/contactInfo'
import { deleteAllActivitySlots, fetchUserActivities } from './activities'
import { getActiveSession } from './groupWalk'
import { processActivityWalkGrouping } from './walkGroups'
import { defaultSessions } from './sessions'
import { getUserProfile } from './users'

export const MATCH_WINDOW_MINUTES = 75

// Temporary debug logging — remove when matching is stable
const DEBUG_MATCHING = true

function debugLog(...args) {
  if (DEBUG_MATCHING) {
    console.log('[KidsRoute Matching]', ...args)
  }
}

function minutesApart(timeA, timeB) {
  return Math.abs(timeToMinutes(timeA) - timeToMinutes(timeB))
}

function evaluateSlot(userId, activityId, activity, day, slot) {
  const comparison = {
    slotId: slot.id,
    slotChild: slot.childFirstName,
    slotDay: slot.day,
    slotTime: slot.startTime,
    slotActivityId: slot.activityId,
    newChild: activity.childFirstName,
    newDay: day,
    newTime: activity.startTime,
    minutesApart: minutesApart(slot.startTime, activity.startTime),
  }

  if (slot.day !== day) {
    return { match: false, reason: `day mismatch (${slot.day} vs ${day})`, comparison }
  }

  if (slot.userId === userId && slot.activityId === activityId) {
    return { match: false, reason: 'same activity slot (just created)', comparison }
  }

  if (slot.userId === userId && slot.childId === activity.childId) {
    return { match: false, reason: 'same child', comparison }
  }

  if (!timesWithinWindow(slot.startTime, activity.startTime)) {
    return {
      match: false,
      reason: `time outside ${MATCH_WINDOW_MINUTES}min window (${comparison.minutesApart} min apart)`,
      comparison,
    }
  }

  return { match: true, reason: 'all criteria met', comparison }
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

export function timeToMinutes(startTime) {
  const [hoursStr, minutesStr] = startTime.split(':')
  return Number(hoursStr) * 60 + Number(minutesStr)
}

export function timesWithinWindow(timeA, timeB, windowMinutes = MATCH_WINDOW_MINUTES) {
  return Math.abs(timeToMinutes(timeA) - timeToMinutes(timeB)) <= windowMinutes
}

function partyKey(party) {
  return `${party.userId}:${party.childId}:${party.activityId}`
}

function buildMatchKey(partyA, partyB, location, day) {
  const pairs = [partyKey(partyA), partyKey(partyB)].sort()
  return `${pairs.join('_')}|${location}|${day}`
}

async function matchExists(userId, matchKey) {
  const existing = await getDocs(
    query(
      collection(db, 'matches'),
      where('participantIds', 'array-contains', userId),
    ),
  )
  const found = existing.docs.some((docSnap) => docSnap.data().matchKey === matchKey)
  debugLog('Duplicate check:', { matchKey, found, existingMatchCount: existing.docs.length })
  return found
}

async function createActivitySlot(userId, activityId, activity, day, matchingOptOut = false) {
  await addDoc(collection(db, 'activitySlots'), {
    userId,
    childId: activity.childId,
    childFirstName: activity.childFirstName,
    activityId,
    location: activity.location,
    day,
    startTime: activity.startTime,
    grade: activity.grade,
    matchingOptOut,
    days: activity.days ?? [],
    sessions: activity.sessions ?? defaultSessions(),
    summerStartDate: activity.summerStartDate ?? null,
    summerEndDate: activity.summerEndDate ?? null,
    createdAt: serverTimestamp(),
  })
}

async function findMatchingSlots(userId, activityId, activity, day) {
  debugLog('Querying activitySlots for location:', activity.location)

  const snapshot = await getDocs(
    query(collection(db, 'activitySlots'), where('location', '==', activity.location)),
  )

  const allSlots = snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))
  debugLog(`Fetched ${allSlots.length} slot(s) from Firestore:`, allSlots)

  const results = []

  for (const slot of allSlots) {
    if (slot.matchingOptOut === true) {
      debugLog('Skipping opted-out slot:', slot.id)
      continue
    }

    const evaluation = evaluateSlot(userId, activityId, activity, day, slot)
    debugLog('Comparing slot:', evaluation)

    if (evaluation.match) {
      results.push(slot)
    }
  }

  debugLog(
    results.length > 0
      ? `Found ${results.length} matching slot(s) for ${activity.childFirstName} on ${day}`
      : `No matching slots for ${activity.childFirstName} on ${day}`,
    { newActivity: { childId: activity.childId, activityId, day, startTime: activity.startTime } },
  )

  return results
}

function partyScheduleFields(source) {
  return {
    days: source.days ?? [],
    sessions: source.sessions ?? defaultSessions(),
    summerStartDate: source.summerStartDate ?? null,
    summerEndDate: source.summerEndDate ?? null,
  }
}

function buildParty(userId, activityId, activity, startTime) {
  return {
    userId,
    childId: activity.childId,
    childFirstName: activity.childFirstName,
    activityId,
    startTime,
    grade: activity.grade,
    walkStatus: 'unconfirmed',
    response: 'pending',
    ...partyScheduleFields(activity),
  }
}

async function createMatch(userId, activityId, activity, day, otherSlot) {
  const myParty = buildParty(userId, activityId, activity, activity.startTime)
  const otherParty = buildParty(
    otherSlot.userId,
    otherSlot.activityId,
    {
      childId: otherSlot.childId,
      childFirstName: otherSlot.childFirstName,
      grade: otherSlot.grade,
      days: otherSlot.days,
      sessions: otherSlot.sessions,
      summerStartDate: otherSlot.summerStartDate,
      summerEndDate: otherSlot.summerEndDate,
    },
    otherSlot.startTime,
  )

  const matchKey = buildMatchKey(myParty, otherParty, activity.location, day)

  debugLog('Attempting to create match:', {
    matchKey,
    myChild: myParty.childFirstName,
    otherChild: otherParty.childFirstName,
    location: activity.location,
    day,
    myTime: myParty.startTime,
    otherTime: otherParty.startTime,
  })

  if (await matchExists(userId, matchKey)) {
    debugLog('Skipped — match already exists:', matchKey)
    return false
  }

  const parties = [myParty, otherParty].sort((a, b) =>
    `${a.userId}:${a.childId}`.localeCompare(`${b.userId}:${b.childId}`),
  )
  const participantIds = [...new Set(parties.map((party) => party.userId))]

  const matchRef = await addDoc(collection(db, 'matches'), {
    status: 'pending',
    matchKey,
    participantIds,
    parties,
    location: activity.location,
    day,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })

  debugLog('Created match:', { matchId: matchRef.id, matchKey, parties })
  return true
}

export async function processActivityMatching(userId, activityId, activity) {
  const profile = await getUserProfile(userId)
  if (profile.matchingOptOut) {
    debugLog('User opted out of matching — skipping slot creation and match search')
    return
  }

  debugLog('=== Starting matching ===', {
    userId,
    activityId,
    child: activity.childFirstName,
    location: activity.location,
    days: activity.days,
    startTime: activity.startTime,
    grade: activity.grade,
  })

  let totalMatchesCreated = 0

  for (const day of activity.days) {
    debugLog(`--- Processing day: ${day} ---`)

    await createActivitySlot(userId, activityId, activity, day, false)
    debugLog('Created activity slot for', activity.childFirstName, 'on', day)

    const matchingSlots = await findMatchingSlots(userId, activityId, activity, day)

    if (matchingSlots.length === 0) {
      debugLog(`No matches to create for ${day}`)
    }

    for (const slot of matchingSlots) {
      const created = await createMatch(userId, activityId, activity, day, slot)
      if (created) totalMatchesCreated += 1
    }
  }

  debugLog('=== Matching complete ===', {
    child: activity.childFirstName,
    totalMatchesCreated,
  })
}

export function subscribeToMatch(matchId, onData, onError) {
  return onSnapshot(
    doc(db, 'matches', matchId),
    (snapshot) => {
      if (!snapshot.exists()) {
        onData(null)
        return
      }
      onData({ id: snapshot.id, ...snapshot.data() })
    },
    onError,
  )
}

export function subscribeToMatches(userId, onData, onError) {
  const matchesQuery = query(
    collection(db, 'matches'),
    where('participantIds', 'array-contains', userId),
  )

  return onSnapshot(
    matchesQuery,
    (snapshot) => {
      const matches = snapshot.docs
        .map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))
        .sort((a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0))
      debugLog('Dashboard loaded matches:', {
        userId,
        count: matches.length,
        matches: matches.map((m) => ({
          id: m.id,
          status: m.status,
          matchKey: m.matchKey,
          parties: m.parties?.map((p) => ({
            child: p.childFirstName,
            response: p.response,
          })),
        })),
      })
      onData(matches)
    },
    onError,
  )
}

export function getActiveParties(match) {
  return (match.parties ?? []).filter((party) => party.response === 'accepted')
}

export function isSameFamilyMatch(match) {
  const userIds = new Set(match.parties.map((party) => party.userId))
  return userIds.size === 1
}

export function getPartiesForUser(match, userId) {
  return match.parties.filter((party) => party.userId === userId)
}

export function getOtherParty(match, userId) {
  const myChildIds = new Set(
    match.parties.filter((party) => party.userId === userId).map((party) => party.childId),
  )
  return match.parties.find((party) => !myChildIds.has(party.childId))
}

export function getOtherChildFirstName(match, userId) {
  const otherParty = getOtherParty(match, userId)
  return otherParty?.childFirstName ?? null
}

export function matchIsDeclinedForUser(match, userId) {
  const myParties = getPartiesForUser(match, userId)
  return (
    myParties.length > 0 &&
    myParties.every((party) => party.response === 'declined' || party.response === 'left')
  )
}

export function isActivityMatch(match) {
  return !match?.matchType || match.matchType === 'activity'
}

export function matchIsConnectedForUser(match, userId) {
  if (match.matchType === 'building') {
    if (match.status !== 'connected') return false
    const myParties = getPartiesForUser(match, userId)
    return myParties.length > 0 && myParties.every((party) => party.response === 'accepted')
  }

  if (matchIsDeclinedForUser(match, userId)) return false

  const myParties = getPartiesForUser(match, userId)
  if (!myParties.every((party) => party.response === 'accepted')) return false

  const active = getActiveParties(match)
  if (isSameFamilyMatch(match)) return active.length >= 2
  return active.length >= 2 && new Set(active.map((party) => party.userId)).size >= 2
}

export function matchNeedsUserResponse(match, userId) {
  if (matchIsDeclinedForUser(match, userId)) return false
  return getPartiesForUser(match, userId).some((party) => party.response === 'pending')
}

export function userHasAccepted(match, userId) {
  const parties = getPartiesForUser(match, userId)
  return parties.length > 0 && parties.every((party) => party.response === 'accepted')
}

function computeMatchStatus(parties, sameFamily) {
  const pending = parties.filter((party) => party.response === 'pending')
  const accepted = parties.filter((party) => party.response === 'accepted')

  if (parties.every((party) => party.response === 'declined' || party.response === 'left')) {
    return 'declined'
  }

  if (sameFamily) {
    if (accepted.length === parties.length) return 'connected'
    if (pending.length > 0) return 'pending'
    return 'declined'
  }

  const acceptedUserIds = new Set(accepted.map((party) => party.userId))
  if (accepted.length >= 2 && acceptedUserIds.size >= 2) return 'connected'
  if (pending.length > 0) return 'pending'
  return 'declined'
}

export async function respondToMatch(matchId, userId, response, contactPhone, parentName) {
  const matchRef = doc(db, 'matches', matchId)
  const matchSnap = await getDoc(matchRef)
  if (!matchSnap.exists()) return

  const match = { id: matchSnap.id, ...matchSnap.data() }
  const sameFamily = isSameFamilyMatch(match)

  const parties = match.parties.map((party) => {
    if (party.userId !== userId) return party
    return {
      ...party,
      response,
      walkStatus: party.walkStatus || 'unconfirmed',
      ...(response === 'accepted'
        ? {
            contactPhone: formatSharedContactPhone(contactPhone),
            parentName: parentName || 'Parent',
          }
        : {}),
    }
  })

  const status = computeMatchStatus(parties, sameFamily)

  await updateDoc(matchRef, {
    parties,
    status,
    updatedAt: serverTimestamp(),
  })
}

export async function leaveGroup(matchId, userId) {
  const matchRef = doc(db, 'matches', matchId)
  const matchSnap = await getDoc(matchRef)
  if (!matchSnap.exists()) return

  if (await getActiveSession(matchId, userId)) {
    throw new Error('Cannot leave group while a walk is in progress.')
  }

  const match = { id: matchSnap.id, ...matchSnap.data() }
  const wasConnected = match.status === 'connected'

  const parties = match.parties.map((party) => {
    if (party.userId !== userId) return party
    return { ...party, response: 'declined' }
  })

  const activeAccepted = parties.filter((party) => party.response === 'accepted')
  const sameFamily = isSameFamilyMatch(match)

  let status = computeMatchStatus(parties, sameFamily)
  if (wasConnected && activeAccepted.length > 0 && status !== 'connected') {
    status = 'partner_left'
  }

  await updateDoc(matchRef, {
    parties,
    status,
    updatedAt: serverTimestamp(),
  })
}

export function formatMatchDetails(match) {
  if (match.parties?.some((party) => party.startTime)) {
    const times = match.parties.map((party) => formatTimeLabel(party.startTime)).join(' / ')
    return `${match.location} · ${match.day} · ${times}`
  }

  const grade = match.grade ? ` · Grade ${match.grade}` : ''
  return `${match.location} · ${match.day} · ${formatTimeLabel(match.startTime)}${grade}`
}

export function formatMatchTitle(match, userId) {
  if (isSameFamilyMatch(match)) {
    const names = match.parties.map((party) => party.childFirstName).join(' and ')
    return `We found a group match for ${names} — group them together?`
  }

  const myParty = getPartiesForUser(match, userId)[0]
  return `We found a group match for ${myParty?.childFirstName} — do you want to connect?`
}

export function formatConnectedTitle(match, userId) {
  const otherParty = getOtherParty(match, userId)
  if (isSameFamilyMatch(match)) {
    return `${match.parties.map((party) => party.childFirstName).join(' and ')} are grouped for this walk`
  }
  return `Connected with ${otherParty?.childFirstName}'s family`
}

export async function syncMatchPartiesForActivity(userId, activityId, activity) {
  const snapshot = await getDocs(
    query(collection(db, 'matches'), where('participantIds', 'array-contains', userId)),
  )

  await Promise.all(
    snapshot.docs.map(async (docSnap) => {
      const match = docSnap.data()
      let changed = false

      const parties = match.parties.map((party) => {
        if (party.userId !== userId || party.activityId !== activityId) return party
        changed = true
        return {
          ...party,
          childId: activity.childId,
          childFirstName: activity.childFirstName,
          startTime: activity.startTime,
          grade: activity.grade,
          ...partyScheduleFields(activity),
        }
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

export async function syncUserMatchingOptOut(userId, optedOut) {
  if (optedOut) {
    await deleteAllActivitySlots(userId)
    return
  }

  const activities = await fetchUserActivities(userId)
  for (const activity of activities) {
    await processActivityWalkGrouping(userId, activity.id, {
      childId: activity.childId,
      childFirstName: activity.childFirstName,
      location: activity.location,
      grade: activity.grade,
      days: activity.days,
      startTime: activity.startTime,
      sessions: activity.sessions,
      summerStartDate: activity.summerStartDate,
      summerEndDate: activity.summerEndDate,
    })
  }
}
