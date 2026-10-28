import PageHeader from '../components/PageHeader'
import ProfileBackLink from '../components/ProfileBackLink'
import MyKidsSection from '../components/settings/MyKidsSection'

export default function ProfileFamily() {
  return (
    <div className="space-y-6">
      <ProfileBackLink />
      <PageHeader
        title="Family Profiles"
        description="Children enrolled in KidsRoute and authorized adults who can guide walks."
      />
      <MyKidsSection />
    </div>
  )
}
