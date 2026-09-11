import {
  createUserWithEmailAndPassword,
  getAuth,
  getRedirectResult,
  GoogleAuthProvider,
  OAuthProvider,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  signOut,
} from 'firebase/auth'
import app from './config'
import { authLog, authWarn } from './authDebug'

export const auth = getAuth(app)
const googleProvider = new GoogleAuthProvider()
googleProvider.setCustomParameters({ prompt: 'select_account' })

const appleProvider = new OAuthProvider('apple.com')
appleProvider.addScope('email')
appleProvider.addScope('name')

/** Cached so React Strict Mode / remounts don't consume the redirect twice. */
let pendingRedirectResult = null

function readSessionFlag(key) {
  try {
    return sessionStorage.getItem(key)
  } catch {
    return null
  }
}

function writeSessionFlag(key, value) {
  try {
    sessionStorage.setItem(key, value)
  } catch {
    // sessionStorage may be unavailable (private mode / ITP)
  }
}

function removeSessionFlag(key) {
  try {
    sessionStorage.removeItem(key)
  } catch {
    // ignore
  }
}

export function isIOS() {
  if (typeof navigator === 'undefined') return false

  const ua = navigator.userAgent
  return (
    /iPad|iPhone|iPod/.test(ua)
    || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  )
}

export function isIosSafari() {
  if (typeof navigator === 'undefined') return false

  const ua = navigator.userAgent
  const isSafari =
    /Safari/i.test(ua)
    && !/Chrome|CriOS|Chromium|Edg|OPR|Firefox|FxiOS/i.test(ua)

  return isIOS() && isSafari
}

/** ?oauthPopup=1 or session flag — force popup for redirect debugging on iOS. */
export function isOAuthPopupForced() {
  if (import.meta.env.VITE_FORCE_OAUTH_POPUP === 'true') return true
  if (typeof window === 'undefined') return false

  try {
    const params = new URLSearchParams(window.location.search)
    if (params.get('oauthPopup') === '1') {
      sessionStorage.setItem('kidsrouteForceOAuthPopup', '1')
      return true
    }
    return sessionStorage.getItem('kidsrouteForceOAuthPopup') === '1'
  } catch {
    return false
  }
}

export function prefersOAuthRedirect() {
  if (isOAuthPopupForced()) {
    authLog('OAuth mode: popup (forced via ?oauthPopup=1 or VITE_FORCE_OAUTH_POPUP)')
    return false
  }

  // TEMPORARY TEST: iOS Safari redirect often fails (ITP blocks storage on the
  // firebaseapp.com auth handler hop). Try popup unless explicitly re-enabled.
  // Set VITE_OAUTH_USE_REDIRECT=true to restore redirect on iOS Safari.
  if (isIosSafari() && import.meta.env.VITE_OAUTH_USE_REDIRECT !== 'true') {
    authLog('OAuth mode: popup (iOS Safari — redirect disabled for testing)')
    return false
  }

  const useRedirect = isIOS()
  authLog(`OAuth mode: ${useRedirect ? 'redirect' : 'popup'}`, {
    isIOS: isIOS(),
    isIosSafari: isIosSafari(),
  })
  return useRedirect
}

/** @deprecated use prefersOAuthRedirect */
export function prefersGoogleRedirect() {
  return prefersOAuthRedirect()
}

export function getAuthErrorMessage(error) {
  switch (error?.code) {
    case 'auth/invalid-email':
      return 'Enter a valid email address.'
    case 'auth/user-disabled':
      return 'This account has been disabled.'
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Incorrect email or password.'
    case 'auth/email-already-in-use':
      return 'An account with this email already exists. Try signing in instead.'
    case 'auth/weak-password':
      return 'Password must be at least 6 characters.'
    case 'auth/too-many-requests':
      return 'Too many attempts. Please wait a moment and try again.'
    case 'auth/popup-closed-by-user':
    case 'auth/cancelled-popup-request':
    case 'auth/redirect-cancelled-by-user':
      return ''
    case 'auth/popup-blocked':
      return 'Pop-up was blocked. Trying redirect sign-in…'
    case 'auth/unauthorized-domain':
      return 'This domain is not authorized for sign-in. Add it in Firebase Console → Authentication → Settings → Authorized domains (include kidsroute.org and kidsroute-4c9fd.firebaseapp.com).'
    case 'auth/operation-not-allowed':
      return 'This sign-in method is not enabled. Enable it in Firebase Console → Authentication → Sign-in method.'
    case 'auth/network-request-failed':
      return 'Network error. Check your connection and try again.'
    case 'auth/web-storage-unsupported':
      return 'Sign-in requires browser storage. Disable private browsing or allow cookies for this site.'
    default:
      return error?.message ?? 'Sign in failed. Please try again.'
  }
}

