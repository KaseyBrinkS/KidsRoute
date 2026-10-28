import { Link, useNavigate } from 'react-router-dom'
import PageHeader from '../components/PageHeader'
import { logOut } from '../firebase/auth'
import { useAuth } from '../context/AuthContext'

const PROFILE_LINKS = [
  {
    to: '/profile/family',
    label: 'Family Profiles',
    description: 'Children and authorized adults',
  },
  {
    to: '/profile/connections',
    label: 'Trusted Connections',
    description: 'Families you walk with regularly',
  },
  {
    to: '/profile/settings',
    label: 'Settings',
    description: 'Phone, address, and account details',
  },
  {
    to: '/profile/notifications',
    label: 'Notification Preferences',
    description: 'SMS, email, and alert preferences',
  },
]

export default function Profile() {
  const navigate = useNavigate()
  const { user } = useAuth()

  async function handleSignOut() {
    await logOut()
    navigate('/login')
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Profile"
        description={user?.email ?? 'Your family account'}
      />

      <div className="space-y-3">
        {PROFILE_LINKS.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className="kr-card block px-5 py-4 transition-shadow hover:shadow-md"
          >
            <p className="font-semibold text-[var(--color-text)]">{item.label}</p>
            <p className="mt-1 text-sm text-muted">{item.description}</p>
          </Link>
        ))}
      </div>

      <button type="button" onClick={handleSignOut} className="btn-secondary w-full py-3">
        Sign out
      </button>
    </div>
  )
}
