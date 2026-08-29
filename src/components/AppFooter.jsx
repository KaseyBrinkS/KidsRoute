import { Link } from 'react-router-dom'

export default function AppFooter() {
  return (
    <footer className="mt-8 border-t border-border pt-6 text-center text-xs text-muted">
      <Link to="/safety" className="hover:text-primary hover:underline">
        Safety &amp; Privacy
      </Link>
      <span className="mx-2 text-border">·</span>
      <Link to="/privacy" className="hover:text-primary hover:underline">
        Privacy Policy
      </Link>
      <span className="mx-2 text-border">·</span>
      <Link to="/terms" className="hover:text-primary hover:underline">
        Terms of Service
      </Link>
    </footer>
  )
}
