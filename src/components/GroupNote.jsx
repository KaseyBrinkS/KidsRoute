import { useEffect, useState } from 'react'
import { getGroupNote, updateGroupNote } from '../firebase/groupNotes'

export default function GroupNote({
  group,
  userId,
  editorName = 'A parent',
  compact = false,
  className = '',
}) {
  const savedNote = getGroupNote(group)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(savedNote?.text ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!editing) {
      setDraft(savedNote?.text ?? '')
    }
  }, [savedNote?.text, editing])

  async function handleSave(event) {
    event.preventDefault()
    setError(null)
    setBusy(true)
    try {
      await updateGroupNote(group.id, userId, draft, editorName)
      setEditing(false)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  function handleCancel() {
    setDraft(savedNote?.text ?? '')
    setEditing(false)
    setError(null)
  }

  if (compact && !savedNote && !editing) {
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        className={`mt-2 block text-left text-xs font-medium underline opacity-90 ${className}`}
      >
        + Add group note
      </button>
    )
  }

  if (!savedNote && !editing) {
    return (
      <div className={`rounded-xl border border-dashed border-border bg-bg-warm/60 px-4 py-3 ${className}`}>
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="text-left text-sm text-muted hover:text-[var(--color-text)]"
        >
          <span className="font-semibold text-primary">Group note</span>
          <span className="mt-1 block">
            Add a note for your group — e.g. where to meet or who&apos;s running late.
          </span>
        </button>
      </div>
    )
  }

  if (editing) {
    return (
      <form
        onSubmit={handleSave}
        className={`rounded-xl border-2 border-primary/25 bg-primary/5 px-4 py-3 ${className}`}
      >
        <p className="text-xs font-bold uppercase tracking-wide text-primary">Group note</p>
        <textarea
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          rows={compact ? 2 : 3}
          maxLength={280}
          placeholder={'e.g. "Meeting at Warren St entrance, I\'ll be there by 4pm"'}
          className="input-kr mt-2 w-full resize-y text-sm"
          autoFocus
        />
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <button type="submit" disabled={busy} className="btn-primary py-1.5 text-xs">
            {busy ? 'Saving…' : 'Save note'}
          </button>
          <button type="button" onClick={handleCancel} className="btn-link-accent py-1.5 text-xs">
            Cancel
          </button>
          <span className="text-xs text-muted">{draft.length}/280</span>
        </div>
        {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
      </form>
    )
  }

  return (
    <div className={`rounded-xl border-2 border-primary/25 bg-primary/5 px-4 py-3 ${className}`}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-bold uppercase tracking-wide text-primary">📌 Group note</p>
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="link-accent text-xs"
        >
          Edit
        </button>
      </div>
      <p className={`mt-1 font-medium text-[var(--color-text)] ${compact ? 'text-xs' : 'text-sm'}`}>
        {savedNote.text}
      </p>
      {!compact && savedNote.updatedByName && (
        <p className="mt-1 text-xs text-muted">Updated by {savedNote.updatedByName}</p>
      )}
    </div>
  )
}
