export const CONTACT_SUBJECTS = [
  { value: 'general_question', label: 'General question' },
  { value: 'safety_concern', label: 'Safety concern' },
  { value: 'technical_issue', label: 'Technical issue' },
  { value: 'school_business', label: 'School or business inquiry' },
  { value: 'feedback', label: 'Feedback' },
  { value: 'other', label: 'Other' },
]

export function contactSubjectLabel(value) {
  return CONTACT_SUBJECTS.find((subject) => subject.value === value)?.label ?? value
}
