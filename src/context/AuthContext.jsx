import { createContext, useContext, useEffect, useState } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { auth, completeOAuthRedirectSignIn, getAuthErrorMessage } from '../firebase/auth'
import { saveUserProfile } from '../firebase/users'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [initializing, setInitializing] = useState(true)
  const [redirectError, setRedirectError] = useState(null)

  useEffect(() => {
    let unsubscribe = () => {}

    async function initAuth() {
      try {
        const result = await completeOAuthRedirectSignIn()
        if (result?.user) {
          await saveUserProfile(result.user)
        }
        sessionStorage.removeItem('oauthRedirectPending')
      } catch (error) {
        sessionStorage.removeItem('oauthRedirectPending')
        const message = getAuthErrorMessage(error)
        if (message) {
          setRedirectError(message)
        }
      }

      unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
        if (firebaseUser) {
          try {
            await saveUserProfile(firebaseUser)
          } catch {
            // Profile sync is non-blocking for auth.
          }
        }
        setUser(firebaseUser)
        setLoading(false)
        setInitializing(false)
      })
    }

    initAuth()

    return () => unsubscribe()
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
