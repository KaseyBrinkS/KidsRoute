import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import PageHeader from '../components/PageHeader'
import { useAuth } from '../context/AuthContext'
import {
  approveAccount,
  rejectAccount,
  subscribeToPendingAccounts,
} from '../firebase/admin'
import { formatSchoolDisplay } from '../firebase/schools'

export default function Admin() {
  const { user } = useAuth()
  const [pending, setPending] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [busyId, setBusyId] = useState(null)

  useEffect(() => {
    const unsub = subscribeToPendingAccounts(
      (accounts) => {
        setPending(accounts)
        setLoading(false)
      },
      (err) => {
        setError(err.message)
        setLoading(false)
      },
    )
    return unsub
  }, [])

  async function handleApprove(accountId) {
    setError(null)
    setBusyId(accountId)
    try {
      await approveAccount(accountId)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusyId(null)
    }
  }

  async function handleReject(accountId) {
    setError(null)
    setBusyId(accountId)
    try {
      await rejectAccount(accountId)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="min-h-screen bg-bg px-4 py-8">
      <div className="mx-auto max-w-3xl">
        <PageHeader
          title="Admin"
          description="Review and approve new family accounts"
        />

        {error && <p className="alert-error mb-4">{error}</p>}

        <section className="kr-card overflow-hidden">
          <div className="border-b border-border px-5 py-4">
            <h2 className="kr-section-title">Pending accounts</h2>
            <p className="kr-section-desc">
              Signed in as admin ({user?.email ?? user?.uid})
            </p>
          </div>

          {loading ? (
            <p className="px-5 py-8 text-muted">Loading pending accounts…</p>
          ) : pending.length === 0 ? (
            <p className="px-5 py-8 text-muted">No accounts waiting for approval.</p>
          ) : (
            <ul className="divide-y divide-border">
              {pending.map((account) => (
                <li key={account.id} className="px-5 py-4">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="font-semibold text-[var(--color-text)]">
                        {account.displayName || 'Parent'}
                      </p>
                      <p className="mt-1 text-sm text-muted">{account.email || 'No email'}</p>
                      <p className="mt-1 text-sm text-muted">
                        School: {formatSchoolDisplay(account.school)}
                      </p>
                      {account.inviteCodeUsed && (
                        <p className="mt-1 text-xs text-muted">
                          Invite code: {account.inviteCodeUsed}
                        </p>
                      )}
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <button
                        type="button"
                        disabled={busyId === account.id}
                        onClick={() => handleApprove(account.id)}
                        className="btn-primary py-1.5 text-xs"
                      >
                        {busyId === account.id ? '…' : 'Approve'}
                      </button>
                      <button
                        type="button"
                        disabled={busyId === account.id}
                        onClick={() => handleReject(account.id)}
                        className="btn-danger py-1.5 text-xs"
                      >
                        Reject
                      </button>
                    </div>
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
