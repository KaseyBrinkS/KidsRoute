import { Resend } from 'resend'

const REPORT_EMAIL = 'hello@kidsroute.org'

const REASON_LABELS = {
  suspicious_account: 'Suspicious account',
  inappropriate_behavior: 'Inappropriate behavior',
  unknown_person: 'Unknown person',
  other: 'Other',
}

function reasonLabel(reason) {
  return REASON_LABELS[reason] || reason
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    return res.status(500).json({ error: 'Email service not configured' })
  }

  const {
    reporterName,
    reportedUserName,
    groupName,
    reason,
    details = '',
    timestamp,
  } = req.body ?? {}

  if (!reporterName || !reportedUserName || !groupName || !reason) {
    return res.status(400).json({ error: 'Missing required report fields' })
  }

  const trimmedDetails = String(details).trim()
  const submittedAt = timestamp || new Date().toISOString()
  const fromEmail = process.env.RESEND_FROM_EMAIL || 'KidsRoute <onboarding@resend.dev>'

  const body = [
    'A new user report was submitted.',
    '',
    `Reporter: ${reporterName}`,
    `Reported user: ${reportedUserName}`,
    `Group: ${groupName}`,
    `Reason: ${reasonLabel(reason)}`,
    trimmedDetails ? `Details: ${trimmedDetails}` : 'Details: (none)',
    `Submitted: ${submittedAt}`,
  ].join('\n')

  const resend = new Resend(apiKey)
  const { error } = await resend.emails.send({
    from: fromEmail,
    to: [REPORT_EMAIL],
    subject: 'KidsRoute — New user report',
    text: body,
  })

  if (error) {
    console.error('[send-report] Resend error', error)
    return res.status(500).json({ error: 'Could not send report email' })
  }

  return res.status(200).json({ ok: true })
}
