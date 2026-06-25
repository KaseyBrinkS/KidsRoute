const STORAGE_PREFIX = 'kidsroute.guidance.v1'

function storageKey(key) {
  return `${STORAGE_PREFIX}:${key}`
}

export function isGuidanceDismissed(key) {
  try {
    return localStorage.getItem(storageKey(key)) === '1'
  } catch {
    return false
  }
}

export function dismissGuidance(key) {
  try {
    localStorage.setItem(storageKey(key), '1')
  } catch {
    // Ignore storage failures — banner may reappear next visit.
  }
}

export function readDismissedIdSet(key) {
  try {
    const raw = localStorage.getItem(storageKey(key))
    if (!raw) return new Set()
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? new Set(parsed) : new Set()
  } catch {
    return new Set()
  }
}

export function dismissIds(key, ids) {
  if (!ids?.length) return
  try {
    const current = readDismissedIdSet(key)
    for (const id of ids) current.add(id)
    localStorage.setItem(storageKey(key), JSON.stringify([...current]))
  } catch {
    // Ignore storage failures.
  }
}

export function hasUndismissedIds(key, ids) {
  if (!ids?.length) return false
  const dismissed = readDismissedIdSet(key)
  return ids.some((id) => !dismissed.has(id))
}
