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

const appleProvider = new OAuthProvider('apple.com')
appleProvider.addScope('email')
appleProvider.addScope('name')

export function isIosSafari() {
  if (typeof navigator === 'undefined') return false

  const ua = navigator.userAgent
  const isIOS =
    /iPad|iPhone|iPod/.test(ua)
    || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  const isSafari =
    /Safari/i.test(ua)
    && !/Chrome|CriOS|Chromium|Edg|OPR|Firefox|FxiOS/i.test(ua)

  return isIOS && isSafari
}

export function prefersOAuthRedirect() {
  return isIosSafari()
}

/** @deprecated use prefersOAuthRedirect */
export function prefersGoogleRedirect() {
  return prefersOAuthRedirect()
}

function mapAuthError(error) {
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
      return ''
    default:
      return error?.message ?? 'Sign in failed. Please try again.'
  }
}

async function runAuth(fn) {
  try {
    return await fn()
  } catch (error) {
    const message = mapAuthError(error)
    if (message) {
      throw new Error(message)
    }
    return null
  }
}

export async function signInWithGoogle() {
  if (prefersOAuthRedirect()) {
    await signInWithRedirect(auth, googleProvider)
    return null
  }
  return runAuth(() => signInWithPopup(auth, googleProvider))
}

export async function signInWithApple() {
  if (prefersOAuthRedirect()) {
    await signInWithRedirect(auth, appleProvider)
    return null
  }
  return runAuth(() => signInWithPopup(auth, appleProvider))
}

export async function signInWithEmailPassword(email, password) {
  return runAuth(() => signInWithEmailAndPassword(auth, email.trim(), password))
}

export async function createAccountWithEmailPassword(email, password) {
  return runAuth(() => createUserWithEmailAndPassword(auth, email.trim(), password))
}

export function completeOAuthRedirectSignIn() {
  return getRedirectResult(auth)
}

/** @deprecated use completeOAuthRedirectSignIn */
export function completeGoogleRedirectSignIn() {
  return completeOAuthRedirectSignIn()
}

export function logOut() {
  return signOut(auth)
}
