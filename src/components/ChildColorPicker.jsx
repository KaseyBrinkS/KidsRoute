import { CHILD_CALENDAR_COLORS } from '../utils/dates'

export default function ChildColorPicker({ value, onChange, id = 'child-color' }) {
  return (
    <div className="sm:col-span-2 lg:col-span-4">
      <span id={`${id}-label`} className="block text-sm font-medium text-[var(--color-text)]">
        Color
      </span>
      <p className="mt-0.5 text-xs text-muted">
        Used on calendars and group cards so you can tell your children apart at a glance.
      </p>
      <div
        role="radiogroup"
        aria-labelledby={`${id}-label`}
        className="mt-2 flex flex-wrap gap-2"
      >
        {CHILD_CALENDAR_COLORS.map((color, index) => {
          const selected = value === index
          return (
            <button
              key={index}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-label={`Color ${index + 1}`}
              onClick={() => onChange(index)}
              className={`h-9 w-9 rounded-full border-2 border-white/80 shadow-sm transition-transform hover:scale-110 ${
                selected ? 'scale-110 ring-2 ring-primary ring-offset-2' : ''
              }`}
              style={{ backgroundColor: color.swatch ?? color.border }}
            />
          )
        })}
      </div>
    </div>
  )
}
