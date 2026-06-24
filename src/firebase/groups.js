import { WEEKDAYS, formatStartTime } from './activities'
import { BUILDING_WEEKDAYS } from './buildingWalks'
import { MATCH_WINDOW_MINUTES } from './matching'

const JS_TO_OUR = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const BUILDING_WALK_WINDOW_MINUTES = 30

function timeToMinutes(startTime) {
  const [hoursStr, minutesStr] = startTime.split(':')
  return Number(hoursStr) * 60 + Number(minutesStr)
}

function daysUntilWalkDay(today, walkDay) {
  const todayIndex = WEEKDAYS.indexOf(today)
  const dayIndex = WEEKDAYS.indexOf(walkDay)
  return (dayIndex - todayIndex + 7) % 7
}

export function getPartyStartTimes(group) {
  const parties =
    group.source === 'walkGroup'
      ? (group.parties ?? []).filter((party) => party.response === 'accepted')
      : (group.parties ?? [])
  return parties.map((party) => party.startTime).filter(Boolean)
}

export function getWalkStatus(day, startTimes, options = {}) {
  const { matchType, scheduleDays, startTime } = options
  const now = new Date()
  const today = JS_TO_OUR[now.getDay()]
  const nowMinutes = now.getHours() * 60 + now.getMinutes()

  if (matchType === 'building') {
    if (!BUILDING_WEEKDAYS.includes(today)) return 'upcoming'

    const walkStart = startTime ?? startTimes[0]
    if (!walkStart) return 'upcoming'

    const startMinutes = timeToMinutes(walkStart)
    const endMinutes = startMinutes + BUILDING_WALK_WINDOW_MINUTES

    if (nowMinutes < startMinutes) return 'upcoming'
    if (nowMinutes <= endMinutes) return 'in progress'
    return 'completed'
  }

  if (!day || startTimes.length === 0) return 'upcoming'

  const startMinutes = Math.min(...startTimes.map(timeToMinutes))
  const endMinutes = Math.max(...startTimes.map(timeToMinutes)) + MATCH_WINDOW_MINUTES

  if (day === today) {
    if (nowMinutes < startMinutes) return 'upcoming'
    if (nowMinutes <= endMinutes) return 'in progress'
    return 'completed'
  }

  const days = scheduleDays ?? [day]
  if (days.includes(today)) {
    if (nowMinutes < startMinutes) return 'upcoming'
    if (nowMinutes <= endMinutes) return 'in progress'
    return 'completed'
  }

  return daysUntilWalkDay(today, day) > 0 ? 'upcoming' : 'completed'
}

export function getGroupWalkStatus(group) {
  if (group.matchType === 'building') {
    return getWalkStatus(group.day, getPartyStartTimes(group), {
      matchType: 'building',
      scheduleDays: group.scheduleDays,
      startTime: group.startTime,
    })
  }
  return getWalkStatus(group.day, getPartyStartTimes(group))
}

export function formatGroupChildNames(group) {
  if (group.source === 'walkGroup') {
    const names = (group.parties ?? [])
      .filter((party) => party.response === 'accepted')
      .map((party) => party.childFirstName)
    return names.join(', ')
  }
  return group.parties.map((party) => party.childFirstName).join(', ')
}

export function formatGroupTimes(match) {
  if (match.matchType === 'building' && match.startTime) {
    return formatStartTime(match.startTime)
  }
  const uniqueTimes = [...new Set(getPartyStartTimes(match))].sort()
  return uniqueTimes.map((time) => formatStartTime(time)).join(' / ')
}

export const WALK_STATUS_LABELS = {
  upcoming: 'Upcoming',
  'in progress': 'In progress',
  completed: 'Completed',
}

export const WALK_STATUS_STYLES = {
  upcoming: 'badge-walk-upcoming',
  'in progress': 'badge-walk-active',
  completed: 'badge-walk-upcoming',
}
