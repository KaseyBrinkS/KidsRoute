import { useEffect, useState } from 'react'
import PageHeader from '../components/PageHeader'
import { useAuth } from '../context/AuthContext'
import { addKid, deleteKid, GRADES, SCHOOLS, subscribeToKids, updateKid } from '../firebase/kids'

const emptyForm = { firstName: '', grade: 'K', school: SCHOOLS[0] }

function formFromKid(kid) {
  return {
    firstName: kid.firstName,
    grade: kid.grade,
    school: kid.school,
  }
}

export default function MyKids() {
  const { user } = useAuth()
  const [kids, setKids] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [deletingId, setDeletingId] = useState(null)

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

  async function handleSubmit(event) {
    event.preventDefault()
    if (!form.firstName.trim()) return

    setError(null)
    setSubmitting(true)
    try {
      if (editingId) {
        await updateKid(user.uid, editingId, form)
        setEditingId(null)
      } else {
        await addKid(user.uid, form)
      }
      setForm(emptyForm)
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  function handleEdit(kid) {
    setError(null)
    setEditingId(kid.id)
    setForm(formFromKid(kid))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function handleCancelEdit() {
    setEditingId(null)
    setForm(emptyForm)
  }

  async function handleDelete(kidId) {
    setError(null)
    setDeletingId(kidId)
    try {
      await deleteKid(user.uid, kidId)
      if (editingId === kidId) {
        setEditingId(null)
        setForm(emptyForm)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setDeletingId(null)
    }
  }

  const inputClass =
    'mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500'

  return (
    <div>
      <PageHeader
        title="My Kids"
        description="Manage your children's profiles and schedules"
      />

      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="text-sm font-medium text-gray-900">
          {editingId ? 'Edit child' : 'Add a child'}
        </h2>
        <form onSubmit={handleSubmit} className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label htmlFor="firstName" className="block text-sm font-medium text-gray-700">
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
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="grade" className="block text-sm font-medium text-gray-700">
              Grade
            </label>
            <select
              id="grade"
              name="grade"
              value={form.grade}
              onChange={handleChange}
              className={inputClass}
            >
              {GRADES.map((grade) => (
                <option key={grade} value={grade}>
                  {grade === 'K' ? 'Kindergarten' : `Grade ${grade}`}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="school" className="block text-sm font-medium text-gray-700">
              School
            </label>
            <select
              id="school"
              name="school"
              value={form.school}
              onChange={handleChange}
              className={inputClass}
            >
              {SCHOOLS.map((school) => (
                <option key={school} value={school}>
                  {school}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-wrap items-end gap-2">
            <button
              type="submit"
              disabled={submitting}
              className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {submitting
                ? editingId
                  ? 'Saving…'
                  : 'Adding…'
                : editingId
                  ? 'Save changes'
                  : 'Add child'}
            </button>
            {editingId && (
              <button
                type="button"
                onClick={handleCancelEdit}
                disabled={submitting}
                className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>

      {error && (
        <p className="mt-4 rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
      )}

      <div className="mt-8">
        <h2 className="text-sm font-medium text-gray-900">Your children</h2>

        {loading ? (
          <p className="mt-4 text-sm text-gray-600">Loading…</p>
        ) : kids.length === 0 ? (
          <p className="mt-4 rounded-lg border border-dashed border-gray-300 bg-white px-4 py-8 text-center text-sm text-gray-600">
            No children added yet. Use the form above to add your first child.
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-gray-200 rounded-lg border border-gray-200 bg-white">
            {kids.map((kid) => (
              <li
                key={kid.id}
                className="flex items-center justify-between gap-4 px-4 py-4 sm:px-6"
              >
                <div>
                  <p className="font-medium text-gray-900">{kid.firstName}</p>
                  <p className="mt-1 text-sm text-gray-600">
                    {kid.grade === 'K' ? 'Kindergarten' : `Grade ${kid.grade}`} · {kid.school}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <button
                    type="button"
                    onClick={() => handleEdit(kid)}
                    disabled={Boolean(editingId) || deletingId === kid.id}
                    className="rounded-md px-3 py-1.5 text-sm font-medium text-indigo-600 hover:bg-indigo-50 disabled:opacity-50"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(kid.id)}
                    disabled={deletingId === kid.id || editingId === kid.id}
                    className="rounded-md px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                  >
                    {deletingId === kid.id ? 'Deleting…' : 'Delete'}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
