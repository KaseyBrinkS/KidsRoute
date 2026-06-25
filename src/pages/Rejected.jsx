import { useState } from 'react'
import AccessShell from '../components/AccessShell'
import { logOut } from '../firebase/auth'

export default function Rejected() {
  const [signingOut, setSigningOut] = useState(false)

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
      title="Unable to join"
      description="We're sorry — your account wasn't approved for KidsRoute at this time."
    >
      <div className="rounded-xl border border-border bg-bg-warm px-4 py-4 text-sm leading-relaxed text-[var(--color-text)]">
        <p>
          If you think this was a mistake, please contact your school coordinator. You're welcome
          to reach out if your family becomes eligible in the future.
        </p>
      </div>

      <button
        type="button"
        onClick={handleSignOut}
        disabled={signingOut}
        className="btn-secondary mt-6 w-full"
      >
        {signingOut ? 'Signing out…' : 'Sign out'}
      </button>
    </AccessShell>
  )
}
