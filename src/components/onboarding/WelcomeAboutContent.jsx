import { Link } from 'react-router-dom'

export function getWelcomeLogoPath(setupIncomplete) {
  if (!setupIncomplete) return '/dashboard'
  return '/settings'
}

export function getWelcomeFindRoutePath(setupIncomplete) {
  if (!setupIncomplete) return '/my-activities'
  return '/settings'
}

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

/** @deprecated Welcome page uses WelcomeHero instead */
export function WelcomeIntro() {
  return null
}

/** @deprecated Welcome page uses WelcomeHero instead */
export function GetStartedButton() {
  return null
}

/** @deprecated Welcome page uses WelcomeFeatureCards instead */
export function KeyFeaturesSection() {
  return null
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
