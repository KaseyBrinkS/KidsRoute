import { Navigate, useParams } from 'react-router-dom'

export default function RedirectGroupChat() {
  const { groupId } = useParams()
  return <Navigate to={`/inbox/${groupId}`} replace />
}
