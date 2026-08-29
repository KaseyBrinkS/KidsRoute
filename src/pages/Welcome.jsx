import { Link, NavLink } from 'react-router-dom'
import AboutHero from '../components/onboarding/AboutHero'
import AddToHomeScreenCollapsible from '../components/AddToHomeScreenCollapsible'

const FEATURES = [
  {
    emoji: '🏫',
    title: 'School Routes',
    description:
      'Coordinate morning drop-off and afternoon pick-up with families in your building who share your school.',
  },
  {
    emoji: '🎯',
    title: 'Activity Routes',
    description:
      "Add your child's activities and find families heading to the same place at the same time.",
  },
  {
    emoji: '👥',
    title: 'Shared Walks',
    description:
      'Parents can take turns leading, coordinate with caregivers, or add an approved Group Leader.',
  },
  {
    emoji: '✅',
    title: 'Check-in & Check-out',
    description:
      'Group Leaders check children in at pickup and out at arrival, keeping all families updated.',
  },
]

const NAV_ITEMS = [
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
    to: '/my-activities',
    label: 'Activities',
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
    to: '/leader',
    label: 'Leader',
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 3l7 4v5c0 3.5-2.5 6.5-7 9-4.5-2.5-7-5.5-7-9V7l7-4z"
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

export default function Welcome() {
  return (
    <div className="flex min-h-screen flex-col bg-bg px-4 py-8 sm:py-10">
      <div className="mx-auto w-full max-w-2xl flex-1 space-y-6">
        {/* Section 1 — Hero */}
        <section aria-labelledby="welcome-hero-heading" className="kr-card overflow-hidden p-0">
          <AboutHero
            logoClassName="h-[120px] w-[120px] min-h-[100px] min-w-[100px]"
            logoTo="/settings"
          />

          <div className="space-y-4 px-6 pb-8 pt-6 text-center sm:px-8 sm:pb-10">
            <h2 id="welcome-hero-heading" className="sr-only">
              Welcome to KidsRoute
            </h2>

            <p className="text-base leading-relaxed text-[var(--color-text)]">
              Welcome to KidsRoute — the safe, simple way for school families to coordinate group
              walks to after-school activities. Match with families heading to the same destination,
              walk together with a trusted chaperone, and get real-time check-ins so you always know
              your child arrived safely.
            </p>

            <p className="text-base font-medium leading-relaxed text-primary-dark">
              Because raising kids takes a village — and KidsRoute helps you find yours.
            </p>

            <p className="text-sm font-medium tracking-wide text-primary">
              Your kids. Your circle. Your choice.
            </p>

            <div className="pt-2">
              <Link
                to="/settings"
                className="btn-primary inline-flex w-full justify-center py-3 sm:w-auto sm:min-w-[12rem]"
              >
                Get Started
              </Link>
            </div>

            <p className="pt-1 text-xs leading-relaxed text-muted">
              Free for families · No App Store download required
            </p>
          </div>
        </section>

        {/* Section 2 — Feature cards */}
        <section aria-labelledby="welcome-features-heading">
          <h2 id="welcome-features-heading" className="sr-only">
            What KidsRoute offers
          </h2>
          <ul className="space-y-3">
            {FEATURES.map((feature) => (
              <li key={feature.title} className="kr-card flex gap-4 p-5">
                <span
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-xl"
                  aria-hidden="true"
                >
                  {feature.emoji}
                </span>
                <div className="min-w-0 text-left">
                  <p className="font-heading font-semibold text-primary-dark">{feature.title}</p>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted">{feature.description}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        {/* Section 3 — Navigation grid */}
        <section aria-label="App navigation" className="kr-card p-6">
          <h2 className="font-heading mb-4 text-center text-sm font-semibold uppercase tracking-wide text-muted">
            Go anywhere
          </h2>
          <ul className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
            {NAV_ITEMS.map(({ to, label, icon }) => (
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
        </section>
      </div>

      {/* Section 4 — Install instructions */}
      <AddToHomeScreenCollapsible className="mx-auto mt-6 w-full max-w-2xl text-center" />

      {/* Footer */}
      <footer className="mx-auto mt-4 w-full max-w-2xl pb-4 text-center text-xs text-muted">
        <Link to="/privacy" className="hover:text-primary hover:underline">
          Privacy Policy
        </Link>
        <span className="mx-2 text-border">·</span>
        <Link to="/terms" className="hover:text-primary hover:underline">
          Terms
        </Link>
        <span className="mx-2 text-border">·</span>
        <Link to="/safety" className="hover:text-primary hover:underline">
          Safety &amp; Privacy
        </Link>
      </footer>
    </div>
  )
}
