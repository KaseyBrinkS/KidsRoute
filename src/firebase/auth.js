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

export const auth = getAuth(app)
const googleProvider = new GoogleAuthProvider()
googleProvider.setCustomParameters({ prompt: 'select_account' })

const appleProvider = new OAuthProvider('apple.com')
appleProvider.addScope('email')
appleProvider.addScope('name')

/** Cached so React Strict Mode / remounts don't consume the redirect twice. */
let pendingRedirectResult = null

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

export function prefersOAuthRedirect() {
  // Popups are unreliable on all iOS browsers (Safari, Chrome, in-app webviews).
  return isIOS()
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
  try {
    return await signInWithPopup(auth, provider)
  } catch (error) {
    if (error?.code === 'auth/popup-blocked') {
      sessionStorage.setItem('oauthRedirectPending', '1')
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
  if (prefersOAuthRedirect()) {
    sessionStorage.setItem('oauthRedirectPending', '1')
    await signInWithRedirect(auth, googleProvider)
    return null
  }
  return signInWithOAuthPopup(googleProvider)
}

export async function signInWithApple() {
  if (prefersOAuthRedirect()) {
    sessionStorage.setItem('oauthRedirectPending', '1')
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
  if (!pendingRedirectResult) {
    pendingRedirectResult = getRedirectResult(auth)
  }
  return pendingRedirectResult
}

/** @deprecated use completeOAuthRedirectSignIn */
export function completeGoogleRedirectSignIn() {
  return completeOAuthRedirectSignIn()
}

export function logOut() {
  pendingRedirectResult = null
  return signOut(auth)
}
