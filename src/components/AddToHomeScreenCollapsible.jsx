import { useState } from 'react'
import AddToHomeScreenInstructions from './AddToHomeScreenInstructions'

export default function AddToHomeScreenCollapsible({ className = '' }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className={className}>
      <button
        type="button"
        onClick={() => setExpanded((value) => !value)}
        className="link-accent text-sm"
        aria-expanded={expanded}
      >
        Add KidsRoute to your phone →
      </button>

      {expanded && (
        <div className="kr-card mt-3 p-5">
          <AddToHomeScreenInstructions />
        </div>
      )}
    </div>
  )
}
