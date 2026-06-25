import { useEffect, useMemo, useState } from 'react'
import GuidanceBanner from '../components/GuidanceBanner'
import LeaderWeekCalendar, { buildLeaderGroupsByDay } from '../components/LeaderWeekCalendar'
import PageHeader from '../components/PageHeader'
import { getConfirmedMeetingPoint } from '../firebase/meetingPoints'
import {
  dismissIds,
  hasUndismissedIds,
} from '../utils/guidanceDismissals'
import { useAuth } from '../context/AuthContext'
import { subscribeToLeaderWalkGroups } from '../firebase/groupLeaders'
import { subscribeToActiveWalkSession } from '../firebase/groupWalk'
import { subscribeToKids } from '../firebase/kids'
import { repairWalkGroupParticipantIds } from '../firebase/walkGroups'

export default function GroupLeaderHome() {
  const { user } = useAuth()
  const [groups, setGroups] = useState([])
  const [kids, setKids] = useState([])
  const [activeSessions, setActiveSessions] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [guidanceRefresh, setGuidanceRefresh] = useState(0)

  useEffect(() => {
    if (!user) return undefined

    repairWalkGroupParticipantIds(user.uid).catch((err) => {
      console.error('[GroupLeaderHome] repairWalkGroupParticipantIds failed', err)
    })

    const unsubGroups = subscribeToLeaderWalkGroups(
      user.uid,
      (leaderGroups) => {
        setGroups(leaderGroups)
        setLoading(false)
      },
      (err) => {
        setError(err.message)
        setLoading(false)
      },
    )

    const unsubKids = subscribeToKids(user.uid, setKids, (err) => setError(err.message))

    return () => {
      unsubGroups()
      unsubKids()
    }
  }, [user])

  useEffect(() => {
    if (!user || groups.length === 0) return undefined

    const unsubs = groups.map((group) =>
      subscribeToActiveWalkSession(
        group.id,
        user.uid,
        (session) => {
          setActiveSessions((current) => ({
            ...current,
            [group.id]: session,
          }))
        },
        (err) => setError(err.message),
        { leaderAccess: true },
      ),
    )

    return () => unsubs.forEach((unsub) => unsub())
  }, [user, groups])

  const groupsByDay = useMemo(
    () => (user ? buildLeaderGroupsByDay(groups, user.uid, activeSessions) : {}),
    [groups, user, activeSessions],
  )

  const groupsNeedingMeetingPoint = useMemo(
    () => groups.filter((group) => !getConfirmedMeetingPoint(group)).map((group) => group.id),
    [groups],
  )

  const showMeetingPointGuidance = useMemo(
    () =>
      groupsNeedingMeetingPoint.length > 0
      && hasUndismissedIds('leader-meeting-point', groupsNeedingMeetingPoint),
    [groupsNeedingMeetingPoint, guidanceRefresh],
  )

  return (
    <div>
      <PageHeader
        title="My Groups"
        description="Your walk groups for the week — tap a group to start or manage a walk"
      />

      {error && <p className="alert-error">{error}</p>}

      {!loading && showMeetingPointGuidance && (
        <GuidanceBanner
          onDismiss={() => {
            dismissIds('leader-meeting-point', groupsNeedingMeetingPoint)
            setGuidanceRefresh((value) => value + 1)
          }}
        >
          Don&apos;t forget to propose a meeting point so your group knows where to meet.
        </GuidanceBanner>
      )}

      {loading ? (
        <p className="text-muted">Loading your groups…</p>
      ) : groups.length === 0 ? (
        <p className="kr-card-flat">
          No walk groups yet. After you accept a group invitation on the Dashboard, it will appear
          here and you can start and manage walks for that group.
        </p>
      ) : (
        <section className="mt-4">
          <h2 className="kr-section-title">Your week</h2>
          <p className="kr-section-desc">
            Sunday through Saturday — colored cards show each group on its walk day.
          </p>
          <div className="mt-4">
            <LeaderWeekCalendar groupsByDay={groupsByDay} kids={kids} />
          </div>
        </section>
      )}
    </div>
  )
}
