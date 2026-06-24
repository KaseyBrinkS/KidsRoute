import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import KidsRouteLogo from './KidsRouteLogo'
import { logOut } from '../firebase/auth'

const navLinks = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/my-kids', label: 'My Kids' },
  { to: '/my-activities', label: 'My Activities' },
  { to: '/groups', label: 'Groups' },
  { to: '/history', label: 'History' },
  { to: '/settings', label: 'Settings' },
]

export default function AppLayout() {
  const navigate = useNavigate()

  async function handleLogout() {
    await logOut()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-bg">
      <header className="border-b border-border bg-surface shadow-sm">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 px-4 py-4">
          <NavLink to="/dashboard" className="flex items-center gap-2.5">
            <KidsRouteLogo className="h-9 w-9 text-primary" />
            <span className="text-xl font-bold text-primary">KidsRoute</span>
          </NavLink>
          <nav className="flex flex-wrap items-center gap-1">
            {navLinks.map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `rounded-xl px-3 py-2 text-sm font-semibold transition-colors ${
                    isActive
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted hover:bg-bg-warm hover:text-[var(--color-text)]'
                  }`
                }
              >
                {label}
              </NavLink>
            ))}
            <button
              type="button"
              onClick={handleLogout}
              className="btn-ghost ml-1"
            >
              Logout
            </button>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8">
        <Outlet />
      </main>
    </div>
  )
}
