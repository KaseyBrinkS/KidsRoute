export const SCHOOLS = [
  'PS 150',
  'PS 234',
  'Spruce Street School',
  'PS 89',
  'PS 276',
]

export const OTHER_SCHOOL_LABEL = 'Other / Suggest a school'

export const DEFAULT_SCHOOL = SCHOOLS[0]

export function isListedSchool(school) {
  return SCHOOLS.includes(school)
}

export function schoolSelectValue(school) {
  if (!school || isListedSchool(school)) return school || DEFAULT_SCHOOL
  return OTHER_SCHOOL_LABEL
}

export function schoolCustomValue(school) {
  if (!school || isListedSchool(school)) return ''
  return school
}

export function resolveSchoolValue(selectValue, customValue) {
  if (selectValue === OTHER_SCHOOL_LABEL) {
    const trimmed = customValue?.trim()
    if (!trimmed) {
      throw new Error('Enter your school name.')
    }
    return trimmed
  }
  if (!selectValue?.trim()) {
    throw new Error('Select a school.')
  }
  return selectValue
}

export function formatSchoolDisplay(school) {
  return school?.trim() || DEFAULT_SCHOOL
}
