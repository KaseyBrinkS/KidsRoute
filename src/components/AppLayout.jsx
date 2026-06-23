import { NavLink, Outlet, useNavigate } from 'react-router-dom'
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
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 px-4 py-4">
          <span className="text-lg font-semibold text-indigo-600">KidsRoute</span>
          <nav className="flex flex-wrap items-center gap-1">
            {navLinks.map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-indigo-50 text-indigo-700'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }`
                }
              >
                {label}
              </NavLink>
            ))}
            <button
              type="button"
              onClick={handleLogout}
              className="ml-2 rounded-md px-3 py-2 text-sm font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-900"
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
