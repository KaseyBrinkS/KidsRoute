import { Link } from 'react-router-dom'

export default function OnboardingReminderBanner() {
  return (
    <div className="mb-6 rounded-2xl border border-support-blue/15 bg-support-blue-soft px-5 py-4">
      <p className="text-sm leading-relaxed text-support-blue">
        Complete your profile to find walking groups.{' '}
        <Link to="/settings" className="link-accent">
          Continue setup in Settings
        </Link>
      </p>
    </div>
  )
}
