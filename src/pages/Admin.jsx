import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import ConfirmDialog from '../components/ConfirmDialog'
import PageHeader from '../components/PageHeader'
import { useAuth } from '../context/AuthContext'
import {
  formatAccountStatus,
  isRemovedAccountStatus,
  removeUserAccount,
  subscribeToAllAccounts,
} from '../firebase/admin'
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

function AccountStatusBadge({ status }) {
  if (!status || status === 'approved') return null

  const removed = isRemovedAccountStatus(status)
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
        removed ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'
      }`}
    >
      {formatAccountStatus(status)}
    </span>
  )
}

export default function Admin() {
  const { user } = useAuth()
  const [accounts, setAccounts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [removeTarget, setRemoveTarget] = useState(null)
  const [removing, setRemoving] = useState(false)

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

  async function handleConfirmRemove() {
    if (!removeTarget) return

    setError(null)
    setRemoving(true)
    try {
      await removeUserAccount(removeTarget.id)
      setRemoveTarget(null)
    } catch (err) {
      setError(err.message)
    } finally {
      setRemoving(false)
    }
  }

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
              {accounts.map((account) => {
                const isSelf = account.id === user?.uid
                const isRemoved = isRemovedAccountStatus(account.accountStatus)

                return (
                  <li key={account.id} className="px-5 py-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-semibold text-[var(--color-text)]">
                            {account.displayName || 'Parent'}
                          </p>
                          <AccountStatusBadge status={account.accountStatus} />
                        </div>
                        <p className="mt-1 text-sm text-muted">{account.email || 'No email'}</p>
                        <p className="mt-1 text-sm text-muted">
                          School: {formatSchoolDisplay(account.school)}
                        </p>
                        <p className="mt-1 text-xs text-muted">
                          Signed up: {formatSignedUpAt(account)}
                          {account.accountStatus && !isRemoved ? (
                            <> · Status: {formatAccountStatus(account.accountStatus)}</>
                          ) : null}
                        </p>
                      </div>

                      {!isSelf && !isRemoved && (
                        <button
                          type="button"
                          onClick={() => setRemoveTarget(account)}
                          className="shrink-0 rounded-xl border border-red-200 px-3 py-1.5 text-sm font-semibold text-red-700 hover:bg-red-50"
                        >
                          Remove user
                        </button>
                      )}
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </section>

        <p className="mt-6">
          <Link to="/dashboard" className="link-accent text-sm">
            ← Back to app
          </Link>
        </p>
      </div>

      <ConfirmDialog
        open={Boolean(removeTarget)}
        title="Remove user"
        message="Remove this user? They will lose access to the app immediately."
        confirmLabel={removing ? 'Removing…' : 'Remove user'}
        busy={removing}
        onConfirm={handleConfirmRemove}
        onCancel={() => {
          if (!removing) setRemoveTarget(null)
        }}
      />
    </div>
  )
}
