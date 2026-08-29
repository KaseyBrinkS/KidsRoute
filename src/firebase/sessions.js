export const SESSION_TYPES = [
  { id: 'fall', label: 'Fall Session', description: 'September through January' },
  { id: 'spring', label: 'Spring Session', description: 'February through June' },
  { id: 'summer', label: 'Summer Camp', description: 'Custom date range' },
]

const JS_TO_DAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

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

export function formatDisplayDate(dateKey) {
  return parseDateKey(dateKey).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function todayKey() {
  return formatDateKey(new Date())
}

export function daysUntilDateKey(dateKey, fromDateKey = todayKey()) {
  const from = parseDateKey(fromDateKey)
  const to = parseDateKey(dateKey)
  const msPerDay = 24 * 60 * 60 * 1000
  return Math.round((to.getTime() - from.getTime()) / msPerDay)
}

/** Walk dates within the next 7 days (inclusive) are eligible for ratio alerts. */
export function isWithinRatioAlertWindow(dateKey, fromDateKey = todayKey(), maxDaysAhead = 7) {
  const daysUntil = daysUntilDateKey(dateKey, fromDateKey)
  return daysUntil >= 0 && daysUntil <= maxDaysAhead
}

export function getUpcomingWeekDateKeys(fromDateKey = todayKey(), dayCount = 7) {
  const start = parseDateKey(fromDateKey)
  return Array.from({ length: dayCount }, (_, index) => {
    const date = new Date(start)
    date.setDate(date.getDate() + index)
    return formatDateKey(date)
  })
}

function getSchoolYearStart(referenceDate = new Date()) {
  const year = referenceDate.getFullYear()
  const month = referenceDate.getMonth()
  return month >= 8 ? year : year - 1
}

function datesInRange(startDate, endDate, days) {
  if (!days?.length) return []

  const daySet = new Set(days)
  const result = []
  const current = new Date(startDate)
  current.setHours(12, 0, 0, 0)
  const end = new Date(endDate)
  end.setHours(12, 0, 0, 0)

  while (current <= end) {
    if (daySet.has(JS_TO_DAY[current.getDay()])) {
      result.push(formatDateKey(current))
    }
    current.setDate(current.getDate() + 1)
  }

  return result
}

function fallRange(schoolYearStart) {
  return {
    start: new Date(schoolYearStart, 8, 1, 12, 0, 0, 0),
    end: new Date(schoolYearStart + 1, 0, 31, 12, 0, 0, 0),
  }
}

function springRange(schoolYearStart) {
  return {
    start: new Date(schoolYearStart + 1, 1, 1, 12, 0, 0, 0),
    end: new Date(schoolYearStart + 1, 5, 30, 12, 0, 0, 0),
  }
}

export function getScheduledDates(activity, referenceDate = new Date()) {
  if (!activity?.days?.length) return []

  const sessions = activity.sessions ?? ['fall', 'spring']
  const dates = new Set()
  const schoolYear = getSchoolYearStart(referenceDate)

  for (const year of [schoolYear, schoolYear + 1]) {
    if (sessions.includes('fall')) {
      const { start, end } = fallRange(year)
      datesInRange(start, end, activity.days).forEach((dateKey) => dates.add(dateKey))
    }

    if (sessions.includes('spring')) {
      const { start, end } = springRange(year)
      datesInRange(start, end, activity.days).forEach((dateKey) => dates.add(dateKey))
    }
  }

  if (sessions.includes('summer') && activity.summerStartDate && activity.summerEndDate) {
    datesInRange(
      parseDateKey(activity.summerStartDate),
      parseDateKey(activity.summerEndDate),
      activity.days,
    ).forEach((dateKey) => dates.add(dateKey))
  }

  return [...dates].sort()
}

export function isScheduledOnDate(activity, dateKey) {
  return getScheduledDates(activity).includes(dateKey)
}

export function partyScheduleSource(party, fallbackDay) {
  const days = party.days?.length ? party.days : fallbackDay ? [fallbackDay] : []
  return {
    days,
    sessions: party.sessions ?? defaultSessions(),
    summerStartDate: party.summerStartDate ?? null,
    summerEndDate: party.summerEndDate ?? null,
  }
}

export function isPartyScheduledOnDate(party, dateKey, fallbackDay) {
  return isScheduledOnDate(partyScheduleSource(party, fallbackDay), dateKey)
}

export function getPartyUpcomingScheduledDates(party, fallbackDay, fromDateKey = todayKey()) {
  return getUpcomingScheduledDates(partyScheduleSource(party, fallbackDay), fromDateKey)
}

export function getUpcomingScheduledDates(activity, fromDateKey = todayKey()) {
  return getScheduledDates(activity).filter((dateKey) => dateKey >= fromDateKey)
}

export function formatSessionLabels(sessions) {
  if (!sessions?.length) return 'Fall, Spring'
  return sessions
    .map((id) => SESSION_TYPES.find((session) => session.id === id)?.label ?? id)
    .join(', ')
}

export function defaultSessions() {
  return ['fall', 'spring']
}

const SESSION_PERIOD_LABELS = {
  fall: 'Mid-September through January',
  spring: 'February through June',
  summer: 'July through August',
}

/** Current school session based on today's date. */
export function getCurrentSession(referenceDate = new Date()) {
  const month = referenceDate.getMonth()
  const day = referenceDate.getDate()

  if (month === 0) return 'fall'
  if (month >= 1 && month <= 5) return 'spring'
  if (month === 6 || month === 7) return 'summer'
  if (month === 8) return day >= 15 ? 'fall' : 'summer'
  return 'fall'
}

export function getCurrentSessionInfo(referenceDate = new Date()) {
  const id = getCurrentSession(referenceDate)
  const meta = SESSION_TYPES.find((session) => session.id === id)
  return {
    id,
    label: meta?.label ?? id,
    period: SESSION_PERIOD_LABELS[id] ?? meta?.description ?? '',
  }
}

/** Fall, Spring, and Summer Camp options for walk leader volunteering. */
export function getVolunteerSessionOptions(referenceDate = new Date()) {
  const month = referenceDate.getMonth()
  let anchor = getSchoolYearStart(referenceDate)
  // In July–August, the upcoming fall belongs to the next school-year anchor.
  if (month >= 6 && month <= 7) {
    anchor = referenceDate.getFullYear()
  }

  const representativeDates = {
    fall: formatDateKey(new Date(anchor, 8, 15)),
    spring: formatDateKey(new Date(anchor + 1, 2, 15)),
    summer: formatDateKey(new Date(anchor + 1, 6, 15)),
  }

  return SESSION_TYPES.map((session) => ({
    id: session.id,
    label: session.label,
    period: SESSION_PERIOD_LABELS[session.id] ?? session.description,
    sessionKey: getSessionKeyForDate(representativeDates[session.id]),
  }))
}

/** Composite key for a school session, e.g. `fall-2026`. */
export function getSessionKeyForDate(dateKey) {
  const date = parseDateKey(dateKey)
  const session = getCurrentSession(date)
  const year = date.getFullYear()
  if (session === 'fall') return `fall-${year}`
  if (session === 'spring') return `spring-${year}`
  return `summer-${year}`
}

export function getCurrentSessionKey(referenceDate = new Date()) {
  return getSessionKeyForDate(formatDateKey(referenceDate))
}

export function getSessionConversationLabel(sessionKey) {
  const [session, year] = sessionKey.split('-')
  if (!session || !year) return 'Conversation'
  const label = session.charAt(0).toUpperCase() + session.slice(1)
  return `${label} ${year} conversation`
}

export function getSessionKeyFromTimestamp(timestamp) {
  if (!timestamp) return getCurrentSessionKey()
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
  return getSessionKeyForDate(formatDateKey(date))
}

export function getGroupScheduledDates(group, referenceDate = new Date()) {
  const parties = group?.parties ?? []
  const fallbackDay = group?.day
  const dates = new Set()

  for (const party of parties) {
    if (party.response === 'declined') continue
    const schedule = partyScheduleSource(party, fallbackDay)
    getScheduledDates(schedule, referenceDate).forEach((dateKey) => dates.add(dateKey))
  }

  if (dates.size === 0 && fallbackDay) {
    getScheduledDates({ days: [fallbackDay], sessions: defaultSessions() }, referenceDate)
      .forEach((dateKey) => dates.add(dateKey))
  }

  return [...dates].sort()
}

export function getGroupUpcomingScheduledDates(group, fromDateKey = todayKey()) {
  return getGroupScheduledDates(group).filter((dateKey) => dateKey >= fromDateKey)
}

export function isDateInSession(dateKey, sessionKey) {
  return getSessionKeyForDate(dateKey) === sessionKey
}

export function isActivityActiveInCurrentSession(activity, referenceDate = new Date()) {
  const sessions = activity.sessions ?? defaultSessions()
  return sessions.includes(getCurrentSession(referenceDate))
}

export function validateSessionForm(sessions, summerStartDate, summerEndDate) {
  if (!sessions?.length) {
    return 'Select at least one session.'
  }

  if (sessions.includes('summer')) {
    if (!summerStartDate || !summerEndDate) {
      return 'Enter summer camp start and end dates.'
    }
    if (summerStartDate > summerEndDate) {
      return 'Summer camp end date must be on or after the start date.'
    }
  }

  return null
}
