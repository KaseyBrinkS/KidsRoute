import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import AccessShell from '../components/AccessShell'
import { INVITE_CODE_INVALID_MESSAGE, verifyInviteCode } from '../firebase/inviteCodes'
import { logOut } from '../firebase/auth'

export default function InviteCode() {
  const { user } = useAuth()
  const [code, setCode] = useState('')
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)
  const [signingOut, setSigningOut] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    if (!user) return

    setError(null)
    setBusy(true)
    try {
      await verifyInviteCode(user.uid, code)
    } catch (err) {
      setError(err.message === INVITE_CODE_INVALID_MESSAGE ? err.message : INVITE_CODE_INVALID_MESSAGE)
    } finally {
      setBusy(false)
    }
  }

  async function handleSignOut() {
    setSigningOut(true)
    try {
      await logOut()
    } finally {
      setSigningOut(false)
    }
  }

  return (
    <AccessShell
      title="Welcome to KidsRoute"
      description="Enter your invite code to get started. This app is currently available to invited families only."
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="inviteCode" className="block text-sm font-medium text-[var(--color-text)]">
            Invite code
          </label>
          <input
            id="inviteCode"
            type="text"
            value={code}
            onChange={(event) => setCode(event.target.value.toUpperCase())}
            placeholder="PS150FALL26"
            className="input-kr mt-1 uppercase tracking-wide"
            autoComplete="off"
            required
          />
        </div>

        {error && <p className="alert-error text-sm">{error}</p>}

        <button type="submit" disabled={busy} className="btn-primary w-full">
          {busy ? 'Checking…' : 'Continue'}
        </button>
      </form>

      <button
        type="button"
        onClick={handleSignOut}
        disabled={signingOut}
        className="btn-ghost mt-4 w-full text-sm"
      >
        {signingOut ? 'Signing out…' : 'Sign out'}
      </button>
    </AccessShell>
  )
}
