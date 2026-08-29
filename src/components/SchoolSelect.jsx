import { OTHER_SCHOOL_LABEL } from '../firebase/schools'

export default function SchoolSelect({
  selectId = 'school',
  customId = 'schoolCustom',
  selectValue,
  customValue,
  onSelectChange,
  onCustomChange,
  selectClassName = 'input-kr',
  customClassName = 'input-kr',
  showCustomHint = true,
  schoolOptions = [],
}) {
  const isOther = selectValue === OTHER_SCHOOL_LABEL
  const selectedOption = schoolOptions.find((option) => option.name === selectValue)

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <select
          id={selectId}
          name={selectId}
          value={selectValue}
          onChange={onSelectChange}
          className={`${selectClassName} min-w-0 flex-1`}
        >
          {schoolOptions.map((school) => (
            <option key={school.name} value={school.name}>
              {school.name}
              {school.isCommunity ? ' (Community)' : ''}
            </option>
          ))}
          <option value={OTHER_SCHOOL_LABEL}>{OTHER_SCHOOL_LABEL}</option>
        </select>
        {selectedOption?.isCommunity && (
          <span className="rounded-full bg-accent/10 px-2.5 py-0.5 text-xs font-semibold text-accent">
            Community
          </span>
        )}
      </div>

      {isOther && (
        <div>
          <label htmlFor={customId} className="block text-sm font-medium text-[var(--color-text)]">
            School name
          </label>
          <input
            id={customId}
            name={customId}
            type="text"
            value={customValue}
            onChange={onCustomChange}
            placeholder="Enter your school name"
            className={`${customClassName} mt-1`}
            required
          />
          {showCustomHint && (
            <p className="mt-1 text-xs text-muted">
              Your school will be added to the list for all families once you save.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
