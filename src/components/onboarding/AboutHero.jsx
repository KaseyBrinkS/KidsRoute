import { Link } from 'react-router-dom'
import KidsRouteLogo from '../KidsRouteLogo'
import { APP_DESCRIPTION } from './constants'

export default function AboutHero({
  logoClassName = 'h-[120px] w-[120px] min-h-[100px] min-w-[100px]',
  logoTo,
}) {
  const logo = <KidsRouteLogo className={logoClassName} />

  return (
    <div className="login-hero-gradient px-8 pb-10 pt-12">
      <div className="flex flex-col items-center text-center">
        {logoTo ? (
          <Link
            to={logoTo}
            className="rounded-3xl transition-transform hover:scale-[1.02] focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            aria-label="Get started with KidsRoute"
          >
            {logo}
          </Link>
        ) : (
          logo
        )}
        <h1 className="font-heading mt-8 text-4xl font-semibold text-primary-dark">KidsRoute</h1>
        <p
          className="mt-3 text-xl"
          style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 800, color: '#1C3A4A' }}
        >
          Same school. Same neighborhood. Same direction.
        </p>
        <p
          className="mt-2 text-xl"
          style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 700, color: '#C4768A' }}
        >
          Let&apos;s get there together.
        </p>
      </div>
    </div>
  )
}

export function AboutDescription({ className = '' }) {
  return (
    <p className={`text-center text-base leading-relaxed text-[var(--color-text)] ${className}`}>
      {APP_DESCRIPTION}
    </p>
  )
}
