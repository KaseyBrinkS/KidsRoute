import { useEffect, useMemo, useState } from 'react'
import HistoryCalendar from '../components/HistoryCalendar'
import { ChildNameWithDot } from '../components/ChildColorDot'
import PageHeader from '../components/PageHeader'
import ViewToggle from '../components/ViewToggle'
import { useAuth } from '../context/AuthContext'
import { subscribeToKids } from '../firebase/kids'
import {
  formatHistoryDate,
  formatHistoryTime,
  hasDropOffTime,
  subscribeToWalkHistory,
} from '../firebase/walkHistory'
import { historyWalkStatus, walkStatusBadgeClass, walkStatusCardClass } from '../utils/walkStatus'

export default function History() {
  const { user } = useAuth()
  const [entries, setEntries] = useState([])
  const [kids, setKids] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [viewMode, setViewMode] = useState('calendar')

  useEffect(() => {
    if (!user) return

    const unsubscribe = subscribeToWalkHistory(
      user.uid,
      (data) => {
        setEntries(data)
        setLoading(false)
      },
      (err) => {
        setError(err.message)
        setLoading(false)
      },
    )

    const unsubKids = subscribeToKids(user.uid, setKids)

    return () => {
      unsubscribe()
      unsubKids()
    }
  }, [user])

  const entriesByChild = useMemo(() => {
    const grouped = new Map()

    for (const entry of entries) {
      const key = entry.childId
      if (!grouped.has(key)) {
        grouped.set(key, { childId: key, childName: entry.childFirstName, walks: [] })
      }
      grouped.get(key).walks.push(entry)
    }

    return Array.from(grouped.values())
  }, [entries])

  return (
    <div>
      <PageHeader
        title="Walk History"
        description="A log of your children's past group walks"
        actions={
          entries.length > 0 ? (
            <ViewToggle
              value={viewMode}
              onChange={setViewMode}
              options={[
                { value: 'calendar', label: 'Calendar' },
                { value: 'list', label: 'List' },
              ]}
            />
          ) : null
        }
      />

      {error && <p className="alert-error">{error}</p>}

      {loading ? (
        <p className="text-muted">Loading walk history…</p>
      ) : entries.length === 0 ? (
        <p className="kr-card-flat">
          No walk history yet. Completed walks will appear here after a Walk Leader
          starts a walk and marks drop-offs.
        </p>
      ) : viewMode === 'calendar' ? (
        <HistoryCalendar entries={entries} kids={kids} />
      ) : (
        <div className="space-y-8">
          {entriesByChild.map(({ childId, childName, walks }) => (
            <section key={childId}>
              <h2 className="text-xl font-bold text-primary">
                <ChildNameWithDot name={childName} childId={childId} kids={kids} />
              </h2>
              <div className="mt-4 space-y-4">
                {walks.map((walk) => {
                  const status = historyWalkStatus(walk)
                  return (
                    <div key={walk.id} className={`p-5 ${walkStatusCardClass(status)}`}>
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <p className="font-semibold text-[var(--color-text)]">
                          {formatHistoryDate(walk.pickedUpAt)}
                        </p>
                        <span className={walkStatusBadgeClass(status)}>
                          {status === 'in progress'
                            ? 'En route'
                            : status === 'completed'
                              ? 'Completed'
                              : 'Before pickup'}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-muted">{walk.location}</p>
                      <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
                        <div>
                          <dt className="text-muted">Picked up from school</dt>
                          <dd className="font-semibold text-[var(--color-text)]">
                            {formatHistoryTime(walk.pickedUpAt)}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-muted">Dropped off at activity</dt>
                          <dd className="font-semibold text-[var(--color-text)]">
                            {hasDropOffTime(walk)
                              ? formatHistoryTime(walk.droppedOffAt)
                              : 'In progress'}
                          </dd>
                        </div>
                      </dl>
                    </div>
                  )
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}
