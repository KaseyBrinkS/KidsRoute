import KidsRouteLogo from '../KidsRouteLogo'
import { APP_DESCRIPTION } from './constants'

export default function AboutHero({ logoClassName = 'h-[120px] w-[120px] min-h-[100px] min-w-[100px]' }) {
  return (
    <div className="login-hero-gradient px-8 pb-10 pt-12">
      <div className="flex flex-col items-center text-center">
        <KidsRouteLogo className={`text-primary ${logoClassName}`} />
        <h1 className="font-heading mt-8 text-4xl font-semibold text-primary">KidsRoute</h1>
        <p className="mt-3 text-xl font-medium text-muted">Safe walks, together.</p>
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
