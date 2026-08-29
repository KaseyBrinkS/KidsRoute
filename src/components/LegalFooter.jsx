import { Link } from 'react-router-dom'

export default function LegalFooter({ className = '' }) {
  return (
    <footer className={`text-center text-xs text-muted ${className}`}>
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
