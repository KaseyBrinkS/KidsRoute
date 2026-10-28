import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { buildRideStatusFromSession, buildTripFromGroup } from '../firebase/appModel'
import {
  subscribeToActiveWalkSession,
  subscribeToGroupDocument,
  subscribeToWalkSessionChildren,
} from '../firebase/groupWalk'
import { getPartiesForUser } from '../firebase/walkGroups'

const STATUS_STEPS = [
  { key: 'confirmed', label: 'Confirmed' },
  { key: 'en_route', label: 'Guide en route' },
  { key: 'picked_up', label: 'Child picked up' },
  { key: 'dropped_off', label: 'Child dropped off safely' },
]

export default function RideDetail() {
  const { groupId } = useParams()
  const { user } = useAuth()
  const [group, setGroup] = useState(null)
  const [session, setSession] = useState(null)
  const [sessionChild, setSessionChild] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!groupId) return undefined
    return subscribeToGroupDocument(groupId, (data) => {
      setGroup(data)
      setLoading(false)
    })
  }, [groupId])

  useEffect(() => {
    if (!groupId || !user) return undefined
    return subscribeToActiveWalkSession(groupId, user.uid, setSession)
  }, [groupId, user])

  useEffect(() => {
    if (!session?.id || !user) {
      setSessionChild(null)
      return undefined
    }
    const party = getPartiesForUser(group, user.uid)[0]
    return subscribeToWalkSessionChildren(session.id, (children) => {
      const childDoc = children.find(
        (c) => c.userId === user.uid && c.childId === party?.childId,
      )
      setSessionChild(childDoc ?? null)
    })
  }, [session?.id, user, group])

  if (loading) {
    return <div className="py-12 text-center text-muted">Loading ride…</div>
  }

  if (!group) {
    return (
      <div className="space-y-4 py-12 text-center">
        <p className="text-muted">Ride not found.</p>
        <Link to="/home" className="link-accent">Back to Home</Link>
      </div>
    )
  }

  const trip = buildTripFromGroup(group, user?.uid, { activeSession: session })
  const party = getPartiesForUser(group, user?.uid)[0]
  const rideStatus = buildRideStatusFromSession(session, sessionChild)
  const meetingPoint = group.meetingPoint?.address ?? group.location

  return (
    <div className="space-y-6">
      <Link to="/home" className="link-accent text-sm font-medium">← Back to Home</Link>

      <div className="kr-card px-5 py-6">
        <h1 className="font-heading text-2xl font-semibold text-primary">{trip.childName}&apos;s ride</h1>
        <p className="mt-1 text-muted">{trip.destination} · {trip.day} · {trip.time}</p>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-border bg-bg-warm px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">Guide</p>
            <p className="mt-1 font-semibold text-[var(--color-text)]">{trip.guideName}</p>
          </div>
          <div className="rounded-2xl border border-border bg-bg-warm px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">Pickup</p>
            <p className="mt-1 font-semibold text-[var(--color-text)]">{meetingPoint}</p>
            <p className="text-sm text-muted">{trip.time}</p>
          </div>
          <div className="rounded-2xl border border-border bg-bg-warm px-4 py-3 sm:col-span-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">Drop-off</p>
            <p className="mt-1 font-semibold text-[var(--color-text)]">{trip.destination}</p>
          </div>
        </div>

        <div className="mt-6">
          <h2 className="kr-section-title">Live trip status</h2>
          <p className="mb-3 text-sm font-semibold text-primary">{rideStatus.label}</p>
          <ol className="space-y-2">
            {STATUS_STEPS.map((step) => {
              const activeIndex = STATUS_STEPS.findIndex((s) => s.key === rideStatus.step)
              const stepIndex = STATUS_STEPS.findIndex((s) => s.key === step.key)
              const done = stepIndex <= activeIndex
              return (
                <li
                  key={step.key}
                  className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm ${
                    done ? 'bg-primary/10 text-primary font-semibold' : 'text-muted'
                  }`}
                >
                  <span className={`h-2.5 w-2.5 rounded-full ${done ? 'bg-primary' : 'bg-border'}`} />
                  {step.label}
                </li>
              )
            })}
          </ol>
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          <Link to={`/inbox/${groupId}`} className="btn-secondary">
            Message guide
          </Link>
          <Link to={`/groups/${groupId}/walk`} className="btn-primary">
            Open walk controls
          </Link>
        </div>
      </div>
    </div>
  )
}
