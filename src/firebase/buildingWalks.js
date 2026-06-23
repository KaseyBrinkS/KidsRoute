import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore'
import { db } from './db'
import { fetchUserActivities } from './activities'
import { getActiveSession } from './groupWalk'
import { defaultSessions } from './sessions'
import { DEFAULT_SCHOOL, getUserProfile } from './users'

export const BUILDING_WALK_TYPES = {
  morning_to_school: {
    id: 'morning_to_school',
    label: 'Morning Walk to School',
    route: 'Home → PS 150',
    fixedTime: '08:15',
    scheduleLabel: 'Weekdays · 8:15 AM',
  },
  afternoon_from_school: {
    id: 'afternoon_from_school',
    label: 'Afternoon Walk from School',
    route: 'PS 150 → Home',
    fixedTime: '14:50',
    scheduleLabel: 'Weekdays · 2:50 PM',
  },
  after_school_home: {
    id: 'after_school_home',
    label: 'After-School Walk Home',
    route: 'Activity → Home',
    fixedTime: '17:15',
    scheduleLabel: 'Weekdays · 5:15 PM',
  },
}

export const BUILDING_WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']

export function formatHomeAddressDisplay({ streetNumber, streetName, zipCode }) {
  const number = streetNumber?.trim() ?? ''
  const name = streetName?.trim() ?? ''
  const zip = zipCode?.trim() ?? ''
  const streetLine = [number, name].filter(Boolean).join(' ')
  if (!streetLine && !zip) return ''
  return zip ? `${streetLine}, ${zip}` : streetLine
}

export function normalizeBuildingMatchKey(streetNumber, zipCode) {
  const number = streetNumber?.trim().toLowerCase().replace(/\s+/g, ' ') ?? ''
  const zip = zipCode?.trim().replace(/\D/g, '').slice(0, 5) ?? ''
  if (!number || !zip) return ''
  return `${number}|${zip}`
}

export function validateHomeAddressFields({ streetNumber, streetName, zipCode }) {
  const number = streetNumber?.trim() ?? ''
  const name = streetName?.trim() ?? ''
  const zip = zipCode?.trim() ?? ''

  if (!number) {
    return 'Enter a street number.'
  }
  if (!/\d/.test(number)) {
    return 'Street number must include a number (e.g. 123).'
  }
  if (!name || name.length < 2) {
    return 'Enter a street name (e.g. Warren Street).'
  }
  if (!/^\d{5}(-\d{4})?$/.test(zip)) {
    return 'Enter a valid 5-digit zip code (e.g. 10013).'
  }
  return null
}

function homeAddressFromProfile(profile) {
  return {
    streetNumber: profile.streetNumber?.trim() ?? '',
    streetName: profile.streetName?.trim() ?? '',
    zipCode: profile.zipCode?.trim() ?? '',
  }
}

function normalizeLocation(location) {
  if (!location || typeof location !== 'string') return ''
  return location.trim().toLowerCase().replace(/\s+/g, ' ')
}

function slotDocId(userId, walkType, activityId = null) {
  if (walkType === 'after_school_home' && activityId) {
    return `${userId}_${walkType}_${activityId}`
  }
  return `${userId}_${walkType}`
}

function buildMatchKey(walkType, buildingMatchKey, school, activityLocation = null) {
  if (walkType === 'after_school_home') {
    return `${walkType}|${buildingMatchKey}|${activityLocation}`
  }
  return `${walkType}|${buildingMatchKey}|${school}`
}

function partyKey(party) {
  return `${party.userId}:${party.childId}`
}

async function fetchUserChildren(userId) {
  const snapshot = await getDocs(collection(db, 'users', userId, 'children'))
  return snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))
}

function childrenForSchoolWalk(children, school) {
  return children.filter((child) => (child.school ?? DEFAULT_SCHOOL) === school)
}

