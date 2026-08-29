export const SCHOOLS = [
  'PS 150',
  'PS 234',
  'Spruce Street School',
  'PS 89',
  'PS 276',
]

export const OTHER_SCHOOL_LABEL = 'Other / Suggest a school'

export const DEFAULT_SCHOOL = SCHOOLS[0]

export function isListedSchool(school, allSchoolNames = SCHOOLS) {
  return allSchoolNames.includes(school)
}

export function schoolSelectValue(school, allSchoolNames = SCHOOLS) {
  if (!school || isListedSchool(school, allSchoolNames)) return school || DEFAULT_SCHOOL
  return OTHER_SCHOOL_LABEL
}

export function schoolCustomValue(school, allSchoolNames = SCHOOLS) {
  if (!school || isListedSchool(school, allSchoolNames)) return ''
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

export async function resolveAndRegisterSchool(selectValue, customValue, registerFn) {
  const school = resolveSchoolValue(selectValue, customValue)
  if (selectValue === OTHER_SCHOOL_LABEL && registerFn) {
    await registerFn(school)
  }
  return school
}

export function formatSchoolDisplay(school) {
  return school?.trim() || DEFAULT_SCHOOL
}
