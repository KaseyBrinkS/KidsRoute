/** Decorative QR-style placeholder for bulletin-board flyers. */
export default function FlyerQrPlaceholder({ className = '' }) {
  return (
    <svg
      viewBox="0 0 120 120"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label="QR code placeholder — scan to visit kidsroute.org"
    >
      <rect x="1" y="1" width="118" height="118" fill="#fff" stroke="#1C3A4A" strokeWidth="2" />
      {/* Finder patterns */}
      <rect x="8" y="8" width="28" height="28" fill="#1C3A4A" />
      <rect x="12" y="12" width="20" height="20" fill="#fff" />
      <rect x="16" y="16" width="12" height="12" fill="#1C3A4A" />
      <rect x="84" y="8" width="28" height="28" fill="#1C3A4A" />
      <rect x="88" y="12" width="20" height="20" fill="#fff" />
      <rect x="92" y="16" width="12" height="12" fill="#1C3A4A" />
      <rect x="8" y="84" width="28" height="28" fill="#1C3A4A" />
      <rect x="12" y="88" width="20" height="20" fill="#fff" />
      <rect x="16" y="92" width="12" height="12" fill="#1C3A4A" />
      {/* Data modules */}
      <g fill="#1C3A4A">
        <rect x="44" y="8" width="6" height="6" />
        <rect x="56" y="8" width="6" height="6" />
        <rect x="68" y="8" width="6" height="6" />
        <rect x="44" y="20" width="6" height="6" />
        <rect x="62" y="20" width="6" height="6" />
        <rect x="44" y="32" width="6" height="6" />
        <rect x="56" y="32" width="6" height="6" />
        <rect x="74" y="32" width="6" height="6" />
        <rect x="8" y="44" width="6" height="6" />
        <rect x="20" y="44" width="6" height="6" />
        <rect x="44" y="44" width="6" height="6" />
        <rect x="56" y="44" width="6" height="6" />
        <rect x="68" y="44" width="6" height="6" />
        <rect x="92" y="44" width="6" height="6" />
        <rect x="104" y="44" width="6" height="6" />
        <rect x="20" y="56" width="6" height="6" />
        <rect x="44" y="56" width="6" height="6" />
        <rect x="62" y="56" width="6" height="6" />
        <rect x="80" y="56" width="6" height="6" />
        <rect x="98" y="56" width="6" height="6" />
        <rect x="44" y="68" width="6" height="6" />
        <rect x="56" y="68" width="6" height="6" />
        <rect x="74" y="68" width="6" height="6" />
        <rect x="104" y="68" width="6" height="6" />
        <rect x="44" y="80" width="6" height="6" />
        <rect x="62" y="80" width="6" height="6" />
        <rect x="86" y="80" width="6" height="6" />
        <rect x="44" y="92" width="6" height="6" />
        <rect x="56" y="92" width="6" height="6" />
        <rect x="68" y="92" width="6" height="6" />
        <rect x="92" y="92" width="6" height="6" />
        <rect x="104" y="104" width="6" height="6" />
        <rect x="80" y="104" width="6" height="6" />
        <rect x="44" y="104" width="6" height="6" />
      </g>
      {/* Center brand dot */}
      <circle cx="60" cy="60" r="10" fill="#C4768A" />
      <circle cx="60" cy="60" r="4" fill="#fff" />
    </svg>
  )
}
