export default function GuidanceBanner({ children, onDismiss, className = '' }) {
  return (
    <div
      className={`mb-6 flex items-start gap-3 rounded-2xl border border-support-blue/15 bg-support-blue-soft px-5 py-4 ${className}`}
      role="status"
    >
      <p className="flex-1 text-sm leading-relaxed text-support-blue">{children}</p>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className="btn-ghost -mr-1 shrink-0 px-2 py-1 text-lg leading-none text-support-blue/70 hover:bg-support-blue/10 hover:text-support-blue"
          aria-label="Dismiss"
        >
          ×
        </button>
      )}
    </div>
  )
}
