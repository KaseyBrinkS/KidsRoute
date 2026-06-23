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
import { isPartyScheduledOnDate, todayKey } from './sessions'
import { createWalkHistoryEntry, syncWalkHistoryDropOff } from './walkHistory'

export const CHILD_WALK_STATUSES = {
  confirmed: { label: 'Confirmed', style: 'bg-green-50 text-green-700' },
  absent: { label: 'Absent', style: 'bg-gray-100 text-gray-600' },
  off_day: { label: 'No class today', style: 'bg-slate-50 text-slate-600' },
  dropped_off: { label: 'Dropped off', style: 'bg-indigo-50 text-indigo-700' },
}

function isActiveTodaySession(session) {
  return session.status === 'started' && session.dateKey === todayKey()
}

function childDocId(userId, childId) {
  return `${userId}_${childId}`
}

function resolveSessionChildDocId(userId, childId, childDocKey) {
  if (childDocKey) return childDocKey
  if (userId && childId) return childDocId(userId, childId)
  return null
}

function singleAbsenceDocId(groupId, userId, childId, dateKey) {
  return `${groupId}_${userId}_${childId}_${dateKey}`
}

function rangeAbsenceDocId(groupId, userId, childId, startDateKey, endDateKey) {
  return `${groupId}_${userId}_${childId}_${startDateKey}_${endDateKey}`
}

export function getChildWalkStatus(party) {
  const status = party.walkStatus || 'off_day'
  return CHILD_WALK_STATUSES[status] ?? CHILD_WALK_STATUSES.off_day
}

export function normalizeParty(party) {
  return {
    ...party,
    walkStatus: party.walkStatus || 'off_day',
    parentName: party.parentName || 'Parent',
    contactPhone: party.contactPhone || 'Not provided',
  }
}

export function isAbsentOnDate(absences, userId, childId, dateKey) {
  return absences.some((absence) => {
    if (absence.userId !== userId || absence.childId !== childId) return false
    if (absence.type === 'range') {
      return dateKey >= absence.startDateKey && dateKey <= absence.endDateKey
    }
    return absence.dateKey === dateKey
  })
}

export function expandAbsenceDates(absence) {
  if (absence.type === 'range') {
    const dates = []
    const current = parseDateKeyLocal(absence.startDateKey)
    const end = parseDateKeyLocal(absence.endDateKey)
    while (current <= end) {
      dates.push(formatDateKeyLocal(current))
      current.setDate(current.getDate() + 1)
    }
    return dates
  }
  return [absence.dateKey]
}

function parseDateKeyLocal(dateKey) {
  const [year, month, day] = dateKey.split('-').map(Number)
  return new Date(year, month - 1, day, 12, 0, 0, 0)
}

function formatDateKeyLocal(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function getUpcomingAbsences(absences, userId, childId, fromDateKey = todayKey()) {
  return absences
    .filter((absence) => absence.userId === userId && absence.childId === childId)
    .map((absence) => ({
      ...absence,
      dates: expandAbsenceDates(absence).filter((dateKey) => dateKey >= fromDateKey),
    }))
    .filter((absence) => absence.dates.length > 0)
    .sort((a, b) => a.dates[0].localeCompare(b.dates[0]))
}

export function subscribeToGroup(groupId, onData, onError) {
  return onSnapshot(
    doc(db, 'matches', groupId),
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

export function subscribeToActiveWalkSession(groupId, onData, onError) {
  return onSnapshot(
    query(collection(db, 'walkSessions'), where('groupId', '==', groupId)),
    (snapshot) => {
      const session =
        snapshot.docs
          .map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))
          .find(isActiveTodaySession) ?? null
      onData(session)
    },
    onError,
  )
}

export function subscribeToWalkSessionChildren(sessionId, onData, onError) {
  return onSnapshot(
    collection(db, 'walkSessions', sessionId, 'children'),
    (snapshot) => {
      onData(
        snapshot.docs.map((docSnap) => ({
          ...docSnap.data(),
          id: docSnap.id,
        })),
      )
    },
    onError,
  )
}

export function subscribeToGroupAbsences(groupId, onData, onError) {
  return onSnapshot(
    query(collection(db, 'groupAbsences'), where('groupId', '==', groupId)),
    (snapshot) => {
      onData(snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() })))
    },
    onError,
  )
}

async function fetchGroup(groupId) {
  const snapshot = await getDoc(doc(db, 'matches', groupId))
  if (!snapshot.exists()) return null
  return { id: snapshot.id, ...snapshot.data() }
}

export async function getActiveSession(groupId) {
  const snapshot = await getDocs(
    query(collection(db, 'walkSessions'), where('groupId', '==', groupId)),
  )
  return (
    snapshot.docs
      .map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))
      .find(isActiveTodaySession) ?? null
  )
}

function shouldCompleteWalk(children) {
  const active = children.filter((child) => child.walkStatus !== 'absent')
  return active.length > 0 && active.every((child) => child.walkStatus === 'dropped_off')
}

function resolveWalkStatus(absent, scheduledToday) {
  if (absent) return 'absent'
  if (scheduledToday) return 'confirmed'
  return 'off_day'
}

export function mergePartiesWithScheduleStatus(parties, absences, matchDay, dateKey = todayKey()) {
  return parties.map(normalizeParty).map((party) => {
    const scheduledToday = isPartyScheduledOnDate(party, dateKey, matchDay)
    const absent = isAbsentOnDate(absences, party.userId, party.childId, dateKey)

    return {
      ...party,
      walkStatus: resolveWalkStatus(absent, scheduledToday),
      scheduledToday,
    }
  })
}

