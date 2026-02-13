import { Metadata } from 'next';
import { AdminUserDetailPageContent } from '@/components/pages/AdminUserDetailPageContent';

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://mlmunion.in';

export const metadata: Metadata = {
  title: 'Admin User Details - MLM Union',
  description: 'View and manage individual user details in the MLM Union admin panel.',
  robots: { index: false, follow: true },
  openGraph: {
    title: 'Admin User Details - MLM Union',
    url: `${baseUrl}/admin/users`,
    siteName: 'MLM Union',
  },
};

export default function AdminUserDetailPage() {
  return <AdminUserDetailPageContent />;
}

