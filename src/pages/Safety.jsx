import { Link } from 'react-router-dom'
import AboutHero from '../components/onboarding/AboutHero'
import LegalFooter from '../components/LegalFooter'
import { useAuth } from '../context/AuthContext'
import { SAFETY_FAQ } from '../content/safetyFaq'

export default function Safety() {
  const { user } = useAuth()
  const backTo = user ? '/welcome' : '/login'

  return (
    <div className="flex min-h-screen flex-col bg-bg px-4 py-8 sm:py-10">
      <div className="mx-auto w-full max-w-2xl flex-1">
        <Link to={backTo} className="link-accent text-sm font-medium">
          ← Back
        </Link>

        <div className="kr-card mt-6 overflow-hidden p-0">
          <AboutHero logoClassName="h-[80px] w-[80px]" logoTo={backTo} />

          <div className="space-y-6 px-6 pb-8 pt-2 sm:px-8 sm:pb-10">
            <header className="text-center sm:text-left">
              <h1 className="font-heading text-2xl font-semibold text-primary sm:text-3xl">
                {SAFETY_FAQ.title}
              </h1>
              <p className="mt-3 text-base leading-relaxed text-muted">{SAFETY_FAQ.intro}</p>
            </header>

            <div className="space-y-4">
              {SAFETY_FAQ.items.map((item) => (
                <section
                  key={item.question}
                  className="rounded-2xl border border-border bg-bg-warm px-5 py-4"
                >
                  <h2 className="font-heading text-base font-semibold text-primary">
                    {item.question}
                  </h2>
                  <p className="mt-2 text-sm leading-relaxed text-[var(--color-text)]">
                    {item.answer}
                  </p>
                </section>
              ))}
            </div>

            <p className="rounded-2xl border border-primary/15 bg-primary/5 px-5 py-4 text-sm leading-relaxed text-[var(--color-text)]">
              New to KidsRoute?{' '}
              <Link to="/how-it-works" className="link-accent font-semibold">
                See how it works
              </Link>
              {' '}— a step-by-step guide to getting set up.
            </p>

            <p className="rounded-2xl border border-primary/15 bg-primary/5 px-5 py-4 text-sm leading-relaxed text-[var(--color-text)]">
              Still have questions? We&apos;re real people — email us at{' '}
              <a href="mailto:hello@kidsroute.org" className="link-accent font-semibold">
                hello@kidsroute.org
              </a>
              .
            </p>
          </div>
        </div>
      </div>

      <LegalFooter className="mx-auto mt-8 w-full max-w-2xl pb-4" />
    </div>
  )
}
