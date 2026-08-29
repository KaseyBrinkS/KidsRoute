import LegalDocumentPage from '../components/LegalDocumentPage'
import { useAuth } from '../context/AuthContext'
import { PRIVACY_POLICY } from '../content/privacyPolicy'

export default function Privacy() {
  const { user } = useAuth()
  const backTo = user ? '/welcome' : '/login'

  return (
    <LegalDocumentPage
      title={PRIVACY_POLICY.title}
      lastUpdated={PRIVACY_POLICY.lastUpdated}
      sections={PRIVACY_POLICY.sections}
      backTo={backTo}
    />
  )
}
