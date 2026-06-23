export function formatFirestoreError(error, fallback = 'Something went wrong. Please try again.') {
  if (!error) return fallback

  const code = error.code ?? ''
  const message = error.message ?? ''

  if (code === 'permission-denied') {
    return 'Missing or insufficient permissions. Make sure you are signed in and Firestore rules allow this action.'
  }

  if (code === 'not-found') {
    return 'The requested record was not found. Refresh the page and try again.'
  }

  if (code === 'unavailable') {
    return 'Firestore is temporarily unavailable. Check your connection and try again.'
  }

  if (code === 'failed-precondition') {
    return message || 'This action could not be completed in the current state.'
  }

  if (code === 'deadline-exceeded' || message.includes('timed out')) {
    return message || 'The save took too long. Check your connection and try again.'
  }

  if (message.includes('Could not identify which child')) {
    return message
  }

  if (message.includes('walk session')) {
    return message
  }

  if (message.includes('already marked')) {
    return message
  }

  return message || fallback
}

export function isFirestorePermissionError(error) {
  if (!error) return false
  const code = error.code ?? ''
  const message = error.message ?? ''
  return (
    code === 'permission-denied'
    || message.includes('Missing or insufficient permissions')
    || message.includes('insufficient permissions')
  )
}
