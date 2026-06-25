import { useEffect, useMemo, useState } from 'react'
import DashboardWeekView, { buildDashboardWeekGroups } from '../components/DashboardWeekView'
import { ChildNameWithDot } from '../components/ChildColorDot'
import GuidanceBanner from '../components/GuidanceBanner'
import MeetingPointProposalAlerts from '../components/MeetingPointProposalAlerts'
import {
  dismissIds,
  hasUndismissedIds,
} from '../utils/guidanceDismissals'
import DaySelector, { todayWeekday } from '../components/DaySelector'
import OnboardingReminderBanner from '../components/onboarding/OnboardingReminderBanner'
import PageHeader from '../components/PageHeader'
import { useAuth } from '../context/AuthContext'
import { subscribeToActivities } from '../firebase/activities'
import {
  formatWalkGroupDetails,
  formatWalkGroupInvitation,
  getPartiesForUser,
  respondToWalkGroup,
  subscribeToWalkGroups,
  walkGroupHasMultipleFamilies,
  walkGroupIsDeclinedForUser,
  walkGroupNeedsUserResponse,
  walkGroupUserHasAccepted,
} from '../firebase/walkGroups'
import { subscribeToUserActiveWalkSessions } from '../firebase/groupWalk'
import { subscribeToKids } from '../firebase/kids'
import {
  getOnboardingRedirectPath,
  getUserProfile,
  shouldShowSetupReminder,
  subscribeToUserProfile,
  syncSetupCompletion,
} from '../firebase/users'
import { syncWalkGroupsForUser } from '../firebase/activities'
import { getChildColorById } from '../utils/dates'

function invitationAccentStyle(childId, kids) {
  const color = getChildColorById(childId, kids)
  return {
    borderLeftColor: 'var(--color-accent)',
    background: `linear-gradient(to right, var(--color-accent-soft) 0%, ${color.bg} 48%, var(--color-surface) 100%)`,
  }
}

