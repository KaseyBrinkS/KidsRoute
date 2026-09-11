/** Persist ?authDebug=1 through OAuth redirects (sessionStorage survives same-origin return). */
function ensureAuthDebugFlag() {
  if (typeof window === 'undefined') return

  try {
    const params = new URLSearchParams(window.location.search)
    if (params.get('authDebug') === '1') {
      sessionStorage.setItem('kidsrouteAuthDebug', '1')
    }
  } catch {
    // sessionStorage may be unavailable in restricted contexts
  }
}

ensureAuthDebugFlag()

export function isAuthDebugEnabled() {
  if (import.meta.env.DEV) return true
  if (typeof window === 'undefined') return false

  try {
    return sessionStorage.getItem('kidsrouteAuthDebug') === '1'
  } catch {
    return false
  }
}

export function authLog(step, details) {
  if (!isAuthDebugEnabled()) return

  if (details !== undefined) {
    console.log(`[KidsRoute Auth] ${step}`, details)
  } else {
    console.log(`[KidsRoute Auth] ${step}`)
  }
}

export function authWarn(step, details) {
  if (!isAuthDebugEnabled()) return

  if (details !== undefined) {
    console.warn(`[KidsRoute Auth] ${step}`, details)
  } else {
    console.warn(`[KidsRoute Auth] ${step}`)
  }
}
