import { Link } from 'react-router-dom'

export default function SettingsActivitiesPrompt() {
  return (
    <div className="mb-6 rounded-2xl border border-primary/20 bg-primary/5 px-5 py-4">
      <p className="text-sm leading-relaxed text-[var(--color-text)]">
        Great! Now head to the{' '}
        <Link to="/schedule" className="link-accent font-semibold">
          Activities
        </Link>{' '}
        tab to add your kids&apos; after-school activities and start getting matched.
      </p>
    </div>
  )
}
