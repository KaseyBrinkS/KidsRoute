const ACTIVATION_DISMISSAL_KEY = 'post-setup-activation'

function storageKey() {
  return `kidsroute.guidance.v1:${ACTIVATION_DISMISSAL_KEY}`
}

export function isActivationDismissed() {
  try {
    return localStorage.getItem(storageKey()) === '1'
  } catch {
    return false
  }
}

export function dismissActivation() {
  try {
    localStorage.setItem(storageKey(), '1')
  } catch {
    // Ignore storage failures.
  }
}