export default function Dashboard() {
  const { user } = useAuth()
  const [walkGroups, setWalkGroups] = useState([])
  const [activeSessions, setActiveSessions] = useState({})
  const [kids, setKids] = useState([])
  const [selectedDay, setSelectedDay] = useState(todayWeekday())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [respondingId, setRespondingId] = useState(null)
  const [kidCount, setKidCount] = useState(0)
  const [activityCount, setActivityCount] = useState(0)
  const [profile, setProfile] = useState(null)
  const [setupContinuePath, setSetupContinuePath] = useState('/welcome')
  const [guidanceRefresh, setGuidanceRefresh] = useState(0)

  useEffect(() => {
    if (!user) return undefined

    syncWalkGroupsForUser(user.uid).catch((err) => {
      console.error('[Dashboard] syncWalkGroupsForUser failed', err)
    })

    const unsubGroups = subscribeToWalkGroups(
      user.uid,
      (data) => {
        setWalkGroups(data)
        setLoading(false)
      },
      (err) => {
        setError(err.message)
        setLoading(false)
      },
    )

    const unsubSessions = subscribeToUserActiveWalkSessions(
      user.uid,
      setActiveSessions,
      (err) => setError(err.message),
    )

    const unsubKids = subscribeToKids(user.uid, (nextKids) => {
      setKids(nextKids)
      setKidCount(nextKids.length)
    })
    const unsubActivities = subscribeToActivities(user.uid, (activities) =>
      setActivityCount(activities.length),
    )
    const unsubProfile = subscribeToUserProfile(user.uid, (data) => {
      setProfile(data)
      setSetupContinuePath(getOnboardingRedirectPath(data))
    })

    return () => {
      unsubGroups()
      unsubSessions()
      unsubKids()
      unsubActivities()
      unsubProfile()
    }
  }, [user])

  useEffect(() => {
    if (!user || kidCount < 1 || activityCount < 1) return
    syncSetupCompletion(user.uid, kidCount, activityCount).catch(() => {})
  }, [user, kidCount, activityCount])

  const showSetupReminder = shouldShowSetupReminder(profile, kidCount, activityCount)

  const dashboardWalkGroups = useMemo(
    () => walkGroups.filter(walkGroupHasMultipleFamilies),
    [walkGroups],
  )

  const acceptedWalkGroups = useMemo(
    () =>
      dashboardWalkGroups.filter(
        (group) =>
          walkGroupUserHasAccepted(group, user?.uid)
          && !walkGroupIsDeclinedForUser(group, user?.uid),
      ),
    [dashboardWalkGroups, user?.uid],
  )

  const pendingWalkGroups = useMemo(
    () =>
      dashboardWalkGroups.filter((group) => walkGroupNeedsUserResponse(group, user?.uid)),
    [dashboardWalkGroups, user?.uid],
  )

  const pendingInvitationIds = useMemo(
    () => pendingWalkGroups.map((group) => group.id),
    [pendingWalkGroups],
  )

  const showInvitationGuidance = useMemo(
    () =>
      pendingInvitationIds.length > 0
      && hasUndismissedIds('dashboard-invitations', pendingInvitationIds),
    [pendingInvitationIds, guidanceRefresh],
  )

  const weekGroupsByDay = useMemo(
    () =>
      buildDashboardWeekGroups(dashboardWalkGroups, user?.uid, activeSessions, {
        walkGroupNeedsUserResponse,
        walkGroupIsDeclinedForUser,
        walkGroupUserHasAccepted,
        getPartiesForUser,
      }),
    [dashboardWalkGroups, user?.uid, activeSessions],
  )

  const hasWeekGroups = useMemo(
    () => Object.values(weekGroupsByDay).some((groups) => groups.length > 0),
    [weekGroupsByDay],
  )

  const declinedWalkGroups = useMemo(
    () =>
      dashboardWalkGroups.filter(
        (group) =>
          walkGroupIsDeclinedForUser(group, user?.uid) && group.day === selectedDay,
      ),
    [dashboardWalkGroups, user?.uid, selectedDay],
  )

  async function handleWalkGroupResponse(groupId, response) {
    setError(null)
    setRespondingId(groupId)
    try {
      const profile = await getUserProfile(user.uid)
      const parentName = profile?.displayName || user.displayName || 'Parent'
      const contactPhone =
        profile?.phoneNumber || user.phoneNumber || user.email || 'Not provided'

      await respondToWalkGroup(groupId, user.uid, response, contactPhone, parentName)
    } catch (err) {
      setError(err.message)
    } finally {
      setRespondingId(null)
    }
  }

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Overview of your walk groups by day"
      />

      {error && <p className="alert-error">{error}</p>}

      {showSetupReminder && (
        <OnboardingReminderBanner continuePath={setupContinuePath} />
      )}

      {!loading && user && (
        <MeetingPointProposalAlerts groups={acceptedWalkGroups} userId={user.uid} />
      )}

      {!loading && showInvitationGuidance && (
        <GuidanceBanner
          onDismiss={() => {
            dismissIds('dashboard-invitations', pendingInvitationIds)
            setGuidanceRefresh((value) => value + 1)
          }}
        >
          You have a new group match! Review and join to start coordinating your walk.
        </GuidanceBanner>
      )}

      {!loading && pendingWalkGroups.length > 0 && (
        <section className="mb-8">
          <h2 className="kr-section-title">Group invitations</h2>
          <p className="kr-section-desc">
            Pending invitations for any day — respond to join your matched walk groups.
          </p>
          <div className="mt-4 space-y-4">
            {pendingWalkGroups.map((group) => {
              const myParties = getPartiesForUser(group, user.uid)
              const primaryChildId = myParties[0]?.childId

              return (
                <div
                  key={group.id}
                  className="kr-card-invite p-6 ring-2 ring-accent/25"
                  style={
                    primaryChildId
                      ? invitationAccentStyle(primaryChildId, kids)
                      : undefined
                  }
                >
                  <span className="badge-accent">Group invitation</span>
                  <p className="mt-3 text-lg font-semibold text-[var(--color-text)]">
                    {formatWalkGroupInvitation(group, user.uid)}
                  </p>
                  <p className="mt-2 text-sm text-muted">{formatWalkGroupDetails(group)}</p>
                  <p className="mt-1 text-sm text-muted">
                    Your children:{' '}
                    {myParties.map((party, index) => (
                      <span key={party.childId}>
                        {index > 0 && ', '}
                        <ChildNameWithDot
                          name={party.childFirstName}
                          childId={party.childId}
                          kids={kids}
                        />
                      </span>
                    ))}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={() => handleWalkGroupResponse(group.id, 'accepted')}
                      disabled={respondingId === group.id}
                      className="btn-accent"
                    >
                      Join group
                    </button>
                    <button
                      type="button"
                      onClick={() => handleWalkGroupResponse(group.id, 'declined')}
                      disabled={respondingId === group.id}
                      className="btn-secondary"
                    >
                      Decline
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}

      <DaySelector
        selectedDay={selectedDay}
        onSelectDay={setSelectedDay}
        className="mb-8"
      />

      <section>
        <h2 className="kr-section-title">Your week</h2>
        <p className="kr-section-desc">
          All confirmed walk groups, Sunday through Saturday.
        </p>

        {loading ? (
          <p className="mt-4 text-muted">Loading groups…</p>
        ) : !hasWeekGroups ? (
          <p className="kr-card-flat mt-4">
            No confirmed walk groups yet. Add an activity on My Activities to find
            families with the same schedule.
          </p>
        ) : (
          <div className="mt-4">
            <DashboardWeekView
              groupsByDay={weekGroupsByDay}
              activeSessions={activeSessions}
              kids={kids}
              selectedDay={selectedDay}
            />
          </div>
        )}
      </section>

      {!loading && declinedWalkGroups.length > 0 && (
        <section className="mt-10">
          <h2 className="kr-section-title">Declined groups</h2>
          <p className="kr-section-desc">
            Groups you left on {selectedDay}. The group continues for other families.
          </p>
          <div className="mt-4 space-y-4">
            {declinedWalkGroups.map((group) => (
              <div key={group.id} className="kr-card p-6">
                <p className="font-semibold text-[var(--color-text)]">
                  {formatWalkGroupDetails(group)}
                </p>
                <p className="mt-2 text-sm text-muted">
                  You declined this group. You can rejoin anytime.
                </p>
                <button
                  type="button"
                  onClick={() => handleWalkGroupResponse(group.id, 'accepted')}
                  disabled={respondingId === group.id}
                  className="btn-primary mt-4"
                >
                  {respondingId === group.id ? 'Joining…' : 'Join group'}
                </button>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
