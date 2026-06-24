import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import KidsRouteLogo from './KidsRouteLogo'
import { logOut } from '../firebase/auth'

const navLinks = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/my-kids', label: 'My Kids' },
  { to: '/my-activities', label: 'Activities' },
  { to: '/groups', label: 'Groups' },
  { to: '/history', label: 'History' },
  { to: '/settings', label: 'Settings' },
]

function NavItem({ to, label }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `kr-nav-link shrink-0 ${isActive ? 'kr-nav-link-active' : 'kr-nav-link-inactive'}`
      }
    >
      {label}
    </NavLink>
  )
}

export default function AppLayout() {
  const navigate = useNavigate()

  async function handleLogout() {
    await logOut()
    navigate('/login')
  }

  return (
    <div className="flex min-h-screen flex-col bg-bg">
      <header className="border-b border-border bg-surface/90 backdrop-blur-sm">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <NavLink to="/dashboard" className="flex items-center gap-2.5">
            <KidsRouteLogo className="h-9 w-9 text-primary" />
            <span className="font-heading text-xl font-semibold text-primary">KidsRoute</span>
          </NavLink>

          <nav className="hidden flex-wrap items-center gap-1 sm:flex">
            {navLinks.map(({ to, label }) => (
              <NavItem key={to} to={to} label={label} />
            ))}
            <button type="button" onClick={handleLogout} className="btn-ghost ml-1">
              Logout
            </button>
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 pb-24 sm:py-8 sm:pb-8">
        <Outlet />
      </main>

      <nav className="kr-nav-bar fixed inset-x-0 bottom-0 z-10 sm:hidden">
        <div className="flex items-center gap-0.5 overflow-x-auto px-2 py-2">
          {navLinks.map(({ to, label }) => (
            <NavItem key={to} to={to} label={label} />
          ))}
        </div>
      </nav>
    </div>
  )
}
