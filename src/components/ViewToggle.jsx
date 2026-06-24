export default function ViewToggle({ value, onChange, options, className = '' }) {
  return (
    <div
      className={`inline-flex w-full rounded-2xl border border-border bg-bg-warm p-1 sm:w-auto ${className}`}
      role="group"
      aria-label="View mode"
    >
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          aria-pressed={value === option.value}
          className={`flex-1 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors sm:flex-none ${
            value === option.value
              ? 'bg-surface text-primary shadow-sm'
              : 'text-muted hover:bg-surface/60 hover:text-primary'
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}
