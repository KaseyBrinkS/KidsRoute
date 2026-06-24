export default function ViewToggle({ value, onChange, options }) {
  return (
    <div className="inline-flex rounded-2xl border border-border bg-bg-warm p-1">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={`rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${
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
