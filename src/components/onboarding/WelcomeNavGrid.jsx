import { NavLink } from 'react-router-dom'

const navItems = [
  {
    to: '/dashboard',
    label: 'Dashboard',
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 10.5L12 3l9 7.5M5 9.75V20a1 1 0 001 1h4v-5.5h4V21h4a1 1 0 001-1V9.75"
      />
    ),
  },
  {
    to: '/my-kids',
    label: 'My Kids',
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M16 19v-1a4 4 0 00-4-4H8a4 4 0 00-4 4v1M12 11.5a3.5 3.5 0 100-7 3.5 3.5 0 000 7zM20 19v-1a3 3 0 00-2.25-2.9M16 5.1a3 3 0 010 5.8"
      />
    ),
  },
  {
    to: '/my-activities',
    label: 'My Activities',
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M8 7V3m8 4V3M4.5 9h15M6 5h12a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V7a2 2 0 012-2z"
      />
    ),
  },
  {
    to: '/groups',
    label: 'Groups',
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 4.5a2.5 2.5 0 110 5 2.5 2.5 0 010-5zM5.5 8a2 2 0 110 4 2 2 0 010-4zm13 0a2 2 0 110 4 2 2 0 010-4zM4 18.5v-.75A3.25 3.25 0 017.25 14.5h9.5A3.25 3.25 0 0120 17.75v.75"
      />
    ),
  },
  {
    to: '/history',
    label: 'History',
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 8v4l2.5 2M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    ),
  },
  {
    to: '/settings',
    label: 'Settings',
    icon: (
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
  },
]

function NavIcon({ children }) {
  return (
    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
      <svg
        className="h-5 w-5"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        aria-hidden="true"
      >
        {children}
      </svg>
    </span>
  )
}

export default function WelcomeNavGrid() {
  return (
    <nav aria-label="App sections">
      <p className="font-heading mb-3 text-center text-sm font-semibold text-muted">
        Go anywhere
      </p>
      <ul className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
        {navItems.map(({ to, label, icon }) => (
          <li key={to}>
            <NavLink
              to={to}
              className="flex flex-col items-center gap-2 rounded-2xl border border-border bg-bg-warm px-3 py-3.5 text-center transition-colors hover:border-primary/25 hover:bg-surface focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              <NavIcon>{icon}</NavIcon>
              <span className="text-sm font-semibold leading-tight text-primary">{label}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
