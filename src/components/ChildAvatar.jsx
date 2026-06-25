import { CHILD_CALENDAR_COLORS, getChildColor, getChildColorById } from '../utils/dates'

function getColorForAvatar({ child, childId, kids, colorKey }) {
  if (typeof colorKey === 'number') {
    return CHILD_CALENDAR_COLORS[colorKey] ?? CHILD_CALENDAR_COLORS[0]
  }
  if (child) return getChildColor(child, kids)
  if (childId) return getChildColorById(childId, kids)
  return CHILD_CALENDAR_COLORS[0]
}

function initialFromName(firstName) {
  const trimmed = firstName?.trim()
  return trimmed ? trimmed.charAt(0).toUpperCase() : '?'
}

const SIZE_CLASSES = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-14 w-14 text-lg',
}

export default function ChildAvatar({
  firstName,
  child,
  childId,
  kids,
  colorKey,
  size = 'md',
  className = '',
}) {
  const color = getColorForAvatar({ child, childId, kids, colorKey })
  const sizeClass = SIZE_CLASSES[size] ?? SIZE_CLASSES.md
  const initial = initialFromName(firstName ?? child?.firstName)

  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-bold ${sizeClass} ${className}`}
      style={{
        backgroundColor: color.bg,
        color: color.text,
        border: `2px solid ${color.border}`,
      }}
      aria-hidden="true"
    >
      {initial}
    </span>
  )
}

export function childAvatarPropsFromParty(party, kids = []) {
  const ownKid = kids.find((kid) => kid.id === party.childId)
  return {
    firstName: party.childFirstName ?? ownKid?.firstName,
    colorKey: party.colorKey ?? ownKid?.colorKey,
    childId: party.childId,
    child: ownKid,
  }
}
