import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  where,
} from 'firebase/firestore'
import { db } from './db'
import { isAbsentOnDate } from './groupWalk'
import { getActiveLeaders } from './groupLeaders'
import {
  formatDisplayDate,
  getCurrentSessionKey,
  getGroupUpcomingScheduledDates,
  getSessionKeyForDate,
  isDateInSession,
  isPartyScheduledOnDate,
  todayKey,
} from './sessions'

export const KIDS_PER_LEADER = 4

function volunteerDocId(groupId, userId, scope, key) {
  if (scope === 'semester') {
    return `${groupId}_${userId}_semester_${key}`
  }
  return `${groupId}_${userId}_date_${key}`
}

export function requiredLeadersForKids(kidCount) {
  if (kidCount <= 0) return 0
  return Math.ceil(kidCount / KIDS_PER_LEADER)
}

export function countConfirmedKidsOnDate(parties, absences, groupDay, dateKey) {
  return parties.filter((party) => {
    if (party.response === 'declined') return false
    if (!isPartyScheduledOnDate(party, dateKey, groupDay)) return false
    return !isAbsentOnDate(absences, party.userId, party.childId, dateKey)
  }).length
}

export function getLeadersForDate(volunteers, dateKey, group = null) {
  const sessionKey = getSessionKeyForDate(dateKey)
  const leaders = new Map()

  for (const volunteer of volunteers) {
    if (volunteer.scope === 'date' && volunteer.dateKey === dateKey) {
      leaders.set(volunteer.userId, volunteer.leaderName)
    }
    if (volunteer.scope === 'semester' && volunteer.sessionKey === sessionKey) {
      leaders.set(volunteer.userId, volunteer.leaderName)
    }
  }

  for (const leader of getActiveLeaders(group)) {
    if (leader.userId && leader.role !== 'parent') {
      leaders.set(leader.userId, leader.name)
    }
  }

  return [...leaders.entries()].map(([userId, leaderName]) => ({ userId, leaderName }))
}

export function getDateCoverageStatus({ kidCount, leaderCount }) {
  const required = requiredLeadersForKids(kidCount)
  if (kidCount <= 0) {
    return { required, leaderCount, sufficient: true, hasWalk: false }
  }
  return {
    required,
    leaderCount,
    sufficient: leaderCount >= required,
    hasWalk: true,
  }
}

export function subscribeToLeaderVolunteers(groupId, onData, onError) {
  if (!groupId) {
    onData([])
    return () => {}
  }

  return onSnapshot(
    query(collection(db, 'leaderVolunteers'), where('groupId', '==', groupId)),
    (snapshot) => {
      onData(snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() })))
    },
    onError,
  )
}

export async function volunteerForSemester(groupId, userId, leaderName) {
  const sessionKey = getCurrentSessionKey()
  const docId = volunteerDocId(groupId, userId, 'semester', sessionKey)

  await setDoc(doc(db, 'leaderVolunteers', docId), {
    groupId,
    userId,
    leaderName: leaderName?.trim() || 'Parent',
    scope: 'semester',
    sessionKey,
    dateKey: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
}

export async function volunteerForDates(groupId, userId, leaderName, dateKeys) {
  const trimmedName = leaderName?.trim() || 'Parent'
  const uniqueDates = [...new Set(dateKeys.filter(Boolean))]

  if (uniqueDates.length === 0) {
    throw new Error('Select at least one date to volunteer.')
  }

  await Promise.all(
    uniqueDates.map((dateKey) => {
      const docId = volunteerDocId(groupId, userId, 'date', dateKey)
      return setDoc(doc(db, 'leaderVolunteers', docId), {
        groupId,
        userId,
        leaderName: trimmedName,
        scope: 'date',
        sessionKey: getSessionKeyForDate(dateKey),
        dateKey,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    }),
  )
}

export async function removeLeaderVolunteer(volunteerId) {
  await deleteDoc(doc(db, 'leaderVolunteers', volunteerId))
}

export function userVolunteerEntries(volunteers, userId) {
  return volunteers.filter((volunteer) => volunteer.userId === userId)
}

export function getUpcomingScheduleEntries(group, volunteers, absences, fromDateKey = todayKey()) {
  const parties = (group?.parties ?? []).filter((party) => party.response !== 'declined')
  const dateKeys = getGroupUpcomingScheduledDates(group, fromDateKey)

  return dateKeys.map((dateKey) => {
    const kidCount = countConfirmedKidsOnDate(parties, absences, group.day, dateKey)
    const leaders = getLeadersForDate(volunteers, dateKey, group)
    const coverage = getDateCoverageStatus({ kidCount, leaderCount: leaders.length })

    return {
      dateKey,
      kidCount,
      leaders,
      ...coverage,
    }
  })
}

export async function syncRatioAlert(groupId, dateKey, needsAlert, sendAlert) {
  const alertRef = doc(db, 'ratioAlerts', `${groupId}_${dateKey}`)

  if (!needsAlert) {
    const existing = await getDoc(alertRef)
    if (existing.exists()) {
      await deleteDoc(alertRef)
    }
    return
  }

  const existing = await getDoc(alertRef)
  if (existing.exists()) return

  await setDoc(alertRef, {
    groupId,
    dateKey,
    createdAt: serverTimestamp(),
  })

  await sendAlert(
    `This walk may need more leaders on ${formatDisplayDate(dateKey)}. Can anyone volunteer?`,
  )
}

export async function recordRatioAlertMessage(groupId, text) {
  await addDoc(collection(db, 'walkGroups', groupId, 'messages'), {
    userId: 'system',
    displayName: 'KidsRoute',
    text,
    isAlert: true,
    sessionKey: getCurrentSessionKey(),
    createdAt: serverTimestamp(),
  })
}
