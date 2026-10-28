/**
 * View-model adapters mapping existing Firestore data to the new app UX.
 *
 * families  → users + children
 * groups    → walkGroups
 * activities → users/{uid}/activities
 * trips     → walkGroups (scheduled) + walkSessions (live)
 * matches   → walkGroups (pending/open) + matches collection
 * messages  → walkGroups/{id}/messages (aggregated in inbox.js)
 * rideEvents → walkSessions child walkStatus + walkHistory
 */

import { getGroupWalkStatus } from './groups'
import { getWalkLeaderUserIds } from './leaderVolunteers'
import {
  countOtherJoiningFamilies,
  formatWalkGroupDetails,
  getActiveParties,
  getPartiesForUser,
  walkGroupHasMultipleFamilies,
  walkGroupNeedsUserResponse,
  walkGroupUserHasAccepted,
} from './walkGroups'
import { todayKey, formatDisplayDate } from './sessions'

const JS_TO_OUR = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export function getTodayWeekday() {
  return JS_TO_OUR[new Date().getDay()]
}

function formatTimeLabel(startTime) {
  if (!startTime) return ''
  const [hoursStr, minutesStr] = startTime.split(':')
  const hours = Number(hoursStr)
  const minutes = Number(minutesStr)
  const period = hours >= 12 ? 'PM' : 'AM'
  const displayHours = hours % 12 || 12
  return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`
}

function partyForUser(group, userId) {
  return getPartiesForUser(group, userId)[0] ?? null
}

function resolveGuideName(group, volunteers = []) {
  const leaderIds = getWalkLeaderUserIds(group, volunteers)
  if (leaderIds.size === 0) return 'Guide TBD'
  const leaderId = [...leaderIds][0]
  const leaderParty = (group.parties ?? []).find((p) => p.userId === leaderId)
  return leaderParty?.parentName?.split(/\s+/)[0] ?? 'Guide confirmed'
}

function mapTripStatus(group, activeSession) {
  if (activeSession?.status === 'started') {
    return 'in_progress'
  }
  const walkStatus = getGroupWalkStatus(group)
  if (walkStatus === 'in progress') return 'in_progress'
  if (walkStatus === 'completed') return 'completed'
  return 'confirmed'
}

export function buildTripFromGroup(group, userId, { activeSession = null, volunteers = [] } = {}) {
  const party = partyForUser(group, userId)
  const startTime = party?.startTime ?? group.windowStartTime ?? group.startTime

  return {
    id: group.id,
    groupId: group.id,
    childName: party?.childFirstName ?? 'Child',
    childId: party?.childId,
    destination: group.location ?? 'Activity',
    day: group.day,
    time: formatTimeLabel(startTime),
    startTime,
    guideName: resolveGuideName(group, volunteers),
    status: mapTripStatus(group, activeSession),
    statusLabel: mapTripStatusLabel(mapTripStatus(group, activeSession)),
    details: formatWalkGroupDetails(group),
    source: group.source ?? 'walkGroup',
    sessionId: activeSession?.id ?? null,
  }
}

function mapTripStatusLabel(status) {
  switch (status) {
    case 'in_progress':
      return 'In progress'
    case 'completed':
      return 'Completed'
    default:
      return 'Confirmed'
  }
}

export function buildRideStatusFromSession(session, childDoc) {
  if (!session) return { label: 'Confirmed', step: 'confirmed' }
  if (session.status !== 'started') return { label: 'Confirmed', step: 'confirmed' }

  const walkStatus = childDoc?.walkStatus
  if (walkStatus === 'dropped_off') return { label: 'Child dropped off safely', step: 'dropped_off' }
  if (walkStatus === 'confirmed' || walkStatus === 'waiting_arrival') {
    return { label: 'Child picked up', step: 'picked_up' }
  }
  if (session.status === 'started') return { label: 'Guide en route', step: 'en_route' }
  return { label: 'Confirmed', step: 'confirmed' }
}

export function isTripToday(group) {
  return group.day === getTodayWeekday()
}

export function isTripUncovered(group, volunteers = []) {
  const leaderIds = getWalkLeaderUserIds(group, volunteers)
  return leaderIds.size === 0
}

export function buildMatchFromGroup(group, userId) {
  const party = partyForUser(group, userId)
  const otherFamilies = countOtherJoiningFamilies(group, userId)
  const sharedActivity = group.location ?? 'Activity'
  const scheduleLabel = formatWalkGroupDetails(group)

  return {
    id: group.id,
    groupId: group.id,
    sharedActivity,
    scheduleOverlap: scheduleLabel,
    sharedConnections: otherFamilies,
    offeringHelp: false,
    needsHelp: walkGroupNeedsUserResponse(group, userId),
    status: group.status,
    pending: walkGroupNeedsUserResponse(group, userId),
    accepted: walkGroupUserHasAccepted(group, userId),
    childName: party?.childFirstName,
    day: group.day,
    time: formatTimeLabel(party?.startTime ?? group.windowStartTime),
  }
}

export function partitionHomeData(walkGroups, userId, activeSessions = {}, volunteersByGroup = {}) {
  const today = getTodayWeekday()
  const relevant = walkGroups.filter(
    (g) =>
      walkGroupHasMultipleFamilies(g)
      && (walkGroupUserHasAccepted(g, userId) || walkGroupNeedsUserResponse(g, userId)),
  )

  const todayTrips = relevant
    .filter((g) => g.day === today && walkGroupUserHasAccepted(g, userId))
    .map((g) =>
      buildTripFromGroup(g, userId, {
        activeSession: activeSessions[g.id],
        volunteers: volunteersByGroup[g.id] ?? [],
      }),
    )

  const uncoveredTrips = relevant
    .filter(
      (g) =>
        walkGroupUserHasAccepted(g, userId)
        && isTripUncovered(g, volunteersByGroup[g.id] ?? []),
    )
    .map((g) => buildTripFromGroup(g, userId, { volunteers: volunteersByGroup[g.id] ?? [] }))

  const pendingRequests = relevant
    .filter((g) => walkGroupNeedsUserResponse(g, userId))
    .map((g) => buildMatchFromGroup(g, userId))

  return { todayTrips, uncoveredTrips, pendingRequests }
}

export function buildScheduleActivityCard(activity, kids, walkGroups, userId) {
  const kid = kids.find((k) => k.id === activity.childId)
  const childName = kid?.firstName ?? activity.childFirstName ?? 'Child'
  const matchingGroup = walkGroups.find(
    (g) =>
      g.location === activity.location
      && (g.day === activity.days?.[0] || g.day)
      && getPartiesForUser(g, userId).some((p) => p.activityId === activity.id),
  )

  let coverage = 'uncovered'
  if (matchingGroup) {
    if (walkGroupNeedsUserResponse(matchingGroup, userId)) coverage = 'pending'
    else if (walkGroupUserHasAccepted(matchingGroup, userId)) coverage = 'covered'
  }

  return {
    id: activity.id,
    childName,
    destination: activity.location,
    days: activity.days ?? [],
    time: formatTimeLabel(activity.startTime),
    coverage,
    groupId: matchingGroup?.id ?? null,
  }
}

export function formatCoverageBadge(coverage) {
  switch (coverage) {
    case 'covered':
      return { label: 'Covered', className: 'bg-green-50 text-green-800' }
    case 'pending':
      return { label: 'Pending', className: 'bg-amber-50 text-amber-800' }
    default:
      return { label: 'Uncovered', className: 'bg-rose-50 text-rose-800' }
  }
}

export function getNotificationDeepLink(notification) {
  if (!notification) return '/home'
  const { type, groupId, matchId, tripId } = notification

  if (
    type === 'match_request'
    || type === 'match_found'
    || type === 'leader_proposed'
    || type === 'leader_approved'
    || type === 'leader_rejected'
    || type === 'meeting_point_proposed'
  ) {
    return groupId ? `/matches/${groupId}` : '/matches'
  }
  if (
    type === 'ride_accepted'
    || type === 'ride_reminder'
    || type === 'ride_status'
    || type === 'picked_up'
    || type === 'dropped_off'
    || type === 'ride_canceled'
  ) {
    const id = tripId ?? groupId
    return id ? `/rides/${id}` : '/home'
  }
  if (type === 'message') {
    return groupId ? `/inbox/${groupId}` : '/inbox'
  }
  if (matchId) return `/matches/${matchId}`
  if (groupId) return `/inbox/${groupId}`
  return '/home'
}

export { formatTimeLabel, formatDisplayDate, todayKey }
