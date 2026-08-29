import { Link } from 'react-router-dom'
import AboutHero from './AboutHero'

export default function WelcomeHero({ findRoutePath = '/settings' }) {
  return (
    <div className="kr-card overflow-hidden p-0">
      <AboutHero
        logoClassName="h-[120px] w-[120px] min-h-[100px] min-w-[100px]"
        logoTo={findRoutePath}
      />

      <div className="space-y-4 px-6 pb-8 pt-6 text-center sm:px-8 sm:pb-10">
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
    </div>
  )
}
