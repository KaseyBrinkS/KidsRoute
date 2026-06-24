import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore'
import { db } from './db'
import { defaultSessions } from './sessions'
import { processActivityMatching, syncMatchPartiesForActivity } from './matching'
import { processActivityWalkGrouping, syncWalkGroupPartiesForActivity } from './walkGroups'

export function activityMatchingPayload(activityData) {
  return {
    childId: activityData.childId,
    childFirstName: activityData.childFirstName,
    location: activityData.location.trim(),
    grade: activityData.grade,
    days: activityData.days,
    startTime: activityData.startTime,
    sessions: activityData.sessions ?? defaultSessions(),
    summerStartDate: activityData.summerStartDate ?? null,
    summerEndDate: activityData.summerEndDate ?? null,
  }
}

export const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
export const ACTIVITY_GRADES = ['3k', 'PreK', 'K', '1st', '2nd', '3rd', '4th', '5th']

const KID_GRADE_TO_ACTIVITY_GRADE = {
  K: 'K',
  '1': '1st',
  '2': '2nd',
  '3': '3rd',
  '4': '4th',
  '5': '5th',
}

export function gradeFromKid(kidGrade) {
  return KID_GRADE_TO_ACTIVITY_GRADE[kidGrade] ?? 'K'
}

function activitiesCollection(userId) {
  return collection(db, 'users', userId, 'activities')
}

export function subscribeToActivities(userId, onData, onError) {
  const activitiesQuery = query(
    activitiesCollection(userId),
    orderBy('createdAt', 'desc'),
  )
  return onSnapshot(
    activitiesQuery,
    (snapshot) => {
      const activities = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      }))
      onData(activities)
    },
    onError,
  )
}

export function addActivity(userId, {
  childId,
  childFirstName,
  className,
  location,
  locationPendingReview,
  grade,
  days,
  startTime,
  sessions,
  summerStartDate,
  summerEndDate,
}) {
  return addDoc(activitiesCollection(userId), {
    childId,
    childFirstName,
    className: className.trim(),
    location: location.trim(),
    locationPendingReview: locationPendingReview ?? false,
    grade,
    days,
    startTime,
    sessions: sessions ?? ['fall', 'spring'],
    summerStartDate: summerStartDate ?? null,
    summerEndDate: summerEndDate ?? null,
    createdAt: serverTimestamp(),
  })
}

export async function addActivityAndFindMatches(userId, activityData) {
  const activityRef = await addActivity(userId, activityData)

  try {
    await processActivityMatching(userId, activityRef.id, activityMatchingPayload(activityData))
    await processActivityWalkGrouping(userId, activityRef.id, activityMatchingPayload(activityData))
  } catch (err) {
    console.error('Activity saved but matching failed:', err)
    throw err
  }

  return activityRef
}

async function deleteActivitySlots(userId, activityId) {
  const snapshot = await getDocs(
    query(collection(db, 'activitySlots'), where('userId', '==', userId)),
  )

  await Promise.all(
    snapshot.docs
      .filter((docSnap) => docSnap.data().activityId === activityId)
      .map((docSnap) => deleteDoc(docSnap.ref)),
  )
}

export async function deleteAllActivitySlots(userId) {
  const snapshot = await getDocs(
    query(collection(db, 'activitySlots'), where('userId', '==', userId)),
  )

  await Promise.all(snapshot.docs.map((docSnap) => deleteDoc(docSnap.ref)))
}

export async function fetchUserActivities(userId) {
  const snapshot = await getDocs(
    query(activitiesCollection(userId), orderBy('createdAt', 'desc')),
  )

  return snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))
}

export async function updateActivityAndFindMatches(userId, activityId, activityData) {
  await updateDoc(doc(db, 'users', userId, 'activities', activityId), {
    childId: activityData.childId,
    childFirstName: activityData.childFirstName,
    className: activityData.className.trim(),
    location: activityData.location.trim(),
    locationPendingReview: activityData.locationPendingReview ?? false,
    grade: activityData.grade,
    days: activityData.days,
    startTime: activityData.startTime,
    sessions: activityData.sessions ?? ['fall', 'spring'],
    summerStartDate: activityData.summerStartDate ?? null,
    summerEndDate: activityData.summerEndDate ?? null,
    updatedAt: serverTimestamp(),
  })

  await deleteActivitySlots(userId, activityId)

  const matchingPayload = activityMatchingPayload(activityData)

  try {
    await syncMatchPartiesForActivity(userId, activityId, matchingPayload)
    await syncWalkGroupPartiesForActivity(userId, activityId, matchingPayload)
    await processActivityMatching(userId, activityId, matchingPayload)
    await processActivityWalkGrouping(userId, activityId, matchingPayload)
  } catch (err) {
    console.error('Activity updated but matching sync failed:', err)
    throw err
  }
}

export function deleteActivity(userId, activityId) {
  return deleteDoc(doc(db, 'users', userId, 'activities', activityId))
}

export function formatStartTime(startTime) {
  if (!startTime) return ''
  const [hoursStr, minutesStr] = startTime.split(':')
  const hours = Number(hoursStr)
  const minutes = Number(minutesStr)
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return startTime
  const period = hours >= 12 ? 'PM' : 'AM'
  const displayHours = hours % 12 || 12
  return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`
}

export function formatDays(days) {
  return WEEKDAYS.filter((day) => days.includes(day)).join(', ')
}

export const TIME_HOURS = Array.from({ length: 12 }, (_, index) => String(index + 1))
export const TIME_MINUTES = ['00', '15', '30', '45']
export const TIME_PERIODS = ['AM', 'PM']
export const DEFAULT_TIME = { hour: '3', minute: '00', period: 'PM' }

export function to24HourTime({ hour, minute, period }) {
  let hours = parseInt(hour, 10)
  if (period === 'AM') {
    if (hours === 12) hours = 0
  } else if (hours !== 12) {
    hours += 12
  }
  return `${hours.toString().padStart(2, '0')}:${minute}`
}

export function from24HourTime(startTime) {
  if (!startTime) return { ...DEFAULT_TIME }

  const [hoursStr, minutesStr] = startTime.split(':')
  const hours = Number(hoursStr)
  const period = hours >= 12 ? 'PM' : 'AM'
  const hour = String(hours % 12 || 12)
  const minute = (minutesStr ?? '00').padStart(2, '0').slice(0, 2)

  return { hour, minute, period }
}
