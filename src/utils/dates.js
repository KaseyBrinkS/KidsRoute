import { WEEKDAYS } from '../firebase/activities'

const JS_TO_WEEKDAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export function todayWeekday() {
  return JS_TO_WEEKDAY[new Date().getDay()]
}

export { WEEKDAYS }

export function formatDateKey(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function parseDateKey(dateKey) {
  const [year, month, day] = dateKey.split('-').map(Number)
  return new Date(year, month - 1, day, 12, 0, 0, 0)
}

export function getMonthDays(year, month) {
  const first = new Date(year, month, 1)
  const last = new Date(year, month + 1, 0)
  const days = []
  for (let d = 1; d <= last.getDate(); d += 1) {
    days.push(new Date(year, month, d, 12, 0, 0, 0))
  }
  return { first, last, days, startPad: first.getDay() }
}

export const CHILD_CALENDAR_COLORS = [
  { bg: '#eef4fa', border: '#5b8fc7', text: '#3d6a94' },
  { bg: '#fef3e2', border: '#e8943a', text: '#b8732a' },
  { bg: '#ecf7f0', border: '#4a9b6f', text: '#357a55' },
  { bg: '#f3eef8', border: '#9b6bb5', text: '#7a5291' },
  { bg: '#fceeee', border: '#c75b5b', text: '#9e4545' },
]

export function childColorIndex(childId, childIds) {
  const index = childIds.indexOf(childId)
  return index >= 0 ? index % CHILD_CALENDAR_COLORS.length : 0
}
