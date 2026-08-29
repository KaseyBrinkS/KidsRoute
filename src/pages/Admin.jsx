import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import PageHeader from '../components/PageHeader'
import { useAuth } from '../context/AuthContext'
import { formatAccountStatus, subscribeToAllAccounts } from '../firebase/admin'
import { formatSchoolDisplay } from '../firebase/schools'

function formatSignedUpAt(account) {
  const timestamp = account.createdAt ?? account.updatedAt
  if (!timestamp?.seconds) return 'Unknown'
  return new Date(timestamp.seconds * 1000).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export default function Admin() {
  const { user } = useAuth()
  const [accounts, setAccounts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const unsub = subscribeToAllAccounts(
      (nextAccounts) => {
        setAccounts(nextAccounts)
        setLoading(false)
      },
      (err) => {
        setError(err.message)
        setLoading(false)
      },
    )
    return unsub
  }, [])

  return (
    <div className="min-h-screen bg-bg px-4 py-8">
      <div className="mx-auto max-w-3xl">
        <PageHeader
          title="Admin"
          description="View families who have signed up for KidsRoute"
        />

        {error && <p className="alert-error mb-4">{error}</p>}

        <section className="kr-card overflow-hidden">
          <div className="border-b border-border px-5 py-4">
            <h2 className="kr-section-title">Signed-up accounts</h2>
            <p className="kr-section-desc">
              Signed in as admin ({user?.email ?? user?.uid})
            </p>
          </div>

          {loading ? (
            <p className="px-5 py-8 text-muted">Loading accounts…</p>
          ) : accounts.length === 0 ? (
            <p className="px-5 py-8 text-muted">No accounts yet.</p>
          ) : (
            <ul className="divide-y divide-border">
              {accounts.map((account) => (
                <li key={account.id} className="px-5 py-4">
                  <div className="min-w-0">
                    <p className="font-semibold text-[var(--color-text)]">
                      {account.displayName || 'Parent'}
                    </p>
                    <p className="mt-1 text-sm text-muted">{account.email || 'No email'}</p>
                    <p className="mt-1 text-sm text-muted">
                      School: {formatSchoolDisplay(account.school)}
                    </p>
                    <p className="mt-1 text-xs text-muted">
                      Signed up: {formatSignedUpAt(account)}
                      {account.accountStatus ? (
                        <> · Status: {formatAccountStatus(account.accountStatus)}</>
                      ) : null}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <p className="mt-6">
          <Link to="/dashboard" className="link-accent text-sm">
            ← Back to app
          </Link>
        </p>
      </div>
    </div>
  )
}
