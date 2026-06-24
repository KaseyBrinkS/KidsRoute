import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import PageHeader from '../components/PageHeader'
import { useAuth } from '../context/AuthContext'
import { formatGroupTimes } from '../firebase/groups'
import { subscribeToLeaderWalkGroups } from '../firebase/groupLeaders'
import { subscribeToActiveWalkSession } from '../firebase/groupWalk'

export default function GroupLeaderHome() {
  const { user } = useAuth()
  const [groups, setGroups] = useState([])
  const [activeSessions, setActiveSessions] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!user) return undefined

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

    return unsubGroups
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

  return (
    <div>
      <PageHeader
        title="Group Leader"
        description="Groups you are assigned to lead"
      />

      {error && <p className="alert-error">{error}</p>}

      {loading ? (
        <p className="text-muted">Loading your groups…</p>
      ) : groups.length === 0 ? (
        <p className="kr-card-flat">
          You are not assigned to lead any groups yet. Parents can volunteer from the Groups page,
          or a family can invite you with an approval link.
        </p>
      ) : (
        <ul className="mt-4 space-y-4">
          {groups.map((group) => {
            const inProgress = Boolean(activeSessions[group.id])
            return (
              <li key={group.id} className="kr-card p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-[var(--color-text)]">{group.location}</p>
                    <p className="mt-1 text-sm text-muted">
                      {group.day} · {formatGroupTimes(group)}
                    </p>
                  </div>
                  <span
                    className={
                      inProgress ? 'badge-walk-active' : 'badge-walk-upcoming'
                    }
                  >
                    {inProgress ? 'Walk in progress' : 'Ready'}
                  </span>
                </div>
                <Link to={`/groups/${group.id}/leader`} className="btn-leader mt-4">
                  Open leader view
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