function buildBuildingParty(userId, child, profile, walkTypeConfig, activityId = null) {
  return {
    userId,
    childId: child.id,
    childFirstName: child.firstName,
    activityId,
    startTime: walkTypeConfig.fixedTime,
    grade: child.grade,
    walkStatus: 'unconfirmed',
    response: 'accepted',
    days: BUILDING_WEEKDAYS,
    sessions: defaultSessions(),
    summerStartDate: null,
    summerEndDate: null,
    contactPhone: profile.phoneNumber || 'Not provided',
    parentName: profile.displayName || 'Parent',
  }
}

function buildMatchLocation(walkTypeConfig, homeAddressDisplay, activityLocation = null) {
  if (walkTypeConfig.id === 'after_school_home' && activityLocation) {
    return `${walkTypeConfig.label} · ${activityLocation} → ${homeAddressDisplay}`
  }
  return `${walkTypeConfig.label} · ${homeAddressDisplay}`
}

async function findMatchByKey(matchKey) {
  const snapshot = await getDocs(
    query(collection(db, 'matches'), where('matchKey', '==', matchKey)),
  )
  const buildingMatches = snapshot.docs.filter(
    (docSnap) => docSnap.data().matchType === 'building',
  )
  if (buildingMatches.length === 0) return null
  return { id: buildingMatches[0].id, ...buildingMatches[0].data() }
}

async function syncBuildingMatch({
  matchKey,
  walkType,
  walkTypeConfig,
  buildingMatchKey,
  streetNumber,
  streetName,
  zipCode,
  homeAddressDisplay,
  school,
  activityId,
  activityLocation,
  activityLocationDisplay,
}) {
  const slotsSnap = await getDocs(
    query(
      collection(db, 'buildingWalkSlots'),
      where('walkType', '==', walkType),
      where('buildingMatchKey', '==', buildingMatchKey),
    ),
  )

  let slots = slotsSnap.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))

  if (walkType === 'after_school_home') {
    slots = slots.filter((slot) => slot.activityLocation === activityLocation)
  } else {
    slots = slots.filter((slot) => slot.school === school)
  }

  const participantIds = [...new Set(slots.map((slot) => slot.userId))]
  const parties = []

  for (const slot of slots) {
    const profile = await getUserProfile(slot.userId)
    for (const child of slot.children ?? []) {
      parties.push(
        buildBuildingParty(
          slot.userId,
          child,
          profile,
          walkTypeConfig,
          walkType === 'after_school_home' ? slot.activityId : null,
        ),
      )
    }
  }

  parties.sort((a, b) => partyKey(a).localeCompare(partyKey(b)))

  const status =
    participantIds.length >= 2 && new Set(participantIds).size >= 2 ? 'connected' : 'solo'

  const matchData = {
    matchType: 'building',
    buildingWalkType: walkType,
    matchKey,
    status,
    participantIds,
    parties,
    buildingMatchKey,
    streetNumber,
    streetName,
    zipCode,
    homeAddressDisplay,
    school: school ?? DEFAULT_SCHOOL,
    location: buildMatchLocation(
      walkTypeConfig,
      homeAddressDisplay,
      activityLocationDisplay ?? activityLocation,
    ),
    day: 'Mon',
    scheduleDays: BUILDING_WEEKDAYS,
    startTime: walkTypeConfig.fixedTime,
    ...(walkType === 'after_school_home'
      ? {
          activityId,
          activityLocation,
          activityLocationDisplay,
        }
      : {}),
    updatedAt: serverTimestamp(),
  }

  const existing = await findMatchByKey(matchKey)

  if (participantIds.length === 0) {
    if (existing) await deleteDoc(doc(db, 'matches', existing.id))
    return null
  }

  if (existing) {
    await updateDoc(doc(db, 'matches', existing.id), matchData)
    return existing.id
  }

  const matchRef = await addDoc(collection(db, 'matches'), {
    ...matchData,
    createdAt: serverTimestamp(),
  })
  return matchRef.id
}

export function isBuildingWalkMatch(match) {
  return match?.matchType === 'building'
}

