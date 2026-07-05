const NAVY = '#1C3A4A'
const PINK = '#C4768A'
const WHITE = '#FFFFFF'

/** Shared mark: navy rounded square, pink pin, white figures, pink hand link. */
export function KidsRouteLogoMark({ className = '', ...props }) {
  return (
    <svg
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label="KidsRoute logo"
      {...props}
    >
      <rect width="120" height="120" rx="26" fill={NAVY} />

      <circle cx="60" cy="27" r="11" fill={PINK} />
      <circle cx="60" cy="27" r="4.5" fill={WHITE} />
      <path d="M60 38 L51.5 49.5 Q60 45.5 68.5 49.5 Z" fill={PINK} />

      <g
        stroke={WHITE}
        strokeWidth="7"
        strokeLinecap="round"
        strokeLinejoin="round"
        transform="translate(0 46)"
      >
        <circle cx="36" cy="17" r="9" />
        <line x1="36" y1="26" x2="36" y2="52" />
        <line x1="36" y1="36" x2="21" y2="47" />
        <line x1="36" y1="36" x2="51" y2="36" />
        <line x1="36" y1="52" x2="27" y2="72" />
        <line x1="36" y1="52" x2="47" y2="70" />

        <circle cx="84" cy="17" r="9" />
        <line x1="84" y1="26" x2="84" y2="52" />
        <line x1="84" y1="36" x2="99" y2="47" />
        <line x1="84" y1="36" x2="69" y2="36" />
        <line x1="84" y1="52" x2="93" y2="72" />
        <line x1="84" y1="52" x2="73" y2="70" />
      </g>

      <line
        x1="51"
        y1="82"
        x2="69"
        y2="82"
        stroke={PINK}
        strokeWidth="8"
        strokeLinecap="round"
      />
    </svg>
  )
}

export default function KidsRouteLogo(props) {
  return <KidsRouteLogoMark {...props} />
}
