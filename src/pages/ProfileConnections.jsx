import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import PageHeader from '../components/PageHeader'
import ProfileBackLink from '../components/ProfileBackLink'
import { useAuth } from '../context/AuthContext'
import { formatWalkGroupDetails, getActiveParties, subscribeToWalkGroups, walkGroupUserHasAccepted } from '../firebase/walkGroups'

export default function ProfileConnections() {
  const { user } = useAuth()
  const [walkGroups, setWalkGroups] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return undefined
    return subscribeToWalkGroups(user.uid, (data) => {
      setWalkGroups(data.filter((g) => walkGroupUserHasAccepted(g, user.uid)))
      setLoading(false)
    })
  }, [user])

  const connections = useMemo(() => {
    const byFamily = new Map()

    for (const group of walkGroups) {
      for (const party of getActiveParties(group)) {
        if (party.userId === user?.uid) continue
        const key = party.userId
        const existing = byFamily.get(key)
        const activity = group.location ?? 'Activity'
        if (existing) {
          if (!existing.activities.includes(activity)) {
            existing.activities.push(activity)
          }
          existing.groupIds.push(group.id)
        } else {
          byFamily.set(key, {
            id: key,
            name: party.parentName?.split(/\s+/)[0] ?? 'Family',
            activities: [activity],
            groupIds: [group.id],
            sampleSchedule: formatWalkGroupDetails(group),
          })
        }
      }
    }

    return [...byFamily.values()].sort((a, b) => a.name.localeCompare(b.name))
  }, [walkGroups, user?.uid])

  if (loading) {
    return <div className="py-12 text-center text-muted">Loading connections…</div>
  }

  return (
    <div className="space-y-6">
      <ProfileBackLink />
      <PageHeader
        title="Trusted Connections"
        description="Families you walk with through shared activities and matched routes."
      />

      {connections.length === 0 ? (
        <p className="text-sm text-muted">
          No trusted connections yet. Add activities in Schedule and accept matches to connect with other families.
        </p>
      ) : (
        <div className="space-y-3">
          {connections.map((connection) => (
            <div key={connection.id} className="kr-card px-4 py-4">
              <p className="font-semibold text-[var(--color-text)]">{connection.name}&apos;s family</p>
              <p className="mt-1 text-sm text-muted">{connection.activities.join(' · ')}</p>
              <p className="mt-1 text-sm text-muted">{connection.sampleSchedule}</p>
              {connection.groupIds[0] ? (
                <Link to={`/inbox/${connection.groupIds[0]}`} className="link-accent mt-3 inline-block text-sm font-semibold">
                  Message
                </Link>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
