import { useState } from 'react'
import { Link } from 'react-router-dom'
import AboutHero from '../components/onboarding/AboutHero'
import LegalFooter from '../components/LegalFooter'
import { CONTACT_SUBJECTS } from '../content/contactSubjects'
import { useAuth } from '../context/AuthContext'
import { submitContactForm } from '../firebase/contactSubmissions'

export default function Contact() {
  const { user } = useAuth()
  const backTo = user ? '/welcome' : '/login'

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [subject, setSubject] = useState(CONTACT_SUBJECTS[0].value)
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [submitted, setSubmitted] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    setError(null)
    setSubmitting(true)

    try {
      await submitContactForm({ name, email, subject, message })
      setSubmitted(true)
    } catch (err) {
      setError(err.message || 'Could not send message. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

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
                Get in Touch
              </h1>
              <p className="mt-3 text-base leading-relaxed text-muted">
                Have a question about KidsRoute? We&apos;d love to hear from you.
              </p>
            </header>

            {submitted ? (
              <div
                className="rounded-2xl border border-primary/20 bg-primary/5 px-5 py-6 text-center"
                role="status"
              >
                <p className="font-heading text-lg font-semibold text-primary">
                  Thank you! We&apos;ll get back to you within 24 hours.
                </p>
                <p className="mt-2 text-sm text-muted">
                  You can also reach us directly at{' '}
                  <a href="mailto:hello@kidsroute.org" className="link-accent font-semibold">
                    hello@kidsroute.org
                  </a>
                  .
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="contact-name" className="mb-1.5 block text-sm font-medium text-[var(--color-text)]">
                    Name
                  </label>
                  <input
                    id="contact-name"
                    type="text"
                    autoComplete="name"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    disabled={submitting}
                    required
                    className="input-kr"
                    placeholder="Your name"
                  />
                </div>

                <div>
                  <label htmlFor="contact-email" className="mb-1.5 block text-sm font-medium text-[var(--color-text)]">
                    Email
                  </label>
                  <input
                    id="contact-email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    disabled={submitting}
                    required
                    className="input-kr"
                    placeholder="you@example.com"
                  />
                </div>

                <div>
                  <label htmlFor="contact-subject" className="mb-1.5 block text-sm font-medium text-[var(--color-text)]">
                    Subject
                  </label>
                  <select
                    id="contact-subject"
                    value={subject}
                    onChange={(event) => setSubject(event.target.value)}
                    disabled={submitting}
                    required
                    className="input-kr"
                  >
                    {CONTACT_SUBJECTS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="contact-message" className="mb-1.5 block text-sm font-medium text-[var(--color-text)]">
                    Message
                  </label>
                  <textarea
                    id="contact-message"
                    value={message}
                    onChange={(event) => setMessage(event.target.value)}
                    disabled={submitting}
                    required
                    rows={6}
                    className="input-kr resize-y"
                    placeholder="How can we help?"
                  />
                </div>

                {error ? (
                  <p className="alert-error text-center" role="alert">
                    {error}
                  </p>
                ) : null}

                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-primary min-h-[3rem] w-full py-3"
                >
                  {submitting ? 'Sending…' : 'Send Message'}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>

      <LegalFooter className="mx-auto mt-8 w-full max-w-2xl pb-4" />
    </div>
  )
}
