import { useAuth } from '../context/AuthContext'
import { isAdmin } from '../firebase/admin'
import Admin from '../pages/Admin'
import NotFound from './NotFound'

export default function AdminOnlyRoute() {
  const { user } = useAuth()

  if (!isAdmin(user?.uid)) {
    return <NotFound />
  }

  return <Admin />
}
