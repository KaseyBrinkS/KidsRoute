import { Link } from 'react-router-dom'
import AccessShell from './AccessShell'

export default function NotFound() {
  return (
    <AccessShell title="Page not found" description="We couldn't find that page.">
      <Link to="/home" className="btn-primary w-full text-center">
        Go to Home
      </Link>
    </AccessShell>
  )
}
