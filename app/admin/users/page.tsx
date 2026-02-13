import { Metadata } from 'next';
import { AdminUsersPageContent } from '@/components/pages/AdminUsersPageContent';

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://mlmunion.in';

export const metadata: Metadata = {
  title: 'Admin Users - MLM Union',
  description: 'Admin panel for managing MLM Union user accounts.',
  robots: { index: false, follow: true },
  openGraph: {
    title: 'Admin Users - MLM Union',
    url: `${baseUrl}/admin/users`,
    siteName: 'MLM Union',
  },
};

export default function AdminUsersPage() {
  return <AdminUsersPageContent />;
}

