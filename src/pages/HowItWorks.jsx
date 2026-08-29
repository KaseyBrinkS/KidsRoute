import { Link } from 'react-router-dom'
import AboutHero from '../components/onboarding/AboutHero'
import LegalFooter from '../components/LegalFooter'
import { useAuth } from '../context/AuthContext'
import { HOW_IT_WORKS_GUIDE } from '../content/howItWorksGuide'

export default function HowItWorks() {
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
                {HOW_IT_WORKS_GUIDE.title}
              </h1>
              <p className="mt-3 text-base leading-relaxed text-muted">{HOW_IT_WORKS_GUIDE.intro}</p>
            </header>

            <ol className="space-y-4">
              {HOW_IT_WORKS_GUIDE.steps.map((step, index) => (
                <li
                  key={step.title}
                  className="flex gap-4 rounded-2xl border border-border bg-bg-warm px-5 py-4"
                >
                  <span
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-xl"
                    aria-hidden="true"
                  >
                    {step.emoji}
                  </span>
                  <div className="min-w-0 pt-0.5">
                    <p className="text-xs font-bold uppercase tracking-wide text-primary">
                      Step {index + 1}
                    </p>
                    <p className="mt-0.5 font-heading text-base font-semibold text-[var(--color-text)]">
                      {step.title}
                    </p>
                    <p className="mt-1.5 text-sm leading-relaxed text-muted">{step.description}</p>
                  </div>
                </li>
              ))}
            </ol>

            <p className="rounded-2xl border border-primary/15 bg-primary/5 px-5 py-4 text-sm leading-relaxed text-[var(--color-text)]">
              {HOW_IT_WORKS_GUIDE.note}
            </p>
          </div>
        </div>
      </div>

      <LegalFooter className="mx-auto mt-8 w-full max-w-2xl pb-4" />
    </div>
  )
}
