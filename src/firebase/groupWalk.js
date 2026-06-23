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

async function findSessionChild(sessionId, userId, childId, childDocKey) {
  const candidateIds = [
    childDocKey,
    userId && childId ? childDocId(userId, childId) : null,
  ].filter(Boolean)

  console.log('[dropOff] findSessionChild', {
    sessionId,
    userId,
    childId,
    childDocKey,
    candidateIds,
  })

  for (const docId of candidateIds) {
    const childRef = doc(db, 'walkSessions', sessionId, 'children', docId)
    const childSnap = await getDoc(childRef)
    console.log('[dropOff] candidate lookup', { docId, exists: childSnap.exists() })
    if (childSnap.exists()) {
      return { childRef, childSnap, resolvedChildDocId: docId }
    }
  }

  const childrenSnap = await getDocs(collection(db, 'walkSessions', sessionId, 'children'))
  const sessionChildren = childrenSnap.docs.map((docSnap) => ({
    id: docSnap.id,
    ...docSnap.data(),
  }))
  console.log('[dropOff] session children snapshot', {
    count: sessionChildren.length,
    children: sessionChildren.map((child) => ({
      id: child.id,
      userId: child.userId,
      childId: child.childId,
      walkStatus: child.walkStatus,
    })),
  })

  const matched = childrenSnap.docs.find((docSnap) => {
    const data = docSnap.data()
    return data.userId === userId && data.childId === childId
  })

  if (matched) {
    console.log('[dropOff] matched child by userId+childId', { docId: matched.id })
    return {
      childRef: matched.ref,
      childSnap: matched,
      resolvedChildDocId: matched.id,
    }
  }

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
  console.log('[dropOff] markChildDroppedOff called', {
    sessionId,
    userId,
    childId,
    childDocKey,
  })

  if (!sessionId) {
    throw new Error('No active walk session. Refresh the page and try again.')
  }

  const sessionRef = doc(db, 'walkSessions', sessionId)
  console.log('[dropOff] loading walk session', { path: sessionRef.path })
  const sessionSnap = await getDoc(sessionRef)
  if (!sessionSnap.exists()) {
    console.error('[dropOff] walk session not found', { sessionId })
    throw new Error('This walk session no longer exists. Refresh the page and try again.')
  }

  const session = sessionSnap.data()
  console.log('[dropOff] walk session loaded', {
    groupId: session.groupId,
    status: session.status,
    dateKey: session.dateKey,
  })

  const located = await findSessionChild(sessionId, userId, childId, childDocKey)
  if (!located) {
    console.error('[dropOff] child document not found in session', {
      sessionId,
      userId,
      childId,
      childDocKey,
    })
    throw new Error(
      'This child is not part of the active walk session. Refresh the page and try again.',
    )
  }

  const { childRef, childSnap, resolvedChildDocId } = located
  const child = childSnap.data()
  console.log('[dropOff] child document loaded', {
    path: childRef.path,
    walkStatus: child.walkStatus,
    historyId: child.historyId,
    childFirstName: child.childFirstName,
  })

  if (child.walkStatus === 'absent') {
    throw new Error(`${child.childFirstName || 'This child'} is marked absent and cannot be dropped off.`)
  }
  if (child.walkStatus === 'dropped_off') {
    throw new Error(`${child.childFirstName || 'This child'} is already marked as dropped off.`)
  }

  console.log('[dropOff] updating child document', { path: childRef.path })
  const droppedOffAt = serverTimestamp()
  try {
    await updateDoc(childRef, {
      walkStatus: 'dropped_off',
      droppedOffAt,
    })
    console.log('[dropOff] child document updated successfully')
  } catch (error) {
    console.error('[dropOff] child document update failed', error)
    throw error
  }

  const resolvedUserId = child.userId ?? userId
  const resolvedChildId = child.childId ?? childId

  console.log('[dropOff] syncing walk history', {
    historyId: child.historyId,
    userId: resolvedUserId,
    childId: resolvedChildId,
  })
  try {
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
    console.log('[dropOff] walk history synced successfully')
  } catch (error) {
    // Child drop-off is saved; history sync is best-effort so a history failure
    // must not leave the UI stuck or roll back the drop-off.
    console.error('[dropOff] walk history sync failed (drop-off still saved)', error)
  }

  console.log('[dropOff] checking if walk should complete', { sessionId })
  const childrenSnap = await getDocs(collection(db, 'walkSessions', sessionId, 'children'))
  const children = childrenSnap.docs.map((docSnap) => {
    if (docSnap.id === resolvedChildDocId) {
      return { ...docSnap.data(), walkStatus: 'dropped_off' }
    }
    return docSnap.data()
  })

  const allDroppedOff = shouldCompleteWalk(children)
  console.log('[dropOff] walk completion check', {
    activeChildren: children.filter((entry) => entry.walkStatus !== 'absent').length,
    droppedOffChildren: children.filter((entry) => entry.walkStatus === 'dropped_off').length,
    allDroppedOff,
  })

  if (allDroppedOff) {
    console.log('[dropOff] completing walk session', { path: sessionRef.path })
    try {
      await updateDoc(sessionRef, {
        status: 'completed',
        completedAt: serverTimestamp(),
      })
      console.log('[dropOff] walk session marked completed')
    } catch (error) {
      console.error('[dropOff] walk session completion failed (drop-off still saved)', error)
      throw error
    }
  }

  console.log('[dropOff] markChildDroppedOff finished successfully')
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
