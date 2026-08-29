import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  completeOAuthRedirectSignIn,
  createAccountWithEmailPassword,
  isIosSafari,
  signInWithApple,
  signInWithEmailPassword,
  signInWithGoogle,
} from '../firebase/auth'
import { claimLeaderInvite, syncLeaderProfileFromInvite } from '../firebase/groupLeaders'
import { getPostLoginPath, saveUserProfile } from '../firebase/users'
import KidsRouteLogo from '../components/KidsRouteLogo'

function OrDivider() {
  return (
    <div className="my-4 flex items-center gap-3">
      <div className="h-px flex-1 bg-border" />
      <span className="text-sm font-medium text-muted">or</span>
      <div className="h-px flex-1 bg-border" />
    </div>
  )
}

function AppleIcon() {
  return (
    <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"
      />
    </svg>
  )
}

export default function Login() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { user } = useAuth()
  const [error, setError] = useState(null)
  const [busyMethod, setBusyMethod] = useState(null)
  const [emailExpanded, setEmailExpanded] = useState(false)
  const [emailMode, setEmailMode] = useState('signIn')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const showAppleSignIn = isIosSafari()

  useEffect(() => {
    const inviteToken = searchParams.get('invite')
    if (inviteToken) {
      sessionStorage.setItem('leaderInvite', inviteToken)
    }
  }, [searchParams])

  async function finishLogin(userId) {
    const inviteToken =
      searchParams.get('invite') || sessionStorage.getItem('leaderInvite')

    if (inviteToken) {
      try {
        const invite = await claimLeaderInvite(inviteToken, userId)
        await syncLeaderProfileFromInvite(userId, invite)
        sessionStorage.removeItem('leaderInvite')
        navigate('/leader', { replace: true })
        return
      } catch (err) {
        setError(err.message)
        return
      }
    }

    const path = await getPostLoginPath(userId)
    navigate(path, { replace: true })
  }

  useEffect(() => {
    if (!user) return
    finishLogin(user.uid).catch(() => navigate('/welcome', { replace: true }))
  }, [user, navigate])

  useEffect(() => {
    let cancelled = false

    async function handleRedirectResult() {
      try {
        const result = await completeOAuthRedirectSignIn()
        if (cancelled || !result) return

        await saveUserProfile(result.user)
        await finishLogin(result.user.uid)
      } catch (err) {
        if (!cancelled) setError(err.message)
      }
    }

    handleRedirectResult()
    return () => {
      cancelled = true
    }
  }, [navigate])

  async function handleAuth(method, fn) {
    setError(null)
    setBusyMethod(method)
    try {
      const result = await fn()
      if (!result) return

      await saveUserProfile(result.user)
      await finishLogin(result.user.uid)
    } catch (err) {
      if (err.message) setError(err.message)
    } finally {
      setBusyMethod(null)
    }
  }

  function handleGoogleSignIn() {
    return handleAuth('google', signInWithGoogle)
  }

  function handleAppleSignIn() {
    return handleAuth('apple', signInWithApple)
  }

  function handleEmailSubmit(event) {
    event.preventDefault()
    if (!email.trim() || !password) {
      setError('Enter your email and password.')
      return
    }

    const action =
      emailMode === 'createAccount'
        ? () => createAccountWithEmailPassword(email, password)
        : () => signInWithEmailPassword(email, password)

    return handleAuth('email', action)
  }

  function toggleEmailMode() {
    setEmailMode((current) => (current === 'signIn' ? 'createAccount' : 'signIn'))
    setError(null)
  }

  const isBusy = busyMethod !== null

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg px-4 py-10">
      <div className="kr-card w-full max-w-md overflow-hidden p-0">
        <div className="login-hero-gradient px-8 pb-8 pt-10">
          <div className="flex flex-col items-center text-center">
            <KidsRouteLogo className="h-[120px] w-[120px] min-h-[100px] min-w-[100px]" />
            <h1 className="font-heading mt-6 text-4xl font-semibold text-primary-dark">KidsRoute</h1>
            <p className="mt-3 text-lg font-medium text-muted">
              Safe walks, together.
            </p>
          </div>
        </div>

        <div className="px-8 pb-10 pt-2">
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={isBusy}
            className="btn-secondary w-full gap-3 py-3.5"
          >
            <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            {busyMethod === 'google' ? 'Signing in…' : 'Sign in with Google'}
          </button>

          <OrDivider />

          {!emailExpanded ? (
            <button
              type="button"
              onClick={() => {
                setEmailExpanded(true)
                setError(null)
              }}
              disabled={isBusy}
              className="btn-secondary w-full py-3.5"
            >
              Continue with email
            </button>
          ) : (
            <form onSubmit={handleEmailSubmit} className="space-y-3">
              <div>
                <label htmlFor="login-email" className="mb-1.5 block text-sm font-medium text-[var(--color-text)]">
                  Email
                </label>
                <input
                  id="login-email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@example.com"
                  disabled={isBusy}
                  className="input-kr"
                />
              </div>

              <div>
                <label htmlFor="login-password" className="mb-1.5 block text-sm font-medium text-[var(--color-text)]">
                  Password
                </label>
                <input
                  id="login-password"
                  type="password"
                  autoComplete={emailMode === 'createAccount' ? 'new-password' : 'current-password'}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="••••••••"
                  disabled={isBusy}
                  className="input-kr"
                />
              </div>

              <button
                type="submit"
                disabled={isBusy}
                className="btn-primary w-full py-3"
              >
                {busyMethod === 'email'
                  ? 'Please wait…'
                  : emailMode === 'createAccount'
                    ? 'Create account'
                    : 'Sign in'}
              </button>

              <button
                type="button"
                onClick={toggleEmailMode}
                disabled={isBusy}
                className="link-accent mx-auto block text-sm font-semibold"
              >
                {emailMode === 'createAccount'
                  ? 'Already have an account? Sign in'
                  : 'New here? Create account'}
              </button>
            </form>
          )}

          {showAppleSignIn && (
            <>
              <OrDivider />

              <button
                type="button"
                onClick={handleAppleSignIn}
                disabled={isBusy}
                className="inline-flex w-full items-center justify-center gap-2.5 rounded-2xl bg-black px-5 py-3.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                <AppleIcon />
                {busyMethod === 'apple' ? 'Signing in…' : 'Sign in with Apple'}
              </button>
            </>
          )}

          {error && (
            <p className="alert-error mt-4 text-center">{error}</p>
          )}
        </div>
      </div>
    </div>
  )
}
