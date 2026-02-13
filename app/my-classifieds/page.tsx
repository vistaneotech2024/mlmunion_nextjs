import { Metadata } from 'next';
import { UserClassifiedsPageContent } from '@/components/pages/UserClassifiedsPageContent';

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://mlmunion.in';

export const metadata: Metadata = {
  title: 'My Classifieds - MLM Union',
  description: 'Manage your classifieds. View, edit, and control the status of your network marketing opportunity listings.',
  openGraph: {
    title: 'My Classifieds - MLM Union',
    description: 'Manage your classifieds and network marketing opportunity listings.',
    type: 'website',
    url: `${baseUrl}/my-classifieds`,
    siteName: 'MLM Union',
  },
  twitter: {
    card: 'summary',
    title: 'My Classifieds - MLM Union',
    description: 'Manage your classifieds and network marketing opportunity listings.',
  },
  alternates: { canonical: `${baseUrl}/my-classifieds` },
  robots: { index: false, follow: true },
};

export default function MyClassifiedsPage() {
  return <UserClassifiedsPageContent />;
}
