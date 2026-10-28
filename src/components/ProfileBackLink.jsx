import { Link } from 'react-router-dom'

export default function ProfileBackLink() {
  return (
    <Link to="/profile" className="link-accent text-sm font-medium">
      ← Back to Profile
    </Link>
  )
}
