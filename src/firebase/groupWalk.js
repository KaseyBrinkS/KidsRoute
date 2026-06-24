import {
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
  writeBatch,
} from 'firebase/firestore'
import { db } from './db'
import { isPartyScheduledOnDate, todayKey } from './sessions'
import { syncWalkHistoryDropOff, createWalkHistoryEntry } from './walkHistory'
import { isFirestorePermissionError } from './errors'
import {
  getActiveParties as getWalkGroupActiveParties,
  resolveWalkGroupParticipantIds,
} from './walkGroups'
import { getActiveParties as getMatchActiveParties } from './matching'
import { isUserActiveLeader } from './groupLeaders'

const START_WALK_MAX_ATTEMPTS = 3
const START_WALK_RETRY_MS = 1000
const DROP_OFF_MAX_ATTEMPTS = 3
const DROP_OFF_RETRY_MS = 1000

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function withPermissionRetries(operation, label, maxAttempts = 3, delayMs = 1000) {
  let lastError = null
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await operation(attempt)
    } catch (error) {
      lastError = error
      if (!isFirestorePermissionError(error) || attempt === maxAttempts) {
        throw error
      }
      console.warn(`[${label}] permission error on attempt ${attempt}, retrying…`, error)
      await sleep(delayMs * attempt)
    }
  }
  throw lastError
}

export const CHILD_WALK_STATUSES = {
  waiting_arrival: { label: 'Not arrived', style: 'bg-yellow-50 text-yellow-800' },
  confirmed: { label: 'Arrived', style: 'bg-green-50 text-green-700' },
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
  return subscribeToGroupDocument(groupId, onData, onError)
}

export function subscribeToGroupDocument(groupId, onData, onError) {
  let matchUnsubscribe = null

  const walkGroupUnsubscribe = onSnapshot(
    doc(db, 'walkGroups', groupId),
    (walkGroupSnap) => {
      if (walkGroupSnap.exists()) {
        if (matchUnsubscribe) {
          matchUnsubscribe()
          matchUnsubscribe = null
        }
        onData({ id: walkGroupSnap.id, source: 'walkGroup', ...walkGroupSnap.data() })
        return
      }

      if (!matchUnsubscribe) {
        matchUnsubscribe = onSnapshot(
          doc(db, 'matches', groupId),
          (matchSnap) => {
            if (!matchSnap.exists()) {
              onData(null)
              return
            }
            onData({ id: matchSnap.id, source: 'match', ...matchSnap.data() })
          },
          onError,
        )
      }
    },
    onError,
  )

  return () => {
    walkGroupUnsubscribe()
    if (matchUnsubscribe) matchUnsubscribe()
  }
}

export function subscribeToActiveWalkSession(groupId, userId, onData, onError, options = {}) {
  if (!groupId || !userId) {
    onData(null)
    return () => {}
  }

  const leaderAccess = options.leaderAccess === true

  return onSnapshot(
    walkSessionsQuery(groupId, userId, { leaderAccess }),
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

export function subscribeToGroupAbsences(groupId, userId, onData, onError, options = {}) {
  if (!groupId || !userId) {
    onData([])
    return () => {}
  }

  const leaderAccess = options.leaderAccess === true

  return onSnapshot(
    groupAbsencesQuery(groupId, userId, { leaderAccess }),
    (snapshot) => {
      onData(snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() })))
    },
    onError,
  )
}

export function subscribeToUserActiveWalkSessions(userId, onData, onError) {
  if (!userId) {
    onData({})
    return () => {}
  }

  return onSnapshot(
    query(
      collection(db, 'walkSessions'),
      where('participantIds', 'array-contains', userId),
    ),
    (snapshot) => {
      const sessionsByGroup = {}
      for (const docSnap of snapshot.docs) {
        const session = { id: docSnap.id, ...docSnap.data() }
        if (session.status === 'started' && session.dateKey === todayKey()) {
          sessionsByGroup[session.groupId] = session
        }
      }
      onData(sessionsByGroup)
    },
    onError,
  )
}

async function fetchGroupDocument(groupId) {
  const walkGroupSnap = await getDoc(doc(db, 'walkGroups', groupId))
  if (walkGroupSnap.exists()) {
    return { id: walkGroupSnap.id, source: 'walkGroup', ...walkGroupSnap.data() }
  }

  const matchSnap = await getDoc(doc(db, 'matches', groupId))
  if (matchSnap.exists()) {
    return { id: matchSnap.id, source: 'match', ...matchSnap.data() }
  }

  return null
}

