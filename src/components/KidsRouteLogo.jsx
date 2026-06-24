export default function KidsRouteLogo({ className = 'h-20 w-20', ...props }) {
  return (
    <svg
      viewBox="0 0 80 80"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
      {...props}
    >
      <circle cx="40" cy="40" r="38" stroke="currentColor" strokeWidth="2" className="text-primary/20" />
      {/* Left child */}
      <circle cx="28" cy="26" r="7" fill="currentColor" className="text-primary" />
      <path
        d="M22 38 Q28 34 34 38 L34 52 Q28 56 22 52 Z"
        fill="currentColor"
        className="text-primary"
      />
      {/* Right child */}
      <circle cx="52" cy="26" r="7" fill="currentColor" className="text-primary" />
      <path
        d="M46 38 Q52 34 58 38 L58 52 Q52 56 46 52 Z"
        fill="currentColor"
        className="text-primary"
      />
      {/* Holding hands */}
      <path
        d="M34 42 C38 44 42 44 46 42"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        className="text-accent"
      />
      {/* Path dots */}
      <circle cx="24" cy="62" r="2" fill="currentColor" className="text-accent/60" />
      <circle cx="40" cy="66" r="2" fill="currentColor" className="text-accent/80" />
      <circle cx="56" cy="62" r="2" fill="currentColor" className="text-accent/60" />
    </svg>
  )
}
