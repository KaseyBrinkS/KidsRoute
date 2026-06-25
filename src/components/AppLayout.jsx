import { useEffect, useRef, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import KidsRouteLogo from './KidsRouteLogo'
import { logOut } from '../firebase/auth'
import { useAuth } from '../context/AuthContext'
import { subscribeToUserProfile } from '../firebase/users'

const navLinks = [
  { to: '/dashboard', label: 'Dashboard', mobileLabel: 'Home' },
  { to: '/my-kids', label: 'My Kids', mobileLabel: 'Kids' },
  { to: '/my-activities', label: 'Activities', mobileLabel: 'Activities' },
  { to: '/groups', label: 'Groups', mobileLabel: 'Groups' },
  { to: '/leader', label: 'Leader', mobileLabel: 'Leader' },
  { to: '/history', label: 'History', mobileLabel: 'History' },
  { to: '/settings', label: 'Settings', mobileLabel: 'Settings' },
]

const externalLeaderLinks = [
  { to: '/leader', label: 'Leader', mobileLabel: 'Leader' },
  { to: '/settings', label: 'Settings', mobileLabel: 'Settings' },
]

const mobilePrimaryLinks = navLinks.slice(0, 4)
const mobileMoreLinks = navLinks.slice(4)

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

function NavItem({ to, label, compact = false }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        compact
          ? `kr-nav-link-mobile ${isActive ? 'kr-nav-link-active' : 'kr-nav-link-inactive'}`
          : `kr-nav-link shrink-0 ${isActive ? 'kr-nav-link-active' : 'kr-nav-link-inactive'}`
      }
    >
      {label}
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
        More
      </button>

      {open && (
        <div
          role="menu"
          className="absolute bottom-full right-0 z-20 mb-2 min-w-[10.5rem] overflow-hidden rounded-2xl border border-border bg-surface py-1 shadow-lg"
        >
          {links.map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              role="menuitem"
              className={({ isActive }) =>
                `block px-4 py-2.5 text-sm font-semibold transition-colors ${
                  isActive
                    ? 'bg-primary/12 text-primary'
                    : 'text-muted hover:bg-bg-warm hover:text-primary'
                }`
              }
            >
              {label}
            </NavLink>
          ))}
          <button
            type="button"
            role="menuitem"
            onClick={onLogout}
            className="block w-full px-4 py-2.5 text-left text-sm font-semibold text-muted transition-colors hover:bg-bg-warm hover:text-primary"
          >
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
            <KidsRouteLogo className="h-9 w-9 text-primary" />
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

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 pb-24 sm:py-8 sm:pb-8">
        <Outlet />
      </main>

      <nav className="kr-nav-bar fixed inset-x-0 bottom-0 z-10 sm:hidden">
        <div className="flex items-stretch px-1 py-1.5">
          {mobilePrimary.map(({ to, mobileLabel, label }) => (
            <NavItem key={to} to={to} label={mobileLabel ?? label} compact />
          ))}
          {mobileMore.length > 0 ? (
            <MobileMoreMenu links={mobileMore} onLogout={handleLogout} />
          ) : (
            <button
              type="button"
              onClick={handleLogout}
              className="kr-nav-link-mobile kr-nav-link-inactive min-w-0 flex-1"
            >
              Logout
            </button>
          )}
        </div>
      </nav>
    </div>
  )
}
