import { Metadata } from 'next';
import { AdminDashboardPageContent } from '@/components/pages/AdminDashboardPageContent';

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://mlmunion.in';

export const metadata: Metadata = {
  title: 'Admin Dashboard - MLM Union',
  description: 'Admin dashboard for managing users, companies, blogs, classifieds, and platform settings.',
  robots: { index: false, follow: true },
  openGraph: {
    title: 'Admin Dashboard - MLM Union',
    url: `${baseUrl}/admin/dashboard`,
    siteName: 'MLM Union',
  },
};

export default function AdminDashboardPage() {
  return <AdminDashboardPageContent />;
}
