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
import {
  contactSubjectLabel,
  formatContactSubmittedAt,
  subscribeToContactSubmissions,
} from '../firebase/contactSubmissions'
import {
  approveCommunityLocation,
  rejectCommunityLocation,
  subscribeToPendingLocations,
} from '../firebase/locationsRegistry'
import {
  approveCommunitySchool,
  rejectCommunitySchool,
  subscribeToPendingSchools,
} from '../firebase/schoolsRegistry'
import { formatSchoolDisplay } from '../firebase/schools'

function formatSubmittedAt(entry) {
  const timestamp = entry.createdAt
  if (!timestamp?.seconds) return 'Unknown'
  return new Date(timestamp.seconds * 1000).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

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
  const [contactSubmissions, setContactSubmissions] = useState([])
  const [pendingSchools, setPendingSchools] = useState([])
  const [pendingLocations, setPendingLocations] = useState([])
  const [loading, setLoading] = useState(true)
  const [contactsLoading, setContactsLoading] = useState(true)
  const [schoolsLoading, setSchoolsLoading] = useState(true)
  const [locationsLoading, setLocationsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [removeTarget, setRemoveTarget] = useState(null)
  const [removing, setRemoving] = useState(false)
  const [reviewBusyId, setReviewBusyId] = useState(null)

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

  useEffect(() => {
    const unsub = subscribeToContactSubmissions(
      (nextSubmissions) => {
        setContactSubmissions(nextSubmissions)
        setContactsLoading(false)
      },
      (err) => {
        setError(err.message)
        setContactsLoading(false)
      },
    )
    return unsub
  }, [])

  useEffect(() => {
    const unsub = subscribeToPendingSchools(
      (nextSchools) => {
        setPendingSchools(nextSchools)
        setSchoolsLoading(false)
      },
      (err) => {
        setError(err.message)
        setSchoolsLoading(false)
      },
    )
    return unsub
  }, [])

  useEffect(() => {
    const unsub = subscribeToPendingLocations(
      (nextLocations) => {
        setPendingLocations(nextLocations)
        setLocationsLoading(false)
      },
      (err) => {
        setError(err.message)
        setLocationsLoading(false)
      },
    )
    return unsub
  }, [])

  async function handleApproveSchool(schoolId) {
    setError(null)
    setReviewBusyId(`school-approve-${schoolId}`)
    try {
      await approveCommunitySchool(schoolId)
    } catch (err) {
      setError(err.message)
    } finally {
      setReviewBusyId(null)
    }
  }

  async function handleRejectSchool(schoolId) {
    setError(null)
    setReviewBusyId(`school-reject-${schoolId}`)
    try {
      await rejectCommunitySchool(schoolId)
    } catch (err) {
      setError(err.message)
    } finally {
      setReviewBusyId(null)
    }
  }

  async function handleApproveLocation(locationId) {
    setError(null)
    setReviewBusyId(`location-approve-${locationId}`)
    try {
      await approveCommunityLocation(locationId)
    } catch (err) {
      setError(err.message)
    } finally {
      setReviewBusyId(null)
    }
  }

  async function handleRejectLocation(locationId) {
    setError(null)
    setReviewBusyId(`location-reject-${locationId}`)
    try {
      await rejectCommunityLocation(locationId)
    } catch (err) {
      setError(err.message)
    } finally {
      setReviewBusyId(null)
    }
  }

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
            <h2 className="kr-section-title">Pending school requests</h2>
            <p className="kr-section-desc">
              Community-added schools waiting for approval before they appear for all users
            </p>
          </div>

          {schoolsLoading ? (
            <p className="px-5 py-8 text-muted">Loading school requests…</p>
          ) : pendingSchools.length === 0 ? (
            <p className="px-5 py-8 text-muted">No pending school requests.</p>
          ) : (
            <ul className="divide-y divide-border">
              {pendingSchools.map((school) => (
                <li key={school.id} className="px-5 py-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <p className="font-semibold text-[var(--color-text)]">{school.name}</p>
                      <p className="mt-1 text-xs text-muted">
                        Submitted {formatSubmittedAt(school)}
                        {school.submittedBy ? <> · User {school.submittedBy}</> : null}
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <button
                        type="button"
                        onClick={() => handleApproveSchool(school.id)}
                        disabled={reviewBusyId !== null}
                        className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-sm font-semibold text-emerald-800 hover:bg-emerald-100 disabled:opacity-50"
                      >
                        {reviewBusyId === `school-approve-${school.id}` ? 'Approving…' : 'Approve'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRejectSchool(school.id)}
                        disabled={reviewBusyId !== null}
                        className="rounded-xl border border-red-200 px-3 py-1.5 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
                      >
                        {reviewBusyId === `school-reject-${school.id}` ? 'Rejecting…' : 'Reject'}
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="kr-card mt-8 overflow-hidden">
          <div className="border-b border-border px-5 py-4">
            <h2 className="kr-section-title">Pending location requests</h2>
            <p className="kr-section-desc">
              Custom activity locations submitted by families for review
            </p>
          </div>

          {locationsLoading ? (
            <p className="px-5 py-8 text-muted">Loading location requests…</p>
          ) : pendingLocations.length === 0 ? (
            <p className="px-5 py-8 text-muted">No pending location requests.</p>
          ) : (
            <ul className="divide-y divide-border">
              {pendingLocations.map((location) => (
                <li key={location.id} className="px-5 py-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <p className="font-semibold text-[var(--color-text)]">{location.name}</p>
                      <p className="mt-1 text-xs text-muted">
                        Submitted {formatSubmittedAt(location)}
                        {location.submittedBy ? <> · User {location.submittedBy}</> : null}
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <button
                        type="button"
                        onClick={() => handleApproveLocation(location.id)}
                        disabled={reviewBusyId !== null}
                        className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-sm font-semibold text-emerald-800 hover:bg-emerald-100 disabled:opacity-50"
                      >
                        {reviewBusyId === `location-approve-${location.id}`
                          ? 'Approving…'
                          : 'Approve'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRejectLocation(location.id)}
                        disabled={reviewBusyId !== null}
                        className="rounded-xl border border-red-200 px-3 py-1.5 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
                      >
                        {reviewBusyId === `location-reject-${location.id}`
                          ? 'Rejecting…'
                          : 'Reject'}
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="kr-card mt-8 overflow-hidden">
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

        <section className="kr-card mt-8 overflow-hidden">
          <div className="border-b border-border px-5 py-4">
            <h2 className="kr-section-title">Contact form messages</h2>
            <p className="kr-section-desc">Newest submissions first</p>
          </div>

          {contactsLoading ? (
            <p className="px-5 py-8 text-muted">Loading messages…</p>
          ) : contactSubmissions.length === 0 ? (
            <p className="px-5 py-8 text-muted">No contact messages yet.</p>
          ) : (
            <ul className="divide-y divide-border">
              {contactSubmissions.map((submission) => (
                <li key={submission.id} className="px-5 py-4">
                  <div className="flex flex-col gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-[var(--color-text)]">
                        {submission.name}
                      </p>
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                        {contactSubjectLabel(submission.subject)}
                      </span>
                    </div>
                    <p className="text-sm text-muted">
                      <a href={`mailto:${submission.email}`} className="link-accent">
                        {submission.email}
                      </a>
                    </p>
                    <p className="whitespace-pre-wrap text-sm leading-relaxed text-[var(--color-text)]">
                      {submission.message}
                    </p>
                    <p className="text-xs text-muted">
                      {formatContactSubmittedAt(submission)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <p className="mt-6">
          <Link to="/home" className="link-accent text-sm">
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
