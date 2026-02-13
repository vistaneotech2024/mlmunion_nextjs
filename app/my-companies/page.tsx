import { Metadata } from 'next';
import { UserCompaniesPageContent } from '@/components/pages/UserCompaniesPageContent';

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://mlmunion.in';

export const metadata: Metadata = {
  title: 'My Companies - MLM Union',
  description: 'Manage your submitted MLM companies. View, edit, and track the status of your company submissions.',
  openGraph: {
    title: 'My Companies - MLM Union',
    description: 'Manage your submitted MLM companies.',
    type: 'website',
    url: `${baseUrl}/my-companies`,
    siteName: 'MLM Union',
  },
  twitter: {
    card: 'summary',
    title: 'My Companies - MLM Union',
    description: 'Manage your submitted MLM companies.',
  },
  alternates: { canonical: `${baseUrl}/my-companies` },
  robots: { index: false, follow: true },
};

export default function MyCompaniesPage() {
  return <UserCompaniesPageContent />;
}
