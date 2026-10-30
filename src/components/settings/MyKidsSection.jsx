import { useEffect, useState } from 'react'
import ChildAvatar from '../ChildAvatar'
import ChildColorPicker from '../ChildColorPicker'
import SchoolSelect from '../SchoolSelect'
import { useAuth } from '../../context/AuthContext'
import { addKid, deleteKid, GRADES, subscribeToKids, updateKid } from '../../firebase/kids'
import {
  resolveAndRegisterSchool,
  schoolCustomValue,
  schoolSelectValue,
} from '../../firebase/schools'
import {
  allSchoolNames,
  DEFAULT_SCHOOL,
  registerCommunitySchool,
  subscribeToSchools,
} from '../../firebase/schoolsRegistry'
import { defaultColorKeyForNewChild, getChildColorKey } from '../../utils/dates'

const emptyForm = {
  firstName: '',
  grade: 'K',
  schoolSelect: DEFAULT_SCHOOL,
  schoolCustom: '',
  colorKey: 0,
}

function formFromKid(kid, kids, names) {
  return {
    firstName: kid.firstName,
    grade: kid.grade,
    schoolSelect: schoolSelectValue(kid.school, names),
    schoolCustom: schoolCustomValue(kid.school, names),
    colorKey: getChildColorKey(kid, kids),
  }
}

function newChildForm(kids) {
  return {
    ...emptyForm,
    colorKey: defaultColorKeyForNewChild(kids),
  }
}

export default function MyKidsSection({ onError, onKidsChanged }) {
  const { user } = useAuth()
  const [kids, setKids] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [deletingId, setDeletingId] = useState(null)
  const [schoolOptions, setSchoolOptions] = useState([])

  useEffect(() => {
    if (!user) return
    const unsubSchools = subscribeToSchools(setSchoolOptions, (err) => {
      setError(err.message)
      onError?.(err.message)
    })
    return unsubSchools
  }, [user, onError])

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
        onError?.(err.message)
        setLoading(false)
      },
    )

    return unsubscribe
  }, [user, onError])

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
      const school = await resolveAndRegisterSchool(
        form.schoolSelect,
        form.schoolCustom,
        registerCommunitySchool,
        user.uid,
      )
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
      onKidsChanged?.()
    } catch (err) {
      setError(err.message)
      onError?.(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  function handleEdit(kid) {
    setError(null)
    setEditingId(kid.id)
    setForm(formFromKid(kid, kids, allSchoolNames(schoolOptions)))
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
      onKidsChanged?.()
    } catch (err) {
      setError(err.message)
      onError?.(err.message)
    } finally {
      setDeletingId(null)
    }
  }

  const inputClass = 'input-kr'

  return (
    <div>
      <h3 className="kr-section-title">
        {editingId ? 'Edit child' : 'Add a child'}
      </h3>
      <form onSubmit={handleSubmit} className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="kids-firstName" className="block text-sm font-medium text-[var(--color-text)]">
            First name
          </label>
          <input
            id="kids-firstName"
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
          <label htmlFor="kids-grade" className="block text-sm font-medium text-[var(--color-text)]">
            Grade
          </label>
          <select
            id="kids-grade"
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
        <div className="sm:col-span-2">
          <label htmlFor="kids-school" className="block text-sm font-medium text-[var(--color-text)]">
            School
          </label>
          <div className="mt-1">
            <SchoolSelect
              selectId="kids-school"
              customId="kids-school-custom"
              selectValue={form.schoolSelect}
              customValue={form.schoolCustom}
              schoolOptions={schoolOptions}
              onSelectChange={(event) =>
                setForm((prev) => ({ ...prev, schoolSelect: event.target.value }))
              }
              onCustomChange={(event) =>
                setForm((prev) => ({ ...prev, schoolCustom: event.target.value }))
              }
            />
          </div>
        </div>
        <div className="sm:col-span-2">
          <ChildColorPicker
            value={form.colorKey}
            onChange={(colorKey) => setForm((prev) => ({ ...prev, colorKey }))}
          />
        </div>
        <div className="flex flex-wrap items-end gap-2 sm:col-span-2">
          <button type="submit" disabled={submitting} className="btn-primary">
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

      {error && <p className="alert-error mt-4">{error}</p>}

      <div className="mt-6">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted">Your children</h3>

        {loading ? (
          <p className="mt-3 text-muted">Loading…</p>
        ) : kids.length === 0 ? (
          <p className="mt-3 text-sm text-muted">
            No children added yet. Use the form above to add your first child.
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-border rounded-xl border border-border bg-bg-warm">
            {kids.map((kid) => (
              <li
                key={kid.id}
                className="flex items-center justify-between gap-4 px-4 py-3"
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
