import ChildAvatar from './ChildAvatar'

export default function ChildColorDot({
  child,
  childId,
  kids,
  fallbackChildIds,
  size = 'sm',
  className = '',
}) {
  const kid = child ?? (kids ?? []).find((entry) => entry.id === childId)
  const resolvedId = kid?.id ?? childId
  const firstName = kid?.firstName ?? '?'
  const colorKey = kid?.colorKey

  return (
    <ChildAvatar
      firstName={firstName}
      child={kid}
      childId={resolvedId}
      kids={kids}
      colorKey={colorKey}
      size={size === 'md' ? 'sm' : 'sm'}
      className={className}
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
      <ChildAvatar
        firstName={name ?? kid?.firstName}
        child={kid}
        childId={resolvedId}
        kids={kids}
        colorKey={kid?.colorKey}
        size="sm"
      />
      <span>{name ?? kid?.firstName ?? 'Child'}</span>
    </span>
  )
}
