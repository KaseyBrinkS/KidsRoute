import { OTHER_SCHOOL_LABEL, SCHOOLS } from '../firebase/schools'

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
}) {
  const isOther = selectValue === OTHER_SCHOOL_LABEL

  return (
    <div className="space-y-3">
      <select
        id={selectId}
        name={selectId}
        value={selectValue}
        onChange={onSelectChange}
        className={selectClassName}
      >
        {SCHOOLS.map((school) => (
          <option key={school} value={school}>
            {school}
          </option>
        ))}
        <option value={OTHER_SCHOOL_LABEL}>{OTHER_SCHOOL_LABEL}</option>
      </select>

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
              We&apos;ll use this for building walks and may add your school to the list later.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
