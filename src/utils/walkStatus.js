export function walkStatusCardClass(status) {
  if (status === 'in progress') return 'kr-card-walk-active'
  if (status === 'completed') return 'kr-card-walk-completed'
  return 'kr-card-walk-upcoming'
}

export function walkStatusBadgeClass(status) {
  if (status === 'in progress') return 'badge-walk-active'
  if (status === 'completed') return 'badge-walk-completed'
  return 'badge-walk-upcoming'
}

export function walkStatusLabel(status) {
  if (status === 'in progress') return 'En route'
  if (status === 'completed') return 'Completed'
  return 'Before pickup'
}

export function historyWalkStatus(entry) {
  if (entry.droppedOffAt != null && entry.droppedOffAt !== '') return 'completed'
  if (entry.pickedUpAt) return 'in progress'
  return 'upcoming'
}
