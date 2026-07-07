export function looksLikeEmail(value) {
  if (!value || typeof value !== 'string') return false
  return value.includes('@')
}

/** Phone number safe to show other families in a group — never an email address. */
export function formatSharedContactPhone(value) {
  const trimmed = value?.trim()
  if (!trimmed || looksLikeEmail(trimmed)) return 'Not provided'
  return trimmed
}

/** Resolve the phone number to store when a parent accepts a group match. */
export function resolveContactPhoneForSharing(profile, user) {
  const phone = profile?.phoneNumber?.trim() || user?.phoneNumber?.trim()
  if (phone && !looksLikeEmail(phone)) return phone
  return 'Not provided'
}

export function formatParentContactLine(parentName, contactPhone) {
  return `${parentName?.trim() || 'Parent'} · ${formatSharedContactPhone(contactPhone)}`
}

/** Contact line for a party, respecting per-group phone sharing preferences. */
export function formatParentContactForGroup(party, group, viewerUserId) {
  const parentName = party.parentName?.trim() || 'Parent'
  const isSelf = party.userId === viewerUserId
  const shared = group?.phoneSharing?.[party.userId] === true

  if (!shared) {
    return isSelf
      ? `${parentName} · Not shared with group`
      : `${parentName} · Not shared`
  }

  return `${parentName} · ${formatSharedContactPhone(party.contactPhone)}`
}