export async function startGroupWalk(groupId, leaderId) {
  const match = await fetchGroup(groupId)
  if (!match) return

  if (await getActiveSession(groupId)) {
    throw new Error('A walk is already in progress for this group.')
  }

  const today = todayKey()
  const absencesSnap = await getDocs(
    query(collection(db, 'groupAbsences'), where('groupId', '==', groupId)),
  )
  const absences = absencesSnap.docs.map((docSnap) => docSnap.data())

  const sessionRef = await addDoc(collection(db, 'walkSessions'), {
    groupId,
    participantIds: match.participantIds,
    location: match.location,
    scheduleDay: match.day,
    dateKey: today,
    status: 'started',
    startedAt: serverTimestamp(),
    completedAt: null,
    leaderId,
    createdAt: serverTimestamp(),
  })

  for (const party of match.parties.map(normalizeParty)) {
    const absent = isAbsentOnDate(absences, party.userId, party.childId, today)
    const walkStatus = absent ? 'absent' : 'confirmed'

    let historyId = null
    const pickedUpAt = walkStatus === 'confirmed' ? serverTimestamp() : null

    if (walkStatus === 'confirmed') {
      const historyRef = await createWalkHistoryEntry({
        userId: party.userId,
        childId: party.childId,
        childFirstName: party.childFirstName,
        groupId,
        sessionId: sessionRef.id,
        location: match.location,
        scheduleDay: match.day,
      })
      historyId = historyRef.id
    }

    await setDoc(
      doc(db, 'walkSessions', sessionRef.id, 'children', childDocId(party.userId, party.childId)),
      {
        userId: party.userId,
        childId: party.childId,
        childFirstName: party.childFirstName,
        parentName: party.parentName,
        contactPhone: party.contactPhone,
        walkStatus,
        historyId,
        pickedUpAt,
        droppedOffAt: null,
      },
    )
  }

  return sessionRef.id
}

export async function markChildDroppedOff(sessionId, userId, childId, childDocKey = null) {
  if (!sessionId) {
    throw new Error('No active walk session. Refresh the page and try again.')
  }

  const resolvedChildDocId = resolveSessionChildDocId(userId, childId, childDocKey)
  if (!resolvedChildDocId) {
    throw new Error('Could not identify which child to mark as dropped off.')
  }

  const sessionRef = doc(db, 'walkSessions', sessionId)
  const sessionSnap = await getDoc(sessionRef)
  if (!sessionSnap.exists()) {
    throw new Error('This walk session no longer exists. Refresh the page and try again.')
  }

  const session = sessionSnap.data()
  const childRef = doc(db, 'walkSessions', sessionId, 'children', resolvedChildDocId)
  const childSnap = await getDoc(childRef)
  if (!childSnap.exists()) {
    throw new Error('This child is not part of the active walk session.')
  }

  const child = childSnap.data()
  if (child.walkStatus === 'absent') {
    throw new Error(`${child.childFirstName || 'This child'} is marked absent and cannot be dropped off.`)
  }
  if (child.walkStatus === 'dropped_off') {
    throw new Error(`${child.childFirstName || 'This child'} is already marked as dropped off.`)
  }

  const droppedOffAt = serverTimestamp()
  await updateDoc(childRef, {
    walkStatus: 'dropped_off',
    droppedOffAt,
  })

  const resolvedUserId = child.userId ?? userId
  const resolvedChildId = child.childId ?? childId

  await syncWalkHistoryDropOff({
    historyId: child.historyId,
    userId: resolvedUserId,
    childId: resolvedChildId,
    childFirstName: child.childFirstName,
    groupId: session.groupId,
    sessionId,
    location: session.location,
    scheduleDay: session.scheduleDay,
    pickedUpAt: child.pickedUpAt ?? session.startedAt,
  })

  const childrenSnap = await getDocs(collection(db, 'walkSessions', sessionId, 'children'))
  const children = childrenSnap.docs.map((docSnap) => {
    if (docSnap.id === resolvedChildDocId) {
      return { ...docSnap.data(), walkStatus: 'dropped_off' }
    }
    return docSnap.data()
  })

  if (shouldCompleteWalk(children)) {
    await updateDoc(sessionRef, {
      status: 'completed',
      completedAt: serverTimestamp(),
    })
  }
}

export async function markAbsentSingleDate({
  groupId,
  userId,
  childId,
  childFirstName,
  activityId,
  dateKey,
}) {
  if (await getActiveSession(groupId)) {
    throw new Error('Cannot mark absent while a walk is in progress.')
  }

  await setDoc(
    doc(db, 'groupAbsences', singleAbsenceDocId(groupId, userId, childId, dateKey)),
    {
      groupId,
      userId,
      childId,
      childFirstName,
      activityId,
      type: 'single',
      dateKey,
      createdAt: serverTimestamp(),
    },
  )
}

export async function markAbsentDateRange({
  groupId,
  userId,
  childId,
  childFirstName,
  activityId,
  startDateKey,
  endDateKey,
}) {
  if (await getActiveSession(groupId)) {
    throw new Error('Cannot mark absent while a walk is in progress.')
  }

  if (startDateKey > endDateKey) {
    throw new Error('End date must be on or after the start date.')
  }

  await setDoc(
    doc(
      db,
      'groupAbsences',
      rangeAbsenceDocId(groupId, userId, childId, startDateKey, endDateKey),
    ),
    {
      groupId,
      userId,
      childId,
      childFirstName,
      activityId,
      type: 'range',
      startDateKey,
      endDateKey,
      createdAt: serverTimestamp(),
    },
  )
}

export async function clearAbsence(absenceId) {
  await deleteDoc(doc(db, 'groupAbsences', absenceId))
}
