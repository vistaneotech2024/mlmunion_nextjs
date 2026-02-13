import { Metadata } from 'next';
import { UserProfileViewPageContent } from '@/components/pages/UserProfileViewPageContent';

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://mlmunion.in';

export const metadata: Metadata = {
  title: 'My Profile - MLM Union',
  description: 'View your profile information, connections, and account details.',
  robots: { index: false, follow: true },
};

export default function ProfilePage() {
  return <UserProfileViewPageContent />;
}
