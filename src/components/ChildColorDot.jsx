import { getChildColor, getChildColorById } from '../utils/dates'

export default function ChildColorDot({
  child,
  childId,
  kids,
  fallbackChildIds,
  size = 'sm',
  className = '',
}) {
  const color = child
    ? getChildColor(child, kids)
    : getChildColorById(childId, kids, fallbackChildIds)
  const sizeClass = size === 'md' ? 'h-2.5 w-2.5' : 'h-2 w-2'

  return (
    <span
      className={`inline-block shrink-0 rounded-full ${sizeClass} ${className}`}
      style={{ backgroundColor: color.swatch ?? color.border }}
      aria-hidden="true"
    />
  )
}

export function ChildNameWithDot({
  name,
  child,
  childId,
  kids,
  fallbackChildIds,
  className = '',
}) {
  const resolvedId = child?.id ?? childId
  const kid = child ?? (kids ?? []).find((entry) => entry.id === resolvedId)

  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`}>
      <ChildColorDot
        child={kid}
        childId={resolvedId}
        kids={kids}
        fallbackChildIds={fallbackChildIds}
      />
      <span>{name ?? kid?.firstName ?? 'Child'}</span>
    </span>
  )
}