function logRedirectContext(label) {
  if (typeof window === 'undefined') return

  authLog(label, {
    href: window.location.href,
    origin: window.location.origin,
    pathname: window.location.pathname,
    authDomain: auth.config.authDomain,
    oauthRedirectPending: readSessionFlag('oauthRedirectPending'),
    onFirebaseHost: window.location.hostname.includes('firebaseapp.com'),
    expectedReturnHost: 'kidsroute.org',
  })

  if (window.location.hostname.includes('firebaseapp.com')) {
    authWarn(
      'Page loaded on firebaseapp.com — OAuth should return to kidsroute.org/login. '
      + 'Check Firebase authorized domains and hosting rewrites.',
    )
  }
}

/**
 * Start getRedirectResult immediately when this module loads — before React mounts.
 * Firebase requires this on the returning page after signInWithRedirect.
 */
function captureRedirectResultOnLoad() {
  if (typeof window === 'undefined') {
    return Promise.resolve(null)
  }

  logRedirectContext('captureRedirectResultOnLoad: starting getRedirectResult')

  if (!pendingRedirectResult) {
    pendingRedirectResult = getRedirectResult(auth)
      .then((result) => {
        authLog('getRedirectResult resolved', {
          hasUser: Boolean(result?.user),
          uid: result?.user?.uid ?? null,
          email: result?.user?.email ?? null,
          operationType: result?.operationType ?? null,
          providerId: result?.providerId ?? null,
          returnUrl: window.location.href,
        })
        return result
      })
      .catch((error) => {
        authWarn('getRedirectResult rejected', {
          code: error?.code ?? null,
          message: error?.message ?? null,
          returnUrl: window.location.href,
        })
        throw error
      })
  }

  return pendingRedirectResult
}

// Fire as early as possible — do not wait for React / AuthProvider.
captureRedirectResultOnLoad()

async function runAuth(fn) {
  try {
    return await fn()
  } catch (error) {
    const message = getAuthErrorMessage(error)
    if (message) {
      throw new Error(message)
    }
    return null
  }
}

async function signInWithOAuthPopup(provider) {
  authLog('signInWithOAuthPopup: opening popup', { origin: window.location.origin })
  try {
    const result = await signInWithPopup(auth, provider)
    authLog('signInWithOAuthPopup: success', { uid: result.user.uid })
    return result
  } catch (error) {
    authLog('signInWithOAuthPopup: error', {
      code: error?.code ?? null,
      message: error?.message ?? null,
    })

    if (error?.code === 'auth/popup-blocked') {
      authLog('signInWithOAuthPopup: popup blocked — falling back to redirect')
      writeSessionFlag('oauthRedirectPending', '1')
      await signInWithRedirect(auth, provider)
      return null
    }

    const message = getAuthErrorMessage(error)
    if (message) {
      throw new Error(message)
    }
    return null
  }
}

export async function signInWithGoogle() {
  const useRedirect = prefersOAuthRedirect()
  authLog('signInWithGoogle: start', {
    useRedirect,
    startUrl: typeof window !== 'undefined' ? window.location.href : null,
  })

  if (useRedirect) {
    writeSessionFlag('oauthRedirectPending', '1')
    authLog('signInWithGoogle: calling signInWithRedirect (expect return to same URL)', {
      expectedReturn: typeof window !== 'undefined'
        ? `${window.location.origin}${window.location.pathname}`
        : null,
      authHandlerDomain: auth.config.authDomain,
    })
    await signInWithRedirect(auth, googleProvider)
    return null
  }

  return signInWithOAuthPopup(googleProvider)
}

export async function signInWithApple() {
  const useRedirect = prefersOAuthRedirect()
  authLog('signInWithApple: start', { useRedirect })

  if (useRedirect) {
    writeSessionFlag('oauthRedirectPending', '1')
    await signInWithRedirect(auth, appleProvider)
    return null
  }

  return signInWithOAuthPopup(appleProvider)
}

export async function signInWithEmailPassword(email, password) {
  return runAuth(() => signInWithEmailAndPassword(auth, email.trim(), password))
}

export async function createAccountWithEmailPassword(email, password) {
  return runAuth(() => createUserWithEmailAndPassword(auth, email.trim(), password))
}

export function completeOAuthRedirectSignIn() {
  return captureRedirectResultOnLoad()
}

/** @deprecated use completeOAuthRedirectSignIn */
export function completeGoogleRedirectSignIn() {
  return completeOAuthRedirectSignIn()
}

export function logOut() {
  pendingRedirectResult = null
  removeSessionFlag('oauthRedirectPending')
  return signOut(auth)
}
