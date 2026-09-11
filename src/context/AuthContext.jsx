import { createContext, useContext, useEffect, useState } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { auth, completeOAuthRedirectSignIn, getAuthErrorMessage } from '../firebase/auth'
import { authLog, authWarn } from '../firebase/authDebug'
import { saveUserProfile } from '../firebase/users'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [initializing, setInitializing] = useState(true)
  const [redirectError, setRedirectError] = useState(null)

  useEffect(() => {
    let unsubscribe = () => {}
    let cancelled = false

    async function initAuth() {
      authLog('AuthProvider.initAuth: start')

      let redirectPending = false
      try {
        redirectPending = sessionStorage.getItem('oauthRedirectPending') === '1'
      } catch {
        redirectPending = false
      }

      try {
        authLog('AuthProvider.initAuth: awaiting getRedirectResult promise')
        const result = await completeOAuthRedirectSignIn()
        if (cancelled) return

        authLog('AuthProvider.initAuth: redirect result ready', {
          hasUser: Boolean(result?.user),
          uid: result?.user?.uid ?? null,
        })

        if (result?.user) {
          await saveUserProfile(result.user)
          authLog('AuthProvider.initAuth: saved profile after redirect')
        } else if (redirectPending) {
          authWarn('AuthProvider.initAuth: redirect was pending but getRedirectResult returned null', {
            href: window.location.href,
            origin: window.location.origin,
            authDomain: auth.config.authDomain,
          })
          setRedirectError(
            'Google sign-in did not complete after redirect. '
            + 'Safari may be blocking sign-in storage during the Firebase auth step. '
            + 'Try again, or open kidsroute.org/login?oauthPopup=1 to test popup sign-in.',
          )
        }

        try {
          sessionStorage.removeItem('oauthRedirectPending')
        } catch {
          // ignore
        }
      } catch (error) {
        if (cancelled) return

        try {
          sessionStorage.removeItem('oauthRedirectPending')
        } catch {
          // ignore
        }

        authWarn('AuthProvider.initAuth: redirect handling failed', {
          code: error?.code ?? null,
          message: error?.message ?? null,
        })

        const message = getAuthErrorMessage(error)
        if (message) {
          setRedirectError(message)
        }
      }

      authLog('AuthProvider.initAuth: subscribing to onAuthStateChanged')
      unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
        authLog('AuthProvider.onAuthStateChanged', {
          hasUser: Boolean(firebaseUser),
          uid: firebaseUser?.uid ?? null,
        })

        if (firebaseUser) {
          try {
            await saveUserProfile(firebaseUser)
          } catch (error) {
            authWarn('AuthProvider: saveUserProfile failed (non-blocking)', {
              message: error?.message ?? null,
            })
          }
        }

        if (!cancelled) {
          setUser(firebaseUser)
          setLoading(false)
          setInitializing(false)
          authLog('AuthProvider: auth ready', { hasUser: Boolean(firebaseUser) })
        }
      })
    }

    initAuth()

    return () => {
      cancelled = true
      unsubscribe()
    }
  }, [])

  function clearRedirectError() {
    setRedirectError(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, initializing, redirectError, clearRedirectError }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
