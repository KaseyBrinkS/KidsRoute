export const ACCOUNT_STATUS = {
  NEEDS_INVITE: 'needs_invite',
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  REMOVED: 'removed',
}

export function isAccountRemoved(profile) {
  return profile?.accountStatus === ACCOUNT_STATUS.REMOVED
}
