import { Link, useParams } from 'react-router-dom'
import GroupChat from './GroupChat'

export default function InboxThread() {
  const { groupId } = useParams()

  return (
    <div className="space-y-4">
      <Link to="/inbox" className="link-accent text-sm font-medium">
        ← Back to Inbox
      </Link>
      <GroupChat key={groupId} backTo="/inbox" />
    </div>
  )
}
