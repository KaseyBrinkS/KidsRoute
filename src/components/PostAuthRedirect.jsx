import { useEffect, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getPostLoginPath, normalizeAppPath } from '../firebase/users'

const PUBLIC_ENTRY_PATHS = new Set(['/', '/login', '/welcome'])

/**
 * After sign-in, send users to the app home route instead of leaving them on
 * /login, /welcome, or legacy paths (e.g. /dashboard from OAuth return URLs).
 */
export default function PostAuthRedirect() {
  const { user, loading, initializing } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const handledRef = useRef(false)

  useEffect(() => {
    handledRef.current = false
  }, [user?.uid])

  useEffect(() => {
    if (loading || initializing || !user) return

    const currentPath = location.pathname
    const normalizedLegacy = normalizeAppPath(currentPath)
    const shouldRedirect =
      PUBLIC_ENTRY_PATHS.has(currentPath)
      || normalizedLegacy !== currentPath
      || currentPath === '/dashboard'

    if (!shouldRedirect || handledRef.current) return

    let cancelled = false

    async function redirect() {
      const target = normalizeAppPath(await getPostLoginPath(user.uid))
      if (cancelled) return

      console.log('[KidsRoute] Post-auth redirect', {
        from: currentPath,
        to: target,
        routerState: location.state,
        ignoredFrom: location.state?.from ?? null,
      })

      handledRef.current = true
      navigate(target, { replace: true, state: {} })
    }

    redirect().catch((err) => {
      console.error('[KidsRoute] Post-auth redirect failed', err)
      if (cancelled) return
      handledRef.current = true
      navigate('/home', { replace: true, state: {} })
    })

    return () => {
      cancelled = true
    }
  }, [user, loading, initializing, location.pathname, location.state, navigate])

  return null
}
