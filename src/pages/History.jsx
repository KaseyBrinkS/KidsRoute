import { useEffect, useMemo, useState } from 'react'
import PageHeader from '../components/PageHeader'
import { useAuth } from '../context/AuthContext'
import {
  formatHistoryDate,
  formatHistoryTime,
  hasDropOffTime,
  subscribeToWalkHistory,
} from '../firebase/walkHistory'

export default function History() {
  const { user } = useAuth()
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

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

    return unsubscribe
  }, [user])

  const entriesByChild = useMemo(() => {
    const grouped = new Map()

    for (const entry of entries) {
      const key = entry.childId
      if (!grouped.has(key)) {
        grouped.set(key, { childName: entry.childFirstName, walks: [] })
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
      />

      {error && (
        <p className="mb-4 rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
      )}

      {loading ? (
        <p className="text-sm text-gray-600">Loading walk history…</p>
      ) : entries.length === 0 ? (
        <p className="rounded-lg border border-dashed border-gray-300 bg-white px-4 py-8 text-center text-sm text-gray-600">
          No walk history yet. Completed walks will appear here after a group leader
          starts a walk and marks drop-offs.
        </p>
      ) : (
        <div className="space-y-8">
          {entriesByChild.map(({ childName, walks }) => (
            <section key={childName}>
              <h2 className="text-sm font-medium text-gray-900">{childName}</h2>
              <ul className="mt-3 divide-y divide-gray-200 rounded-lg border border-gray-200 bg-white">
                {walks.map((walk) => (
                  <li key={walk.id} className="px-4 py-4 sm:px-6">
                    <p className="font-medium text-gray-900">{formatHistoryDate(walk.pickedUpAt)}</p>
                    <p className="mt-1 text-sm text-gray-600">{walk.location}</p>
                    <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                      <div>
                        <dt className="text-gray-500">Picked up from school</dt>
                        <dd className="font-medium text-gray-900">
                          {formatHistoryTime(walk.pickedUpAt)}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-gray-500">Dropped off at activity</dt>
                        <dd className="font-medium text-gray-900">
                          {hasDropOffTime(walk)
                            ? formatHistoryTime(walk.droppedOffAt)
                            : 'In progress'}
                        </dd>
                      </div>
                    </dl>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}
