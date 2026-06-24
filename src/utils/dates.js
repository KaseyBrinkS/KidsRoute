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
  { bg: '#eef2f5', border: '#6889a3', text: '#4a6578', swatch: '#6889a3' },
  { bg: '#f2ebe7', border: '#a87f72', text: '#7a5f55', swatch: '#a87f72' },
  { bg: '#ecf2ee', border: '#5a8770', text: '#3d6650', swatch: '#5a8770' },
  { bg: '#f0edf2', border: '#9a8898', text: '#6e6270', swatch: '#9a8898' },
  { bg: '#f2ecea', border: '#a37870', text: '#73544e', swatch: '#a37870' },
  { bg: '#eef0f5', border: '#6b7ea8', text: '#4a5578', swatch: '#6b7ea8' },
  { bg: '#f5f0e8', border: '#b8956a', text: '#7a6340', swatch: '#b8956a' },
  { bg: '#f0f2ec', border: '#8a9468', text: '#5c6340', swatch: '#8a9468' },
  { bg: '#f5ecef', border: '#a87a8a', text: '#7a5565', swatch: '#a87a8a' },
  { bg: '#ebeff5', border: '#7090b0', text: '#4a6580', swatch: '#7090b0' },
]

export function kidsByCreationOrder(kids) {
  return [...(kids ?? [])].sort((a, b) => {
    const aSec = a.createdAt?.seconds ?? 0
    const bSec = b.createdAt?.seconds ?? 0
    if (aSec !== bSec) return aSec - bSec
    return (a.id ?? '').localeCompare(b.id ?? '')
  })
}

export function getChildColorKey(child, kids) {
  const childId = typeof child === 'string' ? child : child?.id
  const kid =
    typeof child === 'object' && child?.id
      ? child
      : (kids ?? []).find((entry) => entry.id === childId)

  if (
    kid &&
    typeof kid.colorKey === 'number' &&
    kid.colorKey >= 0 &&
    kid.colorKey < CHILD_CALENDAR_COLORS.length
  ) {
    return kid.colorKey
  }

  const ordered = kidsByCreationOrder(kids)
  const index = ordered.findIndex((entry) => entry.id === childId)
  return index >= 0 ? index % CHILD_CALENDAR_COLORS.length : 0
}

export function getChildColor(child, kids) {
  return CHILD_CALENDAR_COLORS[getChildColorKey(child, kids)]
}

export function getChildColorById(childId, kids, fallbackChildIds = []) {
  const kid = (kids ?? []).find((entry) => entry.id === childId)
  if (kid) return getChildColor(kid, kids)

  const ids =
    fallbackChildIds.length > 0 ? fallbackChildIds : (kids ?? []).map((entry) => entry.id)
  const index = ids.indexOf(childId)
  return CHILD_CALENDAR_COLORS[index >= 0 ? index % CHILD_CALENDAR_COLORS.length : 0]
}

export function defaultColorKeyForNewChild(kids) {
  return kidsByCreationOrder(kids).length % CHILD_CALENDAR_COLORS.length
}

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

/** @deprecated Use getChildColorKey / getChildColorById with full kid profiles instead. */
export function childColorIndex(childId, childIds) {
  const index = childIds.indexOf(childId)
  return index >= 0 ? index % CHILD_CALENDAR_COLORS.length : 0
}
