import { addDoc, collection, serverTimestamp } from 'firebase/firestore'
import { db } from './db'

export const REPORT_REASONS = [
  { value: 'suspicious_account', label: 'Suspicious account' },
  { value: 'inappropriate_behavior', label: 'Inappropriate behavior' },
  { value: 'unknown_person', label: 'Unknown person' },
  { value: 'other', label: 'Other' },
]

const REPORT_EMAIL = 'hello@kidsroute.org'

function reasonLabel(reason) {
  return REPORT_REASONS.find((entry) => entry.value === reason)?.label ?? reason
}

/**
 * Saves a user report and queues an email alert (Firebase Trigger Email extension on `mail`).
 */
export async function submitUserReport({
  reporterUid,
  reportedUserUid,
  groupId,
  reason,
  details = '',
}) {
  if (!reporterUid || !reportedUserUid || !groupId || !reason) {
    throw new Error('Missing required report information.')
  }

  const trimmedDetails = details.trim()

  await addDoc(collection(db, 'reports'), {
    reporterUid,
    reportedUserUid,
    groupId,
    reason,
    details: trimmedDetails,
    createdAt: serverTimestamp(),
  })

  const emailBody = [
    'KidsRoute user report',
    '',
    `Reporter UID: ${reporterUid}`,
    `Reported user UID: ${reportedUserUid}`,
    `Group ID: ${groupId}`,
    `Reason: ${reasonLabel(reason)}`,
    trimmedDetails ? `Details: ${trimmedDetails}` : 'Details: (none)',
    '',
    `Submitted: ${new Date().toISOString()}`,
  ].join('\n')

  try {
    await addDoc(collection(db, 'mail'), {
      to: REPORT_EMAIL,
      message: {
        subject: `KidsRoute report: ${reasonLabel(reason)}`,
        text: emailBody,
      },
    })
  } catch (err) {
    console.warn('[submitUserReport] email queue failed', err)
  }
}
