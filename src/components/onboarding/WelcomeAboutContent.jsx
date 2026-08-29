import { Link } from 'react-router-dom'

export function getWelcomeLogoPath(setupIncomplete) {
  if (!setupIncomplete) return '/dashboard'
  return '/settings'
}

export function getWelcomeFindRoutePath(setupIncomplete) {
  if (!setupIncomplete) return '/my-activities'
  return '/settings'
}

const KEY_FEATURES = [
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

const HOW_IT_WORKS_STEPS = [
  {
    emoji: '👤',
    title: 'Set up your family',
    description:
      'Add your contact info, building, and school so we can connect you with nearby families.',
  },
  {
    emoji: '📍',
    title: "Add your kids' activities",
    description:
      'Enter where each child goes and when — school, sports, classes, and more.',
  },
  {
    emoji: '🔔',
    title: 'Review your matches',
    description:
      'See neighboring families heading the same way at the same time and choose who to connect with.',
  },
  {
    emoji: '🤝',
    title: 'Create your group',
    description:
      'Form a walk group with matched families for a shared route and schedule.',
  },
  {
    emoji: '🦺',
    title: 'Choose your Group Leader',
    description:
      'Parents volunteer to lead each walk — one adult supervises pickup, the route, and drop-off.',
  },
  {
    emoji: '🚶',
    title: 'On walk day',
    description:
      'Meet at your spot, check in when kids are picked up, and get notified when they arrive safely.',
  },
]

const NAVY = '#1C3A4A'
const TEAL = '#3d6b5e'

export function WelcomeIntro() {
  return (
    <div className="space-y-4 text-center">
      <p className="text-base leading-relaxed text-[var(--color-text)]">
        Welcome to KidsRoute — the safe, simple way for school families to coordinate group walks
        to after-school activities. Match with families heading to the same destination, walk
        together with a trusted chaperone, and get real-time check-ins so you always know your
        child arrived safely.
      </p>
      <p className="text-base font-medium leading-relaxed text-primary-dark">
        Because raising kids takes a village — and KidsRoute helps you find yours.
      </p>
      <p className="text-sm font-medium tracking-wide text-primary">
        Your kids. Your circle. Your choice.
      </p>
    </div>
  )
}

export function GettingStartedSection() {
  return (
    <div className="space-y-4 px-6 pb-8 pt-4 text-center sm:px-8 sm:pb-10">
      <Link
        to="/settings"
        className="btn-primary inline-flex w-full justify-center py-3 sm:w-auto sm:min-w-[12rem]"
      >
        Get Started
      </Link>
      <p className="text-xs leading-relaxed text-muted">
        Free for families · No App Store download required
      </p>
    </div>
  )
}

/** @deprecated use GettingStartedSection */
export function GetStartedButton({ className = '', onClick, busy = false }) {
  if (onClick) {
    return (
      <div className={`text-center ${className}`}>
        <button
          type="button"
          onClick={onClick}
          disabled={busy}
          className="btn-primary inline-flex w-full justify-center py-3 sm:w-auto sm:min-w-[12rem]"
        >
          {busy ? 'Loading…' : 'Get Started'}
        </button>
      </div>
    )
  }

  return (
    <div className={`text-center ${className}`}>
      <Link
        to="/settings"
        className="btn-primary inline-flex w-full justify-center py-3 sm:w-auto sm:min-w-[12rem]"
      >
        Get Started
      </Link>
    </div>
  )
}

export function KeyFeaturesSection() {
  return (
    <section aria-labelledby="key-features-heading">
      <h2 id="key-features-heading" className="sr-only">
        What KidsRoute offers
      </h2>
      <div className="kr-card overflow-hidden">
        <ul className="divide-y divide-border">
          {KEY_FEATURES.map((feature) => (
            <li key={feature.title} className="flex gap-3 px-5 py-4">
              <span className="shrink-0 text-xl leading-none" aria-hidden="true">
                {feature.emoji}
              </span>
              <p className="min-w-0 text-left text-sm leading-relaxed">
                <span className="font-heading font-semibold text-primary-dark">{feature.title}</span>
                <span className="text-muted"> — {feature.description}</span>
              </p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

export function HowItWorksSection({ className = '' }) {
  return (
    <section id="how-it-works" aria-labelledby="how-it-works-heading" className={`scroll-mt-8 ${className}`}>
      <h2
        id="how-it-works-heading"
        className="font-sans text-xl font-semibold tracking-tight sm:text-2xl"
        style={{ color: NAVY }}
      >
        How it works
      </h2>
      <ol className="mt-8 space-y-0 divide-y border-t" style={{ borderColor: `${NAVY}15` }}>
        {HOW_IT_WORKS_STEPS.map((step) => (
          <li key={step.title} className="flex gap-5 py-6">
            <span
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-base"
              style={{ backgroundColor: `${TEAL}12` }}
              aria-hidden="true"
            >
              {step.emoji}
            </span>
            <div className="min-w-0 pt-0.5">
              <p className="font-sans font-semibold" style={{ color: NAVY }}>
                {step.title}
              </p>
              <p className="mt-1.5 text-sm leading-relaxed" style={{ color: `${NAVY}AA` }}>
                {step.description}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  )
}

export function GetStartedLink({ className = '' }) {
  return (
    <div className={`text-center ${className}`}>
      <Link
        to="/settings"
        className="inline-flex w-full justify-center rounded-lg px-6 py-3 text-sm font-semibold text-white sm:w-auto"
        style={{ backgroundColor: NAVY }}
      >
        Get Started
      </Link>
    </div>
  )
}