export function resolveGroupParticipantIds(group) {
  if (!group) return []
  if (group.source === 'walkGroup') return resolveWalkGroupParticipantIds(group)
  return resolveMatchParticipantIds(group)
}

export function getGroupWalkParties(group) {
  if (!group) return []
  if (group.source === 'walkGroup') return getWalkGroupActiveParties(group)
  if (group.matchType === 'building') {
    return (group.parties ?? []).filter((party) => party.response === 'accepted')
  }
  return getMatchActiveParties(group)
}

export function resolveMatchParticipantIds(match) {
  if (!match) return []
  if (match.participantIds?.length > 0) return match.participantIds
  return [...new Set((match.parties ?? []).map((party) => party.userId))]
}

function participantIdsMatch(serverIds, derivedIds) {
  const left = serverIds ?? []
  const right = derivedIds ?? []
  if (left.length !== right.length) return false
  const rightSet = new Set(right)
  return left.every((id) => rightSet.has(id))
}

function logStartWalkPreWrite(attempt, leaderId, groupId, match, extra = {}) {
  const matchParticipantIds = match.participantIds ?? []
  console.log('[startWalk] pre-write context', {
    attempt,
    uid: leaderId,
    groupId,
    matchDocumentId: groupId,
    matchParticipantIds,
    uidInMatchParticipantIds: matchParticipantIds.includes(leaderId),
    ...extra,
  })
}

async function ensureWalkGroupParticipantIds(groupId, group, leaderId) {
  const derivedIds = resolveWalkGroupParticipantIds(group)
  const storedIds = group.participantIds ?? []
  const mergedIds = [...new Set([...storedIds, ...derivedIds])]

  if (participantIdsMatch(storedIds, mergedIds)) {
    return mergedIds
  }

  if (mergedIds.length === 0) {
    console.warn('[startWalk] no participantIds derived from walk group', { groupId })
    return mergedIds
  }

  if (!mergedIds.includes(leaderId)) {
    return mergedIds
  }

  const groupRef = doc(db, 'walkGroups', groupId)
  try {
    await updateDoc(groupRef, { participantIds: mergedIds })
    console.log('[startWalk] synced walkGroup.participantIds', { groupId, participantIds: mergedIds })
  } catch (error) {
    console.warn('[startWalk] sync walkGroup.participantIds failed (continuing with derived list)', {
      groupId,
      error,
    })
  }

  return mergedIds
}

async function ensureGroupParticipantIds(groupId, group, leaderId) {
  if (group.source === 'walkGroup') {
    return ensureWalkGroupParticipantIds(groupId, group, leaderId)
  }
  return ensureMatchParticipantIds(groupId, group, leaderId)
}

async function ensureMatchParticipantIds(groupId, match, leaderId) {
  const derivedIds = resolveMatchParticipantIds(match)

  if (participantIdsMatch(match.participantIds, derivedIds)) {
    return derivedIds
  }

  if (derivedIds.length === 0) {
    console.warn('[startWalk] no participantIds derived from match', { groupId })
    return derivedIds
  }

  if (!derivedIds.includes(leaderId)) {
    return derivedIds
  }

  const matchRef = doc(db, 'matches', groupId)
  try {
    await updateDoc(matchRef, { participantIds: derivedIds })
    console.log('[startWalk] synced match.participantIds', { groupId, participantIds: derivedIds })
  } catch (error) {
    console.warn('[startWalk] sync match.participantIds failed (continuing with derived list)', {
      groupId,
      error,
    })
  }

  return derivedIds
}

function walkSessionsQuery(groupId, userId, { leaderAccess = false } = {}) {
  if (leaderAccess) {
    return query(collection(db, 'walkSessions'), where('groupId', '==', groupId))
  }
  return query(
    collection(db, 'walkSessions'),
    where('groupId', '==', groupId),
    where('participantIds', 'array-contains', userId),
  )
}

function groupAbsencesQuery(groupId, userId, { leaderAccess = false } = {}) {
  if (leaderAccess) {
    return query(collection(db, 'groupAbsences'), where('groupId', '==', groupId))
  }
  return query(
    collection(db, 'groupAbsences'),
    where('groupId', '==', groupId),
    where('participantIds', 'array-contains', userId),
  )
}

async function fetchGroupAbsences(groupId, userId, options = {}) {
  try {
    const snapshot = await getDocs(groupAbsencesQuery(groupId, userId, options))
    return snapshot.docs.map((docSnap) => docSnap.data())
  } catch (error) {
    if (isFirestorePermissionError(error)) return []
    throw error
  }
}