export async function joinBuildingWalk(userId, walkType, { activityId = null } = {}) {
  const walkTypeConfig = BUILDING_WALK_TYPES[walkType]
  if (!walkTypeConfig) {
    throw new Error('Unknown building walk type.')
  }

  const profile = await getUserProfile(userId)
  if (profile.matchingOptOut) {
    throw new Error('You have opted out of matching. Enable matching in Settings to join building walks.')
  }

  const addressFields = homeAddressFromProfile(profile)
  const validationError = validateHomeAddressFields(addressFields)
  if (validationError) {
    throw new Error(`Set your home address in Settings before joining. ${validationError}`)
  }

  const streetNumber = addressFields.streetNumber
  const streetName = addressFields.streetName
  const zipCode = addressFields.zipCode
  const buildingMatchKey = normalizeBuildingMatchKey(streetNumber, zipCode)
  const homeAddressDisplay = formatHomeAddressDisplay(addressFields)
  const school = profile.school ?? DEFAULT_SCHOOL
  const children = await fetchUserChildren(userId)

  let activity = null
  let activityLocation = null
  let activityLocationDisplay = null

  if (walkType === 'after_school_home') {
    if (!activityId) {
      throw new Error('Select an activity to join the after-school walk home.')
    }
    const activities = await fetchUserActivities(userId)
    activity = activities.find((item) => item.id === activityId)
    if (!activity) {
      throw new Error('Activity not found.')
    }
    activityLocation = normalizeLocation(activity.location)
    activityLocationDisplay = activity.location.trim()
    if (!activityLocation) {
      throw new Error('Activity must have a location.')
    }
  }

  const eligibleChildren = childrenForSchoolWalk(children, school)
  if (eligibleChildren.length === 0) {
    throw new Error(`Add a child enrolled at ${school} before joining this walk.`)
  }

  const slotRef = doc(db, 'buildingWalkSlots', slotDocId(userId, walkType, activityId))
  await setDoc(slotRef, {
    userId,
    walkType,
    buildingMatchKey,
    streetNumber,
    streetName,
    zipCode,
    homeAddressDisplay,
    school,
    children: eligibleChildren.map((child) => ({
      id: child.id,
      firstName: child.firstName,
      grade: child.grade,
      school: child.school ?? DEFAULT_SCHOOL,
    })),
    ...(walkType === 'after_school_home'
      ? {
          activityId,
          activityLocation,
          activityLocationDisplay,
        }
      : {}),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })

  const matchKey = buildMatchKey(walkType, buildingMatchKey, school, activityLocation)
  await syncBuildingMatch({
    matchKey,
    walkType,
    walkTypeConfig,
    buildingMatchKey,
    streetNumber,
    streetName,
    zipCode,
    homeAddressDisplay,
    school,
    activityId,
    activityLocation,
    activityLocationDisplay,
  })
}

export async function leaveBuildingWalk(userId, walkType, { activityId = null } = {}) {
  const walkTypeConfig = BUILDING_WALK_TYPES[walkType]
  if (!walkTypeConfig) {
    throw new Error('Unknown building walk type.')
  }

  const slotRef = doc(db, 'buildingWalkSlots', slotDocId(userId, walkType, activityId))
  const slotSnap = await getDoc(slotRef)
  if (!slotSnap.exists()) return

  const slot = slotSnap.data()
  const buildingMatchKey =
    slot.buildingMatchKey ??
    normalizeBuildingMatchKey(slot.streetNumber, slot.zipCode) ??
    slot.homeAddress
  const school = slot.school ?? DEFAULT_SCHOOL
  const activityLocation = slot.activityLocation ?? null

  const matchKey = buildMatchKey(walkType, buildingMatchKey, school, activityLocation)

  const existingMatch = await findMatchByKey(matchKey)
  if (existingMatch && (await getActiveSession(existingMatch.id))) {
    throw new Error('Cannot leave while a walk is in progress.')
  }

  await deleteDoc(slotRef)

  await syncBuildingMatch({
    matchKey,
    walkType,
    walkTypeConfig,
    buildingMatchKey,
    streetNumber: slot.streetNumber ?? '',
    streetName: slot.streetName ?? '',
    zipCode: slot.zipCode ?? '',
    homeAddressDisplay: slot.homeAddressDisplay ?? '',
    school,
    activityId: slot.activityId ?? null,
    activityLocation,
    activityLocationDisplay: slot.activityLocationDisplay ?? null,
  })
}

