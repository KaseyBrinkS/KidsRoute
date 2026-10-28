import { addDoc, collection, onSnapshot, serverTimestamp } from 'firebase/firestore'
import { contactSubjectLabel } from '../content/contactSubjects'
import { sendContactEmailAlert } from './contactEmail'
import { db } from './db'

export { contactSubjectLabel }

export async function submitContactForm({ name, email, subject, message }) {
  const trimmedName = name.trim()
  const trimmedEmail = email.trim()
  const trimmedMessage = message.trim()

  if (!trimmedName || !trimmedEmail || !subject || !trimmedMessage) {
    throw new Error('Please fill in all fields.')
  }

  const timestamp = new Date().toISOString()

  await addDoc(collection(db, 'contactSubmissions'), {
    name: trimmedName,
    email: trimmedEmail,
    subject,
    message: trimmedMessage,
    createdAt: serverTimestamp(),
  })

  await sendContactEmailAlert({
    name: trimmedName,
    email: trimmedEmail,
    subject,
    message: trimmedMessage,
    timestamp,
  })
}

export function subscribeToContactSubmissions(onData, onError) {
  return onSnapshot(
    collection(db, 'contactSubmissions'),
    (snapshot) => {
      const submissions = snapshot.docs
        .map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        }))
        .sort((a, b) => {
          const aTime = a.createdAt?.seconds ?? 0
          const bTime = b.createdAt?.seconds ?? 0
          return bTime - aTime
        })
      onData(submissions)
    },
    onError,
  )
}

export function formatContactSubmittedAt(submission) {
  const timestamp = submission.createdAt
  if (!timestamp?.seconds) return 'Unknown'
  return new Date(timestamp.seconds * 1000).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}
