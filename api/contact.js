import { Resend } from 'resend'

const CONTACT_EMAIL = 'hello@kidsroute.org'

const SUBJECT_LABELS = {
  general_question: 'General question',
  safety_concern: 'Safety concern',
  technical_issue: 'Technical issue',
  school_business: 'School or business inquiry',
  feedback: 'Feedback',
  other: 'Other',
}

function subjectLabel(subject) {
  return SUBJECT_LABELS[subject] || subject
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

  const { name, email, subject, message, timestamp } = req.body ?? {}

  const trimmedName = String(name ?? '').trim()
  const trimmedEmail = String(email ?? '').trim()
  const trimmedMessage = String(message ?? '').trim()

  if (!trimmedName || !trimmedEmail || !subject || !trimmedMessage) {
    return res.status(400).json({ error: 'Missing required contact fields' })
  }

  if (!SUBJECT_LABELS[subject]) {
    return res.status(400).json({ error: 'Invalid subject' })
  }

  const submittedAt = timestamp || new Date().toISOString()
  const fromEmail = process.env.RESEND_FROM_EMAIL || 'KidsRoute <onboarding@resend.dev>'

  const body = [
    'New contact form message from KidsRoute.',
    '',
    `Name: ${trimmedName}`,
    `Email: ${trimmedEmail}`,
    `Subject: ${subjectLabel(subject)}`,
    '',
    'Message:',
    trimmedMessage,
    '',
    `Submitted: ${submittedAt}`,
  ].join('\n')

  const resend = new Resend(apiKey)
  const { error } = await resend.emails.send({
    from: fromEmail,
    to: [CONTACT_EMAIL],
    replyTo: trimmedEmail,
    subject: `KidsRoute — Contact: ${subjectLabel(subject)}`,
    text: body,
  })

  if (error) {
    console.error('[contact] Resend error', error)
    return res.status(500).json({ error: 'Could not send message' })
  }

  return res.status(200).json({ ok: true })
}
