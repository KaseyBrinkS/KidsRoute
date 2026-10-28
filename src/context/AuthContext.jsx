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
    let cancelled = false

    authLog('AuthProvider: subscribing to onAuthStateChanged')

    // Subscribe immediately — never block on getRedirectResult (Firebase recommended pattern).
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
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

    let redirectPending = false
    try {
      redirectPending = sessionStorage.getItem('oauthRedirectPending') === '1'
    } catch {
      redirectPending = false
    }

    completeOAuthRedirectSignIn()
      .then(async (result) => {
        if (cancelled) return

        authLog('AuthProvider: redirect result ready', {
          hasUser: Boolean(result?.user),
          uid: result?.user?.uid ?? null,
        })

        if (result?.user) {
          await saveUserProfile(result.user)
        } else if (redirectPending) {
          authWarn('AuthProvider: redirect was pending but getRedirectResult returned null', {
            href: window.location.href,
            origin: window.location.origin,
            authDomain: auth.config.authDomain,
          })
          setRedirectError(
            'Google sign-in did not complete after redirect. '
            + 'Try again, or open kidsroute.org/login?oauthPopup=1 to use popup sign-in.',
          )
        }
      })
      .catch((error) => {
        if (cancelled) return

        authWarn('AuthProvider: redirect handling failed', {
          code: error?.code ?? null,
          message: error?.message ?? null,
        })

        const message = getAuthErrorMessage(error)
        if (message) {
          setRedirectError(message)
        }
      })
      .finally(() => {
        try {
          sessionStorage.removeItem('oauthRedirectPending')
        } catch {
          // ignore
        }
      })

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
