import { Link } from 'react-router-dom'

export default function OnboardingReminderBanner({ continuePath }) {
  return (
    <div className="mb-6 rounded-2xl border border-border-warm bg-accent-soft px-5 py-4">
      <p className="text-sm leading-relaxed text-[var(--color-text)]">
        Complete your profile to find walking groups.{' '}
        <Link to={continuePath} className="font-semibold text-primary hover:underline">
          Continue setup
        </Link>
      </p>
    </div>
  )
}
