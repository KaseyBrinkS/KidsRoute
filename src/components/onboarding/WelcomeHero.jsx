import { Link } from 'react-router-dom'
import KidsRouteLogo from '../KidsRouteLogo'

export default function WelcomeHero({ findRoutePath = '/settings' }) {
  return (
    <section className="text-center">
      <Link
        to={findRoutePath}
        className="inline-block transition-opacity hover:opacity-90"
        aria-label="KidsRoute home"
      >
        <KidsRouteLogo className="mx-auto h-[120px] w-[120px] min-h-[100px] min-w-[100px]" />
      </Link>

      <div className="mx-auto mt-8 max-w-2xl space-y-4">
        <p className="text-lg font-medium text-muted sm:text-xl">Safe walks, together.</p>

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
    </section>
  )
}
