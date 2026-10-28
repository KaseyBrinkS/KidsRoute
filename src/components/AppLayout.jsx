import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import KidsRouteLogo from './KidsRouteLogo'
import AppFooter from './AppFooter'
import { useAuth } from '../context/AuthContext'

const navIcons = {
  home: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M3 10.5L12 3l9 7.5M5 9.75V20a1 1 0 001 1h4v-5.5h4V21h4a1 1 0 001-1V9.75"
    />
  ),
  schedule: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M8 7V3m8 4V3M4.5 9h15M6 5h12a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V7a2 2 0 012-2z"
    />
  ),
  matches: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 4.5a2.5 2.5 0 110 5 2.5 2.5 0 010-5zM5.5 8a2 2 0 110 4 2 2 0 010-4zm13 0a2 2 0 110 4 2 2 0 010-4zM4 18.5v-.75A3.25 3.25 0 017.25 14.5h9.5A3.25 3.25 0 0120 17.75v.75"
    />
  ),
  inbox: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M21 8.25V18a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 18V8.25m18 0A2.25 2.25 0 0018.75 6H5.25A2.25 2.25 0 003 8.25m18 0v.75H3v-.75"
    />
  ),
  profile: (
    <>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"
      />
      <circle cx="9" cy="7" r="4" />
    </>
  ),
}

const navLinks = [
  { to: '/home', label: 'Home', icon: navIcons.home },
  { to: '/schedule', label: 'Schedule', icon: navIcons.schedule },
  { to: '/matches', label: 'Matches', icon: navIcons.matches },
  { to: '/inbox', label: 'Inbox', icon: navIcons.inbox },
]

function NavMobileIcon({ children }) {
  return (
    <svg
      className="kr-nav-icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      aria-hidden="true"
    >
      {children}
    </svg>
  )
}

function NavItem({ to, label, icon }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `kr-nav-link-mobile ${isActive ? 'kr-nav-link-active' : 'kr-nav-link-inactive'}`
      }
    >
      <NavMobileIcon>{icon}</NavMobileIcon>
      <span className="max-w-full truncate px-0.5">{label}</span>
    </NavLink>
  )
}

function ProfileButton() {
  const navigate = useNavigate()

  return (
    <button
      type="button"
      onClick={() => navigate('/profile')}
      aria-label="Open profile"
      className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-bg-warm text-primary transition-colors hover:border-primary/30 hover:bg-primary/10"
    >
      <svg
        className="h-5 w-5"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        aria-hidden="true"
      >
        {navIcons.profile}
      </svg>
    </button>
  )
}

export default function AppLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-bg">
      <header className="border-b border-border bg-surface/90 backdrop-blur-sm">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
          <NavLink to="/home" className="flex items-center gap-2.5">
            <KidsRouteLogo className="h-9 w-9" />
            <span className="font-heading text-xl font-semibold text-primary">KidsRoute</span>
          </NavLink>

          <div className="flex items-center gap-2">
            <nav className="hidden items-center gap-1 sm:flex">
              {navLinks.map(({ to, label }) => (
                <NavLink
                  key={to}
                  to={to}
                  className={({ isActive }) =>
                    `kr-nav-link ${isActive ? 'kr-nav-link-active' : 'kr-nav-link-inactive'}`
                  }
                >
                  {label}
                </NavLink>
              ))}
            </nav>
            <ProfileButton />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 pb-[calc(6.5rem+env(safe-area-inset-bottom,0px))] sm:py-8 sm:pb-8">
        <Outlet />
        <AppFooter />
      </main>

      <nav
        className="kr-nav-bar fixed inset-x-0 bottom-0 z-10 sm:hidden"
        aria-label="Main navigation"
      >
        <div className="flex items-stretch px-2 pt-2">
          {navLinks.map(({ to, label, icon }) => (
            <NavItem key={to} to={to} label={label} icon={icon} />
          ))}
        </div>
      </nav>
    </div>
  )
}
