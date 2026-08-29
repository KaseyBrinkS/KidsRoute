import LegalDocumentPage from '../components/LegalDocumentPage'
import { useAuth } from '../context/AuthContext'
import { TERMS_OF_SERVICE } from '../content/termsOfService'

export default function Terms() {
  const { user } = useAuth()
  const backTo = user ? '/welcome' : '/login'

  return (
    <LegalDocumentPage
      title={TERMS_OF_SERVICE.title}
      lastUpdated={TERMS_OF_SERVICE.lastUpdated}
      sections={TERMS_OF_SERVICE.sections}
      backTo={backTo}
    />
  )
}
