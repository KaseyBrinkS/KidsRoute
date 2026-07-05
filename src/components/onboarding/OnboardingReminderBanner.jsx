import { Link } from 'react-router-dom'

export default function OnboardingReminderBanner({ continuePath }) {
  return (
    <div className="mb-6 rounded-2xl border border-support-blue/15 bg-support-blue-soft px-5 py-4">
      <p className="text-sm leading-relaxed text-support-blue">
        Complete your profile to find walking groups.{' '}
        <Link to={continuePath} className="link-accent">
          Continue setup
        </Link>
      </p>
    </div>
  )
}
