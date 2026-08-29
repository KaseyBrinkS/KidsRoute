const NAVY = '#1C3A4A'
const TEAL = '#3d6b5e'

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
      'Parents can take turns leading, coordinate with caregivers, or add an approved Walk Leader.',
  },
  {
    emoji: '✅',
    title: 'Check-in & Check-out',
    description:
      'Walk Leaders check children in at pickup and out at arrival, keeping all families updated.',
  },
]

export default function WelcomeFeatureCards({ className = '' }) {
  return (
    <section aria-labelledby="welcome-features-heading" className={className}>
      <h2 id="welcome-features-heading" className="sr-only">
        What KidsRoute offers
      </h2>
      <ul className="grid gap-4 sm:grid-cols-2">
        {FEATURES.map((feature) => (
          <li
            key={feature.title}
            className="rounded-lg border bg-white px-5 py-5"
            style={{ borderColor: `${NAVY}18` }}
          >
            <div
              className="mb-3 flex h-10 w-10 items-center justify-center rounded-md text-xl"
              style={{ backgroundColor: `${TEAL}10` }}
              aria-hidden="true"
            >
              {feature.emoji}
            </div>
            <p className="font-sans text-base font-semibold" style={{ color: NAVY }}>
              {feature.title}
            </p>
            <p className="mt-2 text-sm leading-relaxed" style={{ color: `${NAVY}AA` }}>
              {feature.description}
            </p>
          </li>
        ))}
      </ul>
    </section>
  )
}
