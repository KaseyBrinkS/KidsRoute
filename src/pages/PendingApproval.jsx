import { useState } from 'react'
import AccessShell from '../components/AccessShell'
import { useAuth } from '../context/AuthContext'
import { logOut } from '../firebase/auth'

export default function PendingApproval() {
  const { user } = useAuth()
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
      title="Almost there!"
      description="Your account is pending approval. You'll be notified when you're approved to join."
    >
      <div className="rounded-xl border border-border-warm bg-accent-soft px-4 py-4 text-sm leading-relaxed text-[var(--color-text)]">
        <p>
          Thanks for joining KidsRoute
          {user?.displayName ? `, ${user.displayName.split(' ')[0]}` : ''}. A coordinator is
          reviewing your account — you'll get full access as soon as you're approved.
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
