import { WEEKDAYS, formatStartTime } from './activities'
import { MATCH_WINDOW_MINUTES } from './matching'

const JS_TO_OUR = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function timeToMinutes(startTime) {
  const [hoursStr, minutesStr] = startTime.split(':')
  return Number(hoursStr) * 60 + Number(minutesStr)
}

function daysUntilWalkDay(today, walkDay) {
  const todayIndex = WEEKDAYS.indexOf(today)
  const dayIndex = WEEKDAYS.indexOf(walkDay)
  return (dayIndex - todayIndex + 7) % 7
}

export function getPartyStartTimes(match) {
  return match.parties.map((party) => party.startTime).filter(Boolean)
}

export function getWalkStatus(day, startTimes) {
  if (!day || startTimes.length === 0) return 'upcoming'

  const now = new Date()
  const today = JS_TO_OUR[now.getDay()]
  const nowMinutes = now.getHours() * 60 + now.getMinutes()
  const startMinutes = Math.min(...startTimes.map(timeToMinutes))
  const endMinutes = Math.max(...startTimes.map(timeToMinutes)) + MATCH_WINDOW_MINUTES

  if (day === today) {
    if (nowMinutes < startMinutes) return 'upcoming'
    if (nowMinutes <= endMinutes) return 'in progress'
    return 'completed'
  }

  return daysUntilWalkDay(today, day) > 0 ? 'upcoming' : 'completed'
}

export function formatGroupChildNames(match) {
  return match.parties.map((party) => party.childFirstName).join(', ')
}

export function formatGroupTimes(match) {
  const uniqueTimes = [...new Set(getPartyStartTimes(match))].sort()
  return uniqueTimes.map((time) => formatStartTime(time)).join(' / ')
}

export const WALK_STATUS_LABELS = {
  upcoming: 'Upcoming',
  'in progress': 'In progress',
  completed: 'Completed',
}

export const WALK_STATUS_STYLES = {
  upcoming: 'bg-indigo-50 text-indigo-700',
  'in progress': 'bg-green-50 text-green-700',
  completed: 'bg-gray-100 text-gray-600',
}
