import { Metadata } from 'next';
import { DashboardPageContent } from '@/components/pages/DashboardPageContent';

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://mlmunion.in';

export const metadata: Metadata = {
  title: 'Dashboard - MLM Union',
  description: 'Manage your profile, blogs, classifieds, companies, and connections all in one place.',
  openGraph: {
    title: 'Dashboard - MLM Union',
    description: 'Manage your profile, blogs, classifieds, companies, and connections.',
    type: 'website',
    url: `${baseUrl}/dashboard`,
    siteName: 'MLM Union',
  },
  twitter: {
    card: 'summary',
    title: 'Dashboard - MLM Union',
    description: 'Manage your profile, blogs, classifieds, companies, and connections.',
  },
  alternates: { canonical: `${baseUrl}/dashboard` },
  robots: { index: false, follow: true },
};

export default function DashboardPage() {
  return <DashboardPageContent />;
}
