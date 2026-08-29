import { Link } from 'react-router-dom'
import KidsRouteLogo from '../KidsRouteLogo'

const NAVY = '#1C3A4A'
const PINK = '#C4768A'
const TEAL = '#3d6b5e'

export default function WelcomeHero({ findRoutePath = '/settings' }) {
  function scrollToHowItWorks() {
    document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <section className="text-center">
      <Link
        to={findRoutePath}
        className="inline-block transition-opacity hover:opacity-90"
        aria-label="KidsRoute home"
      >
        <KidsRouteLogo className="mx-auto h-[88px] w-[88px] sm:h-[100px] sm:w-[100px]" />
      </Link>

      <div className="mx-auto mt-10 max-w-2xl space-y-6">
        <h1
          className="font-sans text-[1.65rem] font-semibold leading-[1.35] tracking-tight sm:text-[2rem]"
          style={{ color: NAVY }}
        >
          Same school. Same neighborhood.
          <br />
          Same direction.
          <br />
          <span style={{ color: PINK }}>Let&apos;s get there together.</span>
        </h1>

        <p
          className="mx-auto max-w-xl text-base leading-relaxed sm:text-[1.05rem]"
          style={{ color: `${NAVY}B3` }}
        >
          KidsRoute connects local families whose kids are already heading to the same places —
          making it easier to coordinate walks, share the load, and build a stronger neighborhood
          community.
        </p>

        <p className="text-sm font-medium tracking-wide" style={{ color: TEAL }}>
          Your kids. Your circle. Your choice.
        </p>

        <div className="flex flex-col items-center justify-center gap-3 pt-2 sm:flex-row sm:gap-4">
          <Link
            to={findRoutePath}
            className="inline-flex w-full min-w-[11rem] items-center justify-center rounded-lg px-6 py-3.5 text-sm font-semibold tracking-wide text-white transition-opacity hover:opacity-90 sm:w-auto"
            style={{ backgroundColor: NAVY }}
          >
            Find Your Route
          </Link>
          <button
            type="button"
            onClick={scrollToHowItWorks}
            className="inline-flex w-full min-w-[11rem] items-center justify-center rounded-lg border px-6 py-3.5 text-sm font-semibold tracking-wide transition-colors hover:bg-white sm:w-auto"
            style={{ borderColor: `${NAVY}33`, color: NAVY }}
          >
            See How It Works
          </button>
        </div>

        <p className="pt-1 text-xs leading-relaxed" style={{ color: `${NAVY}99` }}>
          Free for families · Built for local communities · No App Store download required
        </p>
      </div>
    </section>
  )
}
