export default function KidsRouteLogo({ className = 'h-20 w-20', ...props }) {
  return (
    <svg
      viewBox="0 0 120 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label="KidsRoute logo"
      stroke="currentColor"
      strokeWidth="7"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      {/* Left figure */}
      <circle cx="36" cy="17" r="10" />
      <line x1="36" y1="27" x2="36" y2="56" />
      <line x1="36" y1="38" x2="20" y2="50" />
      <line x1="36" y1="38" x2="52" y2="38" />
      <line x1="36" y1="56" x2="26" y2="80" />
      <line x1="36" y1="56" x2="48" y2="78" />

      {/* Right figure */}
      <circle cx="84" cy="17" r="10" />
      <line x1="84" y1="27" x2="84" y2="56" />
      <line x1="84" y1="38" x2="100" y2="50" />
      <line x1="84" y1="38" x2="68" y2="38" />

      {/* Hands connected */}
      <line x1="52" y1="38" x2="68" y2="38" strokeWidth="8" />

      <line x1="84" y1="56" x2="94" y2="80" />
      <line x1="84" y1="56" x2="72" y2="78" />
    </svg>
  )
}
