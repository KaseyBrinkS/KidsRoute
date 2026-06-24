import { WEEKDAYS, todayWeekday } from '../utils/dates'

export default function DaySelector({ selectedDay, onSelectDay, className = '' }) {
  const today = todayWeekday()

  return (
    <div className={`flex gap-2 overflow-x-auto pb-1 ${className}`}>
      {WEEKDAYS.map((day) => {
        const isSelected = day === selectedDay
        const isToday = day === today
        return (
          <button
            key={day}
            type="button"
            onClick={() => onSelectDay(day)}
            className={`shrink-0 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all ${
              isSelected
                ? 'bg-primary text-white shadow-md'
                : 'border border-border bg-surface text-muted hover:border-primary/30 hover:text-primary'
            }`}
          >
            {day}
            {isToday && !isSelected && (
              <span className="ml-1 text-xs font-normal text-accent">•</span>
            )}
          </button>
        )
      })}
    </div>
  )
}

export { todayWeekday }
