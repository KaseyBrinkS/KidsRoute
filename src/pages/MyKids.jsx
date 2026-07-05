import { useEffect, useState } from 'react'
import ChildAvatar from '../components/ChildAvatar'
import ChildColorPicker from '../components/ChildColorPicker'
import PageHeader from '../components/PageHeader'
import SchoolSelect from '../components/SchoolSelect'
import { useAuth } from '../context/AuthContext'
import { addKid, deleteKid, GRADES, SCHOOLS, subscribeToKids, updateKid } from '../firebase/kids'
import {
  resolveSchoolValue,
  schoolCustomValue,
  schoolSelectValue,
} from '../firebase/schools'
import { defaultColorKeyForNewChild, getChildColorKey } from '../utils/dates'

const emptyForm = {
  firstName: '',
  grade: 'K',
  schoolSelect: SCHOOLS[0],
  schoolCustom: '',
  colorKey: 0,
}

function formFromKid(kid, kids) {
  return {
    firstName: kid.firstName,
    grade: kid.grade,
    schoolSelect: schoolSelectValue(kid.school),
    schoolCustom: schoolCustomValue(kid.school),
    colorKey: getChildColorKey(kid, kids),
  }
}

function newChildForm(kids) {
  return {
    ...emptyForm,
    colorKey: defaultColorKeyForNewChild(kids),
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
      const school = resolveSchoolValue(form.schoolSelect, form.schoolCustom)
      const payload = {
        firstName: form.firstName,
        grade: form.grade,
        school,
        colorKey: form.colorKey,
      }
      if (editingId) {
        await updateKid(user.uid, editingId, payload)
        setEditingId(null)
      } else {
        await addKid(user.uid, payload)
      }
      setForm(newChildForm(kids))
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  function handleEdit(kid) {
    setError(null)
    setEditingId(kid.id)
    setForm(formFromKid(kid, kids))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function handleCancelEdit() {
    setEditingId(null)
    setForm(newChildForm(kids))
  }

  async function handleDelete(kidId) {
    setError(null)
    setDeletingId(kidId)
    try {
      await deleteKid(user.uid, kidId)
      if (editingId === kidId) {
        setEditingId(null)
        setForm(newChildForm(kids.filter((kid) => kid.id !== kidId)))
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setDeletingId(null)
    }
  }

  const inputClass = 'input-kr'

  return (
    <div>
      <PageHeader
        title="My Kids"
        description="Manage your children's profiles and schedules"
      />

      <div className="kr-card p-6">
        <h2 className="kr-section-title">
          {editingId ? 'Edit child' : 'Add a child'}
        </h2>
        <form onSubmit={handleSubmit} className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="grade" className="block text-sm font-medium text-[var(--color-text)]">
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
            <label htmlFor="school" className="block text-sm font-medium text-[var(--color-text)]">
              School
            </label>
            <div className="mt-1">
              <SchoolSelect
                selectValue={form.schoolSelect}
                customValue={form.schoolCustom}
                onSelectChange={(event) =>
                  setForm((prev) => ({ ...prev, schoolSelect: event.target.value }))
                }
                onCustomChange={(event) =>
                  setForm((prev) => ({ ...prev, schoolCustom: event.target.value }))
                }
              />
            </div>
          </div>
          <ChildColorPicker
            value={form.colorKey}
            onChange={(colorKey) => setForm((prev) => ({ ...prev, colorKey }))}
          />
          <div className="flex flex-wrap items-end gap-2 sm:col-span-2 lg:col-span-4">
            <button
              type="submit"
              disabled={submitting}
              className="btn-primary"
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
                className="btn-link-accent py-1.5 text-xs"
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>

      {error && <p className="alert-error mt-4">{error}</p>}

      <div className="mt-8">
        <h2 className="kr-section-title">Your children</h2>

        {loading ? (
          <p className="mt-4 text-muted">Loading…</p>
        ) : kids.length === 0 ? (
          <p className="kr-card-flat mt-4">
            No children added yet. Use the form above to add your first child.
          </p>
        ) : (
          <ul className="kr-card mt-4 divide-y divide-border">
            {kids.map((kid) => (
              <li
                key={kid.id}
                className="flex items-center justify-between gap-4 px-5 py-4"
              >
                <div>
                  <p className="inline-flex items-center gap-2 font-semibold text-[var(--color-text)]">
                    <ChildAvatar child={kid} kids={kids} size="sm" />
                    {kid.firstName}
                  </p>
                  <p className="mt-1 text-sm text-muted">
                    {kid.grade === 'K' ? 'Kindergarten' : `Grade ${kid.grade}`} · {kid.school}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <button
                    type="button"
                    onClick={() => handleEdit(kid)}
                    disabled={Boolean(editingId) || deletingId === kid.id}
                    className="btn-link-accent px-3 py-1.5 text-sm"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(kid.id)}
                    disabled={deletingId === kid.id || editingId === kid.id}
                    className="btn-danger"
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