export async function getActiveSession(groupId, userId, options = {}) {
  if (!groupId || !userId) return null

  try {
    const snapshot = await getDocs(walkSessionsQuery(groupId, userId, options))
    return (
      snapshot.docs
        .map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))
        .find(isActiveTodaySession) ?? null
    )
  } catch (error) {
    if (isFirestorePermissionError(error)) return null
    throw error
  }
}

function isActiveSessionChild(child) {
  return child.walkStatus !== 'absent'
}

export function isWalkSessionComplete(children) {
  const walking = children.filter(isActiveSessionChild)
  if (walking.length === 0) return true
  return walking.every((child) => child.walkStatus === 'dropped_off')
}

export function mergeWalkSessionChildren(sessionChildren, walkParties) {
  const sessionByKey = new Map(
    sessionChildren.map((child) => [`${child.userId}_${child.childId}`, child]),
  )
  const partyKeys = new Set()

  const merged = walkParties.map((party) => {
    const key = `${party.userId}_${party.childId}`
    partyKeys.add(key)
    const existing = sessionByKey.get(key)
    if (existing) return existing

    return {
      ...normalizeParty(party),
      id: childDocId(party.userId, party.childId),
      walkStatus: 'waiting_arrival',
      pickedUpAt: null,
      droppedOffAt: null,
      historyId: null,
      _missingFromSession: true,
    }
  })

  for (const child of sessionChildren) {
    const key = `${child.userId}_${child.childId}`
    if (!partyKeys.has(key)) {
      merged.push(child)
    }
  }

  return merged
}

export async function ensureSessionChildRecord(sessionId, party, session) {
  const docId = childDocId(party.userId, party.childId)
  const childRef = doc(db, 'walkSessions', sessionId, 'children', docId)
  const childSnap = await getDoc(childRef)
  if (childSnap.exists()) {
    return { childRef, childSnap, resolvedChildDocId: docId }
  }

  const usePerKidArrival = session.groupSource === 'walkGroup'
  const walkStatus = usePerKidArrival ? 'waiting_arrival' : 'confirmed'

  await setDoc(childRef, {
    userId: party.userId,
    childId: party.childId,
    childFirstName: party.childFirstName,
    parentName: party.parentName || 'Parent',
    contactPhone: party.contactPhone || 'Not provided',
    walkStatus,
    historyId: null,
    pickedUpAt: walkStatus === 'confirmed' ? serverTimestamp() : null,
    droppedOffAt: null,
  })

  const createdSnap = await getDoc(childRef)
  return { childRef, childSnap: createdSnap, resolvedChildDocId: docId }
}

export async function completeWalkSession(sessionId) {
  if (!sessionId) {
    throw new Error('No active walk session.')
  }

  const sessionRef = doc(db, 'walkSessions', sessionId)
  await updateDoc(sessionRef, {
    status: 'completed',
    completedAt: serverTimestamp(),
  })
}

async function loadSessionChildren(sessionId) {
  const childrenSnap = await getDocs(collection(db, 'walkSessions', sessionId, 'children'))
  return childrenSnap.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))
}

async function ensureSessionCompleted(sessionId, sessionData, children) {
  if (sessionData.status === 'completed') return true
  if (!isWalkSessionComplete(children)) return false

  const sessionRef = doc(db, 'walkSessions', sessionId)
  await updateDoc(sessionRef, {
    status: 'completed',
    completedAt: serverTimestamp(),
  })
  return true
}

