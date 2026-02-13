import { Metadata } from 'next';
import { ConnectionsPageContent } from '@/components/pages/ConnectionsPageContent';

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://mlmunion.in';

export const metadata: Metadata = {
  title: 'My Connections - MLM Union',
  description: 'Manage your network connections and pending requests.',
  openGraph: {
    title: 'My Connections - MLM Union',
    description: 'Manage your network connections and pending requests.',
    type: 'website',
    url: `${baseUrl}/connections`,
    siteName: 'MLM Union',
  },
  twitter: {
    card: 'summary',
    title: 'My Connections - MLM Union',
    description: 'Manage your network connections and pending requests.',
  },
  alternates: { canonical: `${baseUrl}/connections` },
  robots: { index: false, follow: true },
};

export default function ConnectionsPage() {
  return <ConnectionsPageContent />;
}
