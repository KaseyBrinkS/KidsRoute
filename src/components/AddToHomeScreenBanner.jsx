import { useState } from 'react'
import { ADD_TO_HOME_SCREEN_BANNER_KEY } from '../content/addToHomeScreen'
import { dismissGuidance, isGuidanceDismissed } from '../utils/guidanceDismissals'
import AddToHomeScreenInstructions from './AddToHomeScreenInstructions'

export default function AddToHomeScreenBanner({ className = '' }) {
  const [dismissed, setDismissed] = useState(() => isGuidanceDismissed(ADD_TO_HOME_SCREEN_BANNER_KEY))
  const [expanded, setExpanded] = useState(false)

  if (dismissed) return null

  function handleDismiss() {
    dismissGuidance(ADD_TO_HOME_SCREEN_BANNER_KEY)
    setDismissed(true)
  }

  return (
    <div
      className={`mb-6 rounded-2xl border border-primary/15 bg-bg-warm px-5 py-4 ${className}`}
      role="status"
    >
      <div className="flex items-start gap-3">
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          className="flex-1 text-left text-sm leading-relaxed text-primary hover:underline"
          aria-expanded={expanded}
        >
          Add KidsRoute to your home screen for the best experience →
        </button>
        <button
          type="button"
          onClick={handleDismiss}
          className="btn-ghost -mr-1 shrink-0 px-2 py-1 text-lg leading-none text-muted hover:text-[var(--color-text)]"
          aria-label="Dismiss"
        >
          ×
        </button>
      </div>

      {expanded && (
        <div className="mt-4 border-t border-border pt-4">
          <AddToHomeScreenInstructions />
        </div>
      )}
    </div>
  )
}
