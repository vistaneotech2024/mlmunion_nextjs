import { Metadata } from 'next';
import { UserProfilePageContent } from '@/components/pages/UserProfilePageContent';

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://mlmunion.in';

export const metadata: Metadata = {
  title: 'Edit Profile - MLM Union',
  description: 'Update your profile information, location, and direct seller details.',
  robots: { index: false, follow: true },
};

export default function EditProfilePage() {
  return <UserProfilePageContent />;
}
