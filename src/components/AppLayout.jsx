import { useEffect, useRef, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import KidsRouteLogo from './KidsRouteLogo'
import AppFooter from './AppFooter'
import { logOut } from '../firebase/auth'
import { useAuth } from '../context/AuthContext'
import { subscribeToUserProfile } from '../firebase/users'

const navIcons = {
  dashboard: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M3 10.5L12 3l9 7.5M5 9.75V20a1 1 0 001 1h4v-5.5h4V21h4a1 1 0 001-1V9.75"
    />
  ),
  activities: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M8 7V3m8 4V3M4.5 9h15M6 5h12a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V7a2 2 0 012-2z"
    />
  ),
  groups: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 4.5a2.5 2.5 0 110 5 2.5 2.5 0 010-5zM5.5 8a2 2 0 110 4 2 2 0 010-4zm13 0a2 2 0 110 4 2 2 0 010-4zM4 18.5v-.75A3.25 3.25 0 017.25 14.5h9.5A3.25 3.25 0 0120 17.75v.75"
    />
  ),
  leader: (
    <>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"
      />
      <circle cx="9" cy="7" r="4" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 8v6M22 11h-6" />
    </>
  ),
  history: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 8v4l2.5 2M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  ),
  settings: (
    <>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 15.5a3.5 3.5 0 100-7 3.5 3.5 0 000 7z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09a1.65 1.65 0 00-1-1.51 1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09a1.65 1.65 0 001.51-1 1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9c.26.604.852.997 1.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"
      />
    </>
  ),
  more: (
    <>
      <circle cx="6" cy="12" r="1.75" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1.75" fill="currentColor" stroke="none" />
      <circle cx="18" cy="12" r="1.75" fill="currentColor" stroke="none" />
    </>
  ),
  logout: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6A2.25 2.25 0 005.25 5.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75"
    />
  ),
}

const navLinks = [
  { to: '/dashboard', label: 'Dashboard', mobileLabel: 'Dashboard', icon: navIcons.dashboard },
  { to: '/my-activities', label: 'Activities', mobileLabel: 'Activities', icon: navIcons.activities },
  { to: '/groups', label: 'Groups', mobileLabel: 'Groups', icon: navIcons.groups },
  { to: '/leader', label: 'Leader', mobileLabel: 'Leader', icon: navIcons.leader },
  { to: '/history', label: 'History', mobileLabel: 'History', icon: navIcons.history },
  { to: '/settings', label: 'Settings', mobileLabel: 'Settings', icon: navIcons.settings },
]

const externalLeaderLinks = [
  { to: '/leader', label: 'Leader', mobileLabel: 'Leader', icon: navIcons.leader },
  { to: '/settings', label: 'Settings', mobileLabel: 'Settings', icon: navIcons.settings },
]

function useLayoutNavLinks() {
  const { user } = useAuth()
  const [isExternalLeader, setIsExternalLeader] = useState(false)

  useEffect(() => {
    if (!user) return undefined
    return subscribeToUserProfile(
      user.uid,
      (profile) => setIsExternalLeader(profile.accountType === 'external_leader'),
      () => setIsExternalLeader(false),
    )
  }, [user])

  return {
    links: isExternalLeader ? externalLeaderLinks : navLinks,
    isExternalLeader,
  }
}

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

function NavItem({ to, label, icon, compact = false }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        compact
          ? `kr-nav-link-mobile ${isActive ? 'kr-nav-link-active' : 'kr-nav-link-inactive'}`
          : `kr-nav-link shrink-0 ${isActive ? 'kr-nav-link-active' : 'kr-nav-link-inactive'}`
      }
    >
      {compact && icon ? <NavMobileIcon>{icon}</NavMobileIcon> : null}
      <span className="max-w-full truncate px-0.5">{label}</span>
    </NavLink>
  )
}

function MobileMoreMenu({ links, onLogout }) {
  const location = useLocation()
  const [open, setOpen] = useState(false)
  const menuRef = useRef(null)

  const isMoreActive = links.some(({ to }) => location.pathname === to)

  useEffect(() => {
    if (!open) return

    function handlePointerDown(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setOpen(false)
      }
    }

    document.addEventListener('pointerdown', handlePointerDown)
    return () => document.removeEventListener('pointerdown', handlePointerDown)
  }, [open])

  useEffect(() => {
    setOpen(false)
  }, [location.pathname])

  return (
    <div ref={menuRef} className="relative flex min-w-0 flex-1">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        aria-haspopup="menu"
        className={`kr-nav-link-mobile w-full ${
          isMoreActive || open ? 'kr-nav-link-active' : 'kr-nav-link-inactive'
        }`}
      >
        <NavMobileIcon>{navIcons.more}</NavMobileIcon>
        <span className="max-w-full truncate px-0.5">More</span>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute bottom-full right-0 z-20 mb-3 min-w-[11rem] overflow-hidden rounded-2xl border border-border bg-surface py-1 shadow-lg"
        >
          {links.map(({ to, label, icon }) => (
            <NavLink
              key={to}
              to={to}
              role="menuitem"
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 text-sm font-semibold transition-colors ${
                  isActive
                    ? 'bg-primary/12 text-primary'
                    : 'text-muted hover:bg-bg-warm hover:text-primary'
                }`
              }
            >
              <NavMobileIcon>{icon}</NavMobileIcon>
              {label}
            </NavLink>
          ))}
          <button
            type="button"
            role="menuitem"
            onClick={onLogout}
            className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-semibold text-muted transition-colors hover:bg-bg-warm hover:text-primary"
          >
            <NavMobileIcon>{navIcons.logout}</NavMobileIcon>
            Logout
          </button>
        </div>
      )}
    </div>
  )
}

export default function AppLayout() {
  const navigate = useNavigate()
  const { links: layoutLinks, isExternalLeader } = useLayoutNavLinks()
  const mobilePrimary = isExternalLeader ? layoutLinks : layoutLinks.slice(0, 4)
  const mobileMore = isExternalLeader ? [] : layoutLinks.slice(4)

  async function handleLogout() {
    await logOut()
    navigate('/login')
  }

  return (
    <div className="flex min-h-screen flex-col bg-bg">
      <header className="border-b border-border bg-surface/90 backdrop-blur-sm">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <NavLink to="/welcome" className="flex items-center gap-2.5">
            <KidsRouteLogo className="h-9 w-9" />
            <span className="font-heading text-xl font-semibold text-primary">KidsRoute</span>
          </NavLink>

          <nav className="hidden flex-wrap items-center gap-1 sm:flex">
            {layoutLinks.map(({ to, label }) => (
              <NavItem key={to} to={to} label={label} />
            ))}
            <button type="button" onClick={handleLogout} className="btn-ghost ml-1">
              Logout
            </button>
          </nav>
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
          {mobilePrimary.map(({ to, mobileLabel, label, icon }) => (
            <NavItem key={to} to={to} label={mobileLabel ?? label} icon={icon} compact />
          ))}
          {mobileMore.length > 0 ? (
            <MobileMoreMenu links={mobileMore} onLogout={handleLogout} />
          ) : (
            <button
              type="button"
              onClick={handleLogout}
              className="kr-nav-link-mobile kr-nav-link-inactive min-w-0 flex-1"
            >
              <NavMobileIcon>{navIcons.logout}</NavMobileIcon>
              <span className="max-w-full truncate px-0.5">Logout</span>
            </button>
          )}
        </div>
      </nav>
    </div>
  )
}
