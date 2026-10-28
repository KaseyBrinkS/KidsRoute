import { Link } from 'react-router-dom'

export function getWelcomeLogoPath(setupIncomplete) {
  if (!setupIncomplete) return '/home'
  return '/settings'
}

const HOW_IT_WORKS_STEPS = [
  {
    emoji: '👶',
    title: 'Add your kids',
    description: 'Create profiles for each child with their school and grade.',
  },
  {
    emoji: '📍',
    title: 'Add their activities',
    description: 'Enter where they go and class time. We handle the matching.',
  },
  {
    emoji: '🔔',
    title: 'Get matched automatically',
    description:
      "When a neighboring family is heading to the same place at the same time, you'll be notified instantly.",
  },
  {
    emoji: '✅',
    title: 'Walk together safely',
    description:
      'Join matched groups, set a meeting point, and get real-time updates when your child is picked up and dropped off.',
  },
]

const KEY_FEATURES = [
  {
    title: 'School walks',
    description:
      'Coordinate morning drop-off and afternoon pick-up with families in your building.',
  },
  {
    title: 'After-school activities',
    description:
      'Match with families heading to the same classes, sports, and programs.',
  },
  {
    title: 'Hire trusted help',
    description:
      'Connect with approved nannies, babysitters, or older students who can escort your kids for extra pay.',
  },
  {
    title: 'Village support',
    description:
      'Running late? Your Walk Leader has it covered and will check your child in safely.',
  },
  {
    title: 'Real-time check-ins',
    description: 'See exactly when your child was picked up and dropped off.',
  },
  {
    title: 'Opt in or out anytime',
    description: "You're always in control.",
  },
  {
    title: 'Privacy first',
    description:
      'Admin-approved access. Your information is only shared with families in your matched groups.',
  },
]

export function WelcomeIntro() {
  return (
    <div className="space-y-4 text-center">
      <p className="text-base leading-relaxed text-[var(--color-text)]">
        KidsRoute connects neighboring families attending the same schools and local activities.
        Coordinate group walks with shared Walk Leaders, real-time check-ins, and the support of
        a community going your way.
      </p>
    </div>
  )
}

export function GetStartedButton({ className = '', onClick, busy = false }) {
  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        disabled={busy}
        className="btn-primary inline-flex w-full justify-center py-3 sm:w-auto sm:min-w-[12rem]"
      >
        {busy ? 'Loading…' : 'Get Started'}
      </button>
    )
  }

  return (
    <Link to="/settings" className="btn-primary inline-flex w-full justify-center py-3 sm:w-auto sm:min-w-[12rem]">
      Get Started
    </Link>
  )
}

export function WelcomeActionButtons({ className = '', onGetStarted, busy = false }) {
  return (
    <div className={`flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-center ${className}`}>
      <GetStartedButton onClick={onGetStarted} busy={busy} />
      <Link
        to="/how-it-works"
        className="btn-secondary inline-flex w-full justify-center py-3 sm:w-auto sm:min-w-[12rem]"
      >
        How It Works →
      </Link>
    </div>
  )
}

export function HowItWorksSection() {
  return (
    <section aria-labelledby="how-it-works-heading">
      <h2 id="how-it-works-heading" className="kr-section-title text-center">
        How it works
      </h2>
      <ol className="mt-5 space-y-3">
        {HOW_IT_WORKS_STEPS.map((step, index) => (
          <li
            key={step.title}
            className="flex gap-4 rounded-2xl border border-border bg-bg-warm/70 px-4 py-4"
          >
            <span
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-xl"
              aria-hidden="true"
            >
              {step.emoji}
            </span>
            <div className="min-w-0 pt-0.5">
              <p className="text-xs font-bold uppercase tracking-wide text-primary">
                Step {index + 1}
              </p>
              <p className="mt-0.5 font-semibold text-[var(--color-text)]">{step.title}</p>
              <p className="mt-1 text-sm leading-relaxed text-muted">{step.description}</p>
            </div>
          </li>
        ))}
      </ol>
      <p className="mt-4 text-center">
        <Link to="/how-it-works" className="link-accent text-sm font-medium">
          Read the full step-by-step guide →
        </Link>
      </p>
    </section>
  )
}

export function KeyFeaturesSection() {
  return (
    <section aria-labelledby="key-features-heading">
      <h2 id="key-features-heading" className="kr-section-title text-center">
        Key features
      </h2>
      <ul className="mt-5 grid gap-3 sm:grid-cols-2">
        {KEY_FEATURES.map((feature) => (
          <li
            key={feature.title}
            className="rounded-2xl border border-border bg-surface px-4 py-4"
          >
            <p className="font-semibold text-[var(--color-text)]">{feature.title}</p>
            <p className="mt-1.5 text-sm leading-relaxed text-muted">{feature.description}</p>
          </li>
        ))}
      </ul>
    </section>
  )
}
