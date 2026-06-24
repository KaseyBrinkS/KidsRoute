import {
  getAuth,
  getRedirectResult,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  signOut,
} from 'firebase/auth'
import app from './config'

export const auth = getAuth(app)
const googleProvider = new GoogleAuthProvider()

export function prefersGoogleRedirect() {
  const ua = navigator.userAgent
  return (
    /Safari/i.test(ua) &&
    !/Chrome|CriOS|Chromium|Edg|OPR|Firefox|FxiOS/i.test(ua)
  )
}

export async function signInWithGoogle() {
  if (prefersGoogleRedirect()) {
    await signInWithRedirect(auth, googleProvider)
    return null
  }
  return signInWithPopup(auth, googleProvider)
}

export function completeGoogleRedirectSignIn() {
  return getRedirectResult(auth)
}

export function logOut() {
  return signOut(auth)
}
