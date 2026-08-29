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
import { subscribeToActiveWalkSession } from '../firebase/groupWalk'
import { subscribeToVolunteeredWalkGroups } from '../firebase/volunteeredWalkGroups'

export default function GroupLeaderHome() {
  const { user } = useAuth()
  const [groups, setGroups] = useState([])
  const [activeSessions, setActiveSessions] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [guidanceRefresh, setGuidanceRefresh] = useState(0)

  useEffect(() => {
    if (!user) return undefined

    const unsubGroups = subscribeToVolunteeredWalkGroups(
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

    return () => unsubGroups()
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
    () => buildLeaderGroupsByDay(groups, activeSessions),
    [groups, activeSessions],
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
        title="Leader"
        description="Walk groups where you volunteer as Walk Leader — start walks and check kids in and out"
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
          You haven&apos;t volunteered as a Walk Leader for any groups yet. Volunteer from the
          Groups tab.
        </p>
      ) : (
        <section className="mt-4">
          <h2 className="kr-section-title">Your week</h2>
          <p className="kr-section-desc">
            Tap Manage walk to start or end a walk and check kids in and out.
          </p>
          <div className="mt-4">
            <LeaderWeekCalendar groupsByDay={groupsByDay} />
          </div>
        </section>
      )}
    </div>
  )
}
