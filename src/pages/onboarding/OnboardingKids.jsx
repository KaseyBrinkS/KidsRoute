import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import OnboardingShell from '../../components/onboarding/OnboardingShell'
import { OnboardingStepActions } from '../../components/onboarding/OnboardingStepActions'
import { useAuth } from '../../context/AuthContext'
import { advanceOnboardingStep } from '../../firebase/users'
import { addKid, GRADES, SCHOOLS, subscribeToKids } from '../../firebase/kids'

const emptyForm = { firstName: '', grade: 'K', school: SCHOOLS[0] }

export default function OnboardingKids() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [kids, setKids] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState(emptyForm)
  const [submitting, setSubmitting] = useState(false)
  const [advancing, setAdvancing] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!user) return

    const unsubscribe = subscribeToKids(
      user.uid,
      (data) => {
        setKids(data)
        setLoading(false)
      },
      (err) => {
        setError(err.message)
        setLoading(false)
      },
    )

    return unsubscribe
  }, [user])

  function handleChange(event) {
    const { name, value } = event.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  async function handleAddChild(event) {
    event.preventDefault()
    if (!form.firstName.trim()) return

    setError(null)
    setSubmitting(true)
    try {
      await addKid(user.uid, form)
      setForm(emptyForm)
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  async function handleNext() {
    if (kids.length === 0) {
      setError('Add at least one child to continue, or skip for now.')
      return
    }

    setError(null)
    setAdvancing(true)
    try {
      await advanceOnboardingStep(user.uid, 3)
      navigate('/onboarding/details')
    } catch (err) {
      setError(err.message)
      setAdvancing(false)
    }
  }

  return (
    <OnboardingShell
      step={2}
      title="Add your kids"
      description="Tell us about the children who will be walking to activities."
    >
      <form onSubmit={handleAddChild} className="space-y-4">
        <div>
          <label htmlFor="firstName" className="block text-sm font-medium text-[var(--color-text)]">
            First name
          </label>
          <input
            id="firstName"
            name="firstName"
            type="text"
            required
            value={form.firstName}
            onChange={handleChange}
            placeholder="Emma"
            className="input-kr"
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="grade" className="block text-sm font-medium text-[var(--color-text)]">
              Grade
            </label>
            <select
              id="grade"
              name="grade"
              value={form.grade}
              onChange={handleChange}
              className="input-kr"
            >
              {GRADES.map((grade) => (
                <option key={grade} value={grade}>
                  {grade === 'K' ? 'Kindergarten' : `Grade ${grade}`}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="school" className="block text-sm font-medium text-[var(--color-text)]">
              School
            </label>
            <select
              id="school"
              name="school"
              value={form.school}
              onChange={handleChange}
              className="input-kr"
            >
              {SCHOOLS.map((school) => (
                <option key={school} value={school}>
                  {school}
                </option>
              ))}
            </select>
          </div>
        </div>
        <button type="submit" disabled={submitting} className="btn-secondary w-full">
          {submitting ? 'Adding…' : 'Add child'}
        </button>
      </form>

      {!loading && kids.length > 0 && (
        <ul className="mt-6 divide-y divide-border rounded-xl border border-border bg-bg-warm">
          {kids.map((kid) => (
            <li key={kid.id} className="px-4 py-3 text-sm">
              <span className="font-semibold text-[var(--color-text)]">{kid.firstName}</span>
              <span className="text-muted">
                {' '}
                · {kid.grade === 'K' ? 'Kindergarten' : `Grade ${kid.grade}`} · {kid.school}
              </span>
            </li>
          ))}
        </ul>
      )}

      {error && <p className="alert-error mt-4">{error}</p>}

      <OnboardingStepActions
        primaryLabel="Next"
        onPrimary={handleNext}
        primaryDisabled={loading || kids.length === 0}
        primaryBusy={advancing}
        skipLabel="Do this later"
      />
    </OnboardingShell>
  )
}
