export const ACCOUNT_STATUS = {
  NEEDS_INVITE: 'needs_invite',
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
}

/** Profiles created before invite/approval — no gating fields on the document. */
export function isLegacyApprovedProfile(profile) {
  if (!profile || profile._profileExists === false) return false
  return profile.accountStatus === undefined && profile.inviteCodeVerified === undefined
}

export function hasFullAccess(profile) {
  if (!profile) return false
  if (isLegacyApprovedProfile(profile)) return true
  return profile.accountStatus === ACCOUNT_STATUS.APPROVED
}

export function getAccessGatePath(profile) {
  if (!profile || hasFullAccess(profile)) return null
  if (profile.accountStatus === ACCOUNT_STATUS.REJECTED) return '/rejected'
  if (profile.accountStatus === ACCOUNT_STATUS.PENDING) return '/pending-approval'
  return '/invite-code'
}

export const ACCESS_GATE_PATHS = ['/invite-code', '/pending-approval', '/rejected']
