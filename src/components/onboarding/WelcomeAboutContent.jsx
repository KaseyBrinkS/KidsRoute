import { Link } from 'react-router-dom'

export function getWelcomeLogoPath(setupIncomplete, onboardingStep) {
  if (!setupIncomplete) return '/dashboard'
  if (onboardingStep === 1) return '/my-kids'
  const paths = {
    2: '/onboarding/kids',
    3: '/onboarding/details',
    4: '/onboarding/activity',
  }
  return paths[onboardingStep] ?? '/my-kids'
}

const HOW_IT_WORKS_STEPS = [
  {
    emoji: '👶',
    title: 'Add your kids',
    description: 'Create profiles for each child including their school and grade.',
  },
  {
    emoji: '📍',
    title: 'Add their activities',
    description: "Enter where they go and when. We'll handle the matching.",
  },
  {
    emoji: '🔔',
    title: 'Get matched automatically',
    description:
      "When another family from your school is heading to the same place at the same time, you'll be notified instantly.",
  },
  {
    emoji: '✅',
    title: 'Walk together safely',
    description:
      'Join the group, coordinate a meeting point, and get real-time updates when your child is picked up and dropped off.',
  },
]

const KEY_FEATURES = [
  {
    title: 'Opt in or out anytime',
    description: "You're always in control. Accept or decline any group match.",
  },
  {
    title: 'Group chaperones',
    description:
      'Any parent in a group is automatically a group leader and can start and manage the walk.',
  },
  {
    title: 'Real-time check-ins',
    description:
      'See exactly when your child was picked up and dropped off in the walk history.',
  },
  {
    title: 'Meeting points',
    description: 'Groups can agree on a specific meetup spot before the walk.',
  },
  {
    title: 'Building walks',
    description: 'Coordinate morning and afternoon school walks with families in your building.',
  },
  {
    title: 'Privacy first',
    description:
      'Admin-approved access. Your information is only shared with families in your matched groups.',
  },
]

export function WelcomeIntro() {
  return (
    <p className="text-center text-base leading-relaxed text-[var(--color-text)]">
      Welcome to KidsRoute — the safe, simple way for school families to coordinate group walks
      to after-school activities. Match with families heading to the same destination, walk
      together with a trusted chaperone, and get real-time check-ins so you always know your
      child arrived safely.
    </p>
  )
}

export function GetStartedButton({ className = '' }) {
  return (
    <div className={`text-center ${className}`}>
      <Link to="/my-kids" className="btn-primary inline-flex w-full justify-center py-3 sm:w-auto sm:min-w-[12rem]">
        Get Started
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
