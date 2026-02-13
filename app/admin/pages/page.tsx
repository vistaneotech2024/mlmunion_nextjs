import { Metadata } from 'next';
import { AdminPagesPageContent } from '@/components/pages/AdminPagesPageContent';

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://mlmunion.in';

export const metadata: Metadata = {
  title: 'Admin Pages - MLM Union',
  description: 'Admin panel for managing static pages and navigation.',
  robots: { index: false, follow: true },
  openGraph: {
    title: 'Admin Pages - MLM Union',
    url: `${baseUrl}/admin/pages`,
    siteName: 'MLM Union',
  },
};

export default function AdminPagesPage() {
  return <AdminPagesPageContent />;
}

