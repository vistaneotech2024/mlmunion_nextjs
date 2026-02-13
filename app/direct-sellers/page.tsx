import { Metadata } from 'next';
import { DirectSellersPageContent } from '@/components/pages/DirectSellersPageContent';

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://mlmunion.in';

export const metadata: Metadata = {
  title: 'Find Network Marketers - Direct Sellers Directory',
  description: 'Connect with experienced network marketers and direct sellers in your area. Browse verified and premium sellers.',
  openGraph: {
    title: 'Find Network Marketers | MLM Union',
    description: 'Connect with experienced network marketers and direct sellers in your area.',
    type: 'website',
    url: `${baseUrl}/direct-sellers`,
    siteName: 'MLM Union',
  },
  twitter: {
    card: 'summary',
    title: 'Find Network Marketers | MLM Union',
    description: 'Connect with experienced network marketers and direct sellers.',
  },
  alternates: { canonical: `${baseUrl}/direct-sellers` },
  robots: { index: true, follow: true },
};

export default function DirectSellersPage() {
  return <DirectSellersPageContent />;
}
