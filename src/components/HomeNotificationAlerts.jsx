import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getNotificationDeepLink } from '../firebase/appModel'
import { markNotificationRead, subscribeToUserNotifications } from '../firebase/groupLeaders'

export default function HomeNotificationAlerts() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [notifications, setNotifications] = useState([])

  useEffect(() => {
    if (!user) return undefined
    return subscribeToUserNotifications(
      user.uid,
      setNotifications,
      (err) => console.error('[HomeNotificationAlerts] subscription failed', err),
    )
  }, [user])

  const unread = notifications.filter((n) => !n.read).slice(0, 5)
  if (unread.length === 0) return null

  async function handleTap(notification) {
    if (user && !notification.read) {
      await markNotificationRead(user.uid, notification.id).catch(() => {})
    }
    navigate(getNotificationDeepLink(notification))
  }

  return (
    <section className="space-y-2">
      {unread.map((notification) => (
        <button
          key={notification.id}
          type="button"
          onClick={() => handleTap(notification)}
          className="kr-card-invite w-full px-4 py-3 text-left transition-shadow hover:shadow-md"
        >
          <p className="text-sm font-semibold text-[var(--color-text)]">
            {notification.message ?? 'New update'}
          </p>
        </button>
      ))}
    </section>
  )
}
