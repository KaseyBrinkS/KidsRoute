import { addDoc, collection, serverTimestamp } from 'firebase/firestore'
import { db } from './db'
import { sendReportEmailAlert } from './reportEmail'

export const REPORT_REASONS = [
  { value: 'suspicious_account', label: 'Suspicious account' },
  { value: 'inappropriate_behavior', label: 'Inappropriate behavior' },
  { value: 'unknown_person', label: 'Unknown person' },
  { value: 'other', label: 'Other' },
]

/**
 * Saves a user report to Firestore and sends a Resend email alert via Vercel API.
 */
export async function submitUserReport({
  reporterUid,
  reportedUserUid,
  groupId,
  reason,
  details = '',
  reporterName = '',
  reportedUserName = '',
  groupName = '',
}) {
  if (!reporterUid || !reportedUserUid || !groupId || !reason) {
    throw new Error('Missing required report information.')
  }

  const trimmedDetails = details.trim()
  const timestamp = new Date().toISOString()

  await addDoc(collection(db, 'reports'), {
    reporterUid,
    reportedUserUid,
    groupId,
    reason,
    details: trimmedDetails,
    createdAt: serverTimestamp(),
  })

  try {
    await sendReportEmailAlert({
      reporterUid,
      reportedUserUid,
      groupId,
      reason,
      details: trimmedDetails,
      reporterName,
      reportedUserName,
      groupName,
      timestamp,
    })
  } catch (err) {
    console.warn('[submitUserReport] email alert failed', err)
  }
}
