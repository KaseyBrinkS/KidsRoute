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
  { bg: '#eef2f5', border: '#6889a3', text: '#4a6578' },
  { bg: '#f2ebe7', border: '#a87f72', text: '#7a5f55' },
  { bg: '#ecf2ee', border: '#5a8770', text: '#3d6650' },
  { bg: '#f0edf2', border: '#9a8898', text: '#6e6270' },
  { bg: '#f2ecea', border: '#a37870', text: '#73544e' },
]

export const CALENDAR_WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export function startOfWeek(date = new Date()) {
  const d = new Date(date)
  d.setHours(12, 0, 0, 0)
  d.setDate(d.getDate() - d.getDay())
  return d
}

export function addWeeks(date, weeks) {
  const d = new Date(date)
  d.setDate(d.getDate() + weeks * 7)
  return d
}

export function formatWeekRange(weekStart) {
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekEnd.getDate() + 6)
  const startFmt = weekStart.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  const endFmt = weekEnd.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: weekStart.getFullYear() !== weekEnd.getFullYear() ? 'numeric' : undefined,
  })
  const yearSuffix =
    weekStart.getFullYear() === weekEnd.getFullYear() ? `, ${weekStart.getFullYear()}` : ''
  return `${startFmt} – ${endFmt}${yearSuffix}`
}

export function getWeekDays(weekStart) {
  return CALENDAR_WEEKDAYS.map((label, index) => {
    const date = new Date(weekStart)
    date.setDate(date.getDate() + index)
    return { label, date }
  })
}

export function childColorIndex(childId, childIds) {
  const index = childIds.indexOf(childId)
  return index >= 0 ? index % CHILD_CALENDAR_COLORS.length : 0
}
