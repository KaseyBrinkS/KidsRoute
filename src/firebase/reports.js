import { addDoc, collection, serverTimestamp } from 'firebase/firestore'
import { db } from './db'
import { sendReportEmailAlert } from './reportEmail'

export const REPORT_REASONS = [
  { value: 'suspicious_account', label: 'Suspicious account' },
  { value: 'inappropriate_behavior', label: 'Inappropriate behavior' },
  { value: 'unknown_person', label: 'Unknown person' },
  { value: 'other', label: 'Other' },
]

export const GENERAL_CONCERN_VALUE = 'general'

/**
 * Saves a user report to Firestore and sends a Resend email alert via Vercel API.
 */
export async function submitUserReport({
  reporterUid,
  reportedUserUid = '',
  isGeneralConcern = false,
  groupId,
  reason,
  details = '',
  reporterName = '',
  reportedUserName = '',
  groupName = '',
}) {
  if (!reporterUid || !groupId || !reason) {
    throw new Error('Missing required report information.')
  }

  if (!isGeneralConcern && !reportedUserUid) {
    throw new Error('Select who you are reporting, or choose general concern.')
  }

  const trimmedDetails = details.trim()
  const timestamp = new Date().toISOString()
  const resolvedReportedUserName = isGeneralConcern ? 'General concern' : reportedUserName

  await addDoc(collection(db, 'reports'), {
    reporterUid,
    reportedUserUid: isGeneralConcern ? '' : reportedUserUid,
    isGeneralConcern,
    groupId,
    reason,
    details: trimmedDetails,
    createdAt: serverTimestamp(),
  })

  try {
    await sendReportEmailAlert({
      reporterUid,
      reportedUserUid: isGeneralConcern ? '' : reportedUserUid,
      groupId,
      reason,
      details: trimmedDetails,
      reporterName,
      reportedUserName: resolvedReportedUserName,
      groupName,
      timestamp,
    })
  } catch (err) {
    console.warn('[submitUserReport] email alert failed', err)
  }
}