export function subscribeToBuildingWalkSlots(userId, onData, onError) {
  return onSnapshot(
    query(collection(db, 'buildingWalkSlots'), where('userId', '==', userId)),
    (snapshot) => {
      onData(snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() })))
    },
    onError,
  )
}

export function userHasBuildingWalkSlot(slots, walkType, activityId = null) {
  return slots.some((slot) => {
    if (slot.walkType !== walkType) return false
    if (walkType === 'after_school_home') {
      return slot.activityId === activityId
    }
    return true
  })
}

export function formatBuildingWalkTime(fixedTime) {
  if (!fixedTime) return ''
  const [hoursStr, minutesStr] = fixedTime.split(':')
  const hours = Number(hoursStr)
  const minutes = Number(minutesStr)
  const period = hours >= 12 ? 'PM' : 'AM'
  const displayHours = hours % 12 || 12
  return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`
}

export async function syncBuildingWalkChildren(userId) {
  const profile = await getUserProfile(userId)
  const addressFields = homeAddressFromProfile(profile)
  if (!addressFields.streetNumber || !addressFields.zipCode) return

  const streetNumber = addressFields.streetNumber
  const streetName = addressFields.streetName
  const zipCode = addressFields.zipCode
  const buildingMatchKey = normalizeBuildingMatchKey(streetNumber, zipCode)
  const homeAddressDisplay = formatHomeAddressDisplay(addressFields)
  const school = profile.school ?? DEFAULT_SCHOOL
  const children = await fetchUserChildren(userId)
  const eligibleChildren = childrenForSchoolWalk(children, school)

  const slotsSnap = await getDocs(
    query(collection(db, 'buildingWalkSlots'), where('userId', '==', userId)),
  )

  for (const slotDoc of slotsSnap.docs) {
    const slot = slotDoc.data()
    const walkType = slot.walkType
    const walkTypeConfig = BUILDING_WALK_TYPES[walkType]
    if (!walkTypeConfig) continue

    const previousBuildingMatchKey =
      slot.buildingMatchKey ??
      normalizeBuildingMatchKey(slot.streetNumber, slot.zipCode) ??
      slot.homeAddress
    const previousMatchKey = buildMatchKey(
      walkType,
      previousBuildingMatchKey,
      slot.school ?? DEFAULT_SCHOOL,
      slot.activityLocation ?? null,
    )

    await setDoc(
      slotDoc.ref,
      {
        buildingMatchKey,
        streetNumber,
        streetName,
        zipCode,
        homeAddressDisplay,
        school,
        children: eligibleChildren.map((child) => ({
          id: child.id,
          firstName: child.firstName,
          grade: child.grade,
          school: child.school ?? DEFAULT_SCHOOL,
        })),
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    )

    const matchKey = buildMatchKey(
      walkType,
      buildingMatchKey,
      school,
      slot.activityLocation ?? null,
    )

    if (previousBuildingMatchKey && previousMatchKey !== matchKey) {
      await syncBuildingMatch({
        matchKey: previousMatchKey,
        walkType,
        walkTypeConfig,
        buildingMatchKey: previousBuildingMatchKey,
        streetNumber: slot.streetNumber ?? '',
        streetName: slot.streetName ?? '',
        zipCode: slot.zipCode ?? '',
        homeAddressDisplay: slot.homeAddressDisplay ?? '',
        school: slot.school ?? DEFAULT_SCHOOL,
        activityId: slot.activityId ?? null,
        activityLocation: slot.activityLocation ?? null,
        activityLocationDisplay: slot.activityLocationDisplay ?? null,
      })
    }

    await syncBuildingMatch({
      matchKey,
      walkType,
      walkTypeConfig,
      buildingMatchKey,
      streetNumber,
      streetName,
      zipCode,
      homeAddressDisplay,
      school,
      activityId: slot.activityId ?? null,
      activityLocation: slot.activityLocation ?? null,
      activityLocationDisplay: slot.activityLocationDisplay ?? null,
    })
  }
}
