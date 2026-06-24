export default function ViewToggle({ value, onChange, options }) {
  return (
    <div className="inline-flex rounded-xl border border-border bg-bg-warm p-1">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
            value === option.value
              ? 'bg-surface text-primary shadow-sm'
              : 'text-muted hover:text-[var(--color-text)]'
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}