export async function verifyDropOffSaved(sessionId, userId, childId, childDocKey = null) {
  const located = await findSessionChild(sessionId, userId, childId, childDocKey)
  if (!located) {
    return { saved: false, walkComplete: false, sessionComplete: false }
  }

  const child = located.childSnap.data()
  const sessionSnap = await getDoc(doc(db, 'walkSessions', sessionId))
  const session = sessionSnap.exists() ? sessionSnap.data() : null
  const children = await loadSessionChildren(sessionId)
  const walkComplete = isWalkSessionComplete(children)

  return {
    saved: child.walkStatus === 'dropped_off',
    walkComplete,
    sessionComplete: session?.status === 'completed' || walkComplete,
  }
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

export async function startGroupWalk(groupId, leaderId, { group: prefetchedGroup = null } = {}) {
  return withPermissionRetries(async (attempt) => {
    const group =
      attempt === 1 && prefetchedGroup ? prefetchedGroup : await fetchGroupDocument(groupId)
    if (!group) {
      throw new Error('Group not found. Refresh the page and try again.')
    }

    let sessionParticipantIds
    try {
      sessionParticipantIds = await ensureGroupParticipantIds(groupId, group, leaderId)
    } catch (error) {
      console.error('[startWalk] ensureGroupParticipantIds failed', { groupId, leaderId, error })
      throw error
    }

    const leaderAccess = group.source === 'walkGroup' && isUserActiveLeader(group, leaderId)
    if (!sessionParticipantIds.includes(leaderId) && !leaderAccess) {
      throw new Error('You are not authorized to lead this group. Refresh the page and try again.')
    }

    if (leaderAccess && !sessionParticipantIds.includes(leaderId)) {
      sessionParticipantIds = [...sessionParticipantIds, leaderId]
    }

    if (await getActiveSession(groupId, leaderId, { leaderAccess })) {
      throw new Error('A walk is already in progress for this group.')
    }

    const today = todayKey()
    const absences = await fetchGroupAbsences(groupId, leaderId, { leaderAccess })
    const walkParties = getGroupWalkParties(group).map(normalizeParty)

    if (walkParties.length === 0) {
      throw new Error('No accepted children in this group yet.')
    }

    const sessionRef = doc(collection(db, 'walkSessions'))
    const sessionPath = `walkSessions/${sessionRef.id}`
    const sessionData = {
      groupId,
      groupSource: group.source ?? 'match',
      participantIds: sessionParticipantIds,
      location: group.location,
      scheduleDay: group.day,
      dateKey: today,
      status: 'started',
      startedAt: serverTimestamp(),
      completedAt: null,
      leaderId,
      createdAt: serverTimestamp(),
    }

    logStartWalkPreWrite(attempt, leaderId, groupId, group, {
      sessionParticipantIds,
      writePath: sessionPath,
    })

    try {
      await setDoc(sessionRef, sessionData)
    } catch (error) {
      console.error('[startWalk] create walk session failed', {
        groupId,
        sessionId: sessionRef.id,
        writePath: sessionPath,
        error,
      })
      throw error
    }

    const batch = writeBatch(db)
    const batchWritePaths = []
    const usePerKidArrival = group.source === 'walkGroup'

    for (const party of walkParties) {
      const absent = isAbsentOnDate(absences, party.userId, party.childId, today)
      let walkStatus = 'absent'
      if (!absent) {
        walkStatus = usePerKidArrival ? 'waiting_arrival' : 'confirmed'
      }

      const pickedUpAt = walkStatus === 'confirmed' ? serverTimestamp() : null
      let historyId = null

      if (walkStatus === 'confirmed') {
        const historyRef = doc(collection(db, 'walkHistory'))
        historyId = historyRef.id
        batchWritePaths.push(`walkHistory/${historyRef.id}`)
        batch.set(historyRef, {
          userId: party.userId,
          childId: party.childId,
          childFirstName: party.childFirstName,
          groupId,
          sessionId: sessionRef.id,
          participantIds: sessionParticipantIds,
          location: group.location,
          scheduleDay: group.day,
          pickedUpAt: pickedUpAt ?? serverTimestamp(),
          droppedOffAt: null,
          createdAt: serverTimestamp(),
        })
      }

      const childPath = `walkSessions/${sessionRef.id}/children/${childDocId(party.userId, party.childId)}`
      batchWritePaths.push(childPath)
      batch.set(
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

    logStartWalkPreWrite(attempt, leaderId, groupId, group, {
      sessionParticipantIds,
      writePaths: batchWritePaths,
    })

    try {
      await batch.commit()
    } catch (error) {
      console.error('[startWalk] create children/walkHistory failed', {
        groupId,
        sessionId: sessionRef.id,
        writePaths: batchWritePaths,
        error,
      })
      throw error
    }

    return sessionRef.id
  }, 'startWalk', START_WALK_MAX_ATTEMPTS, START_WALK_RETRY_MS)
}

export async function markChildArrived(sessionId, userId, childId, childDocKey = null) {
  return withPermissionRetries(async () => {
    if (!sessionId) {
      throw new Error('No active walk session. Refresh the page and try again.')
    }

    const sessionRef = doc(db, 'walkSessions', sessionId)
    const sessionSnap = await getDoc(sessionRef)
    if (!sessionSnap.exists()) {
      throw new Error('This walk session no longer exists. Refresh the page and try again.')
    }

    const session = sessionSnap.data()
    const located = await findSessionChild(sessionId, userId, childId, childDocKey)
    if (!located) {
      throw new Error(
        'This child is not part of the active walk session. Refresh the page and try again.',
      )
    }

    const { childRef, childSnap } = located
    const child = childSnap.data()

    if (child.walkStatus === 'absent') {
      throw new Error(`${child.childFirstName || 'This child'} is not walking today.`)
    }
    if (child.walkStatus === 'confirmed' || child.walkStatus === 'dropped_off') {
      return { alreadyArrived: true, sessionId, groupId: session.groupId }
    }

    const pickedUpAt = serverTimestamp()
    let historyId = child.historyId ?? null

    if (!historyId) {
      const historyRef = await createWalkHistoryEntry({
        userId: child.userId ?? userId,
        childId: child.childId ?? childId,
        childFirstName: child.childFirstName,
        groupId: session.groupId,
        sessionId,
        participantIds: session.participantIds ?? [],
        location: session.location,
        scheduleDay: session.scheduleDay,
        pickedUpAt,
        droppedOffAt: null,
      })
      historyId = historyRef.id
    }

    await updateDoc(childRef, {
      walkStatus: 'confirmed',
      pickedUpAt,
      historyId,
    })

    return { alreadyArrived: false, sessionId, groupId: session.groupId }
  }, 'arrival', DROP_OFF_MAX_ATTEMPTS, DROP_OFF_RETRY_MS)
}

export async function markChildDroppedOff(sessionId, userId, childId, childDocKey = null) {
  return withPermissionRetries(async () => {
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
    const sessionSnap = await getDoc(sessionRef)
    if (!sessionSnap.exists()) {
      throw new Error('This walk session no longer exists. Refresh the page and try again.')
    }

    const session = sessionSnap.data()
    const located = await findSessionChild(sessionId, userId, childId, childDocKey)
    if (!located) {
      throw new Error(
        'This child is not part of the active walk session. Refresh the page and try again.',
      )
    }

    const { childRef, childSnap, resolvedChildDocId } = located
    const child = childSnap.data()

    if (child.walkStatus === 'absent') {
      throw new Error(`${child.childFirstName || 'This child'} is marked absent and cannot be dropped off.`)
    }
    if (child.walkStatus === 'dropped_off') {
      const children = await loadSessionChildren(sessionId)
      const completed = await ensureSessionCompleted(sessionId, session, children)
      return {
        alreadyDroppedOff: true,
        sessionId,
        groupId: session.groupId,
        completed,
      }
    }

    const childrenSnap = await getDocs(collection(db, 'walkSessions', sessionId, 'children'))
    const children = childrenSnap.docs.map((docSnap) => {
      if (docSnap.id === resolvedChildDocId) {
        return { ...docSnap.data(), walkStatus: 'dropped_off' }
      }
      return docSnap.data()
    })
    const allDroppedOff = isWalkSessionComplete(children)

    const droppedOffAt = serverTimestamp()
    const batch = writeBatch(db)
    const childUpdate = {
      walkStatus: 'dropped_off',
      droppedOffAt,
    }
    if (!child.pickedUpAt) {
      childUpdate.pickedUpAt = droppedOffAt
    }
    batch.update(childRef, childUpdate)
    if (allDroppedOff) {
      batch.update(sessionRef, {
        status: 'completed',
        completedAt: serverTimestamp(),
      })
    }
    await batch.commit()

    const resolvedUserId = child.userId ?? userId
    const resolvedChildId = child.childId ?? childId

    try {
      await syncWalkHistoryDropOff({
        historyId: child.historyId,
        userId: resolvedUserId,
        childId: resolvedChildId,
        childFirstName: child.childFirstName,
        groupId: session.groupId,
        sessionId,
        participantIds: session.participantIds ?? [],
        location: session.location,
        scheduleDay: session.scheduleDay,
        pickedUpAt: child.pickedUpAt ?? session.startedAt,
      })
    } catch (error) {
      console.error('[dropOff] walk history sync failed (drop-off still saved)', error)
    }

    return { alreadyDroppedOff: false, sessionId, groupId: session.groupId, completed: allDroppedOff }
  }, 'dropOff', DROP_OFF_MAX_ATTEMPTS, DROP_OFF_RETRY_MS)
}

export async function markAbsentSingleDate({
  groupId,
  userId,
  childId,
  childFirstName,
  activityId,
  dateKey,
  participantIds = [],
}) {
  if (await getActiveSession(groupId, userId)) {
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
      participantIds,
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
  participantIds = [],
}) {
  if (await getActiveSession(groupId, userId)) {
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
      participantIds,
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
