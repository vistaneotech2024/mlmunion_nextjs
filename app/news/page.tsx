import { Metadata } from 'next';
import { NewsPageContent } from '@/components/pages/NewsPageContent';

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://mlmunion.in';
const canonical = `${baseUrl}/news`;

export const metadata: Metadata = {
  title: 'MLM News - Latest Network Marketing Updates',
  description:
    'Stay updated with the latest news, updates, and trends in the network marketing and MLM industry.',
  keywords: [
    'MLM news',
    'network marketing news',
    'MLM updates',
    'MLM industry news',
  ],
  openGraph: {
    title: 'MLM News - Latest Network Marketing Updates',
    description:
      'Stay updated with the latest news, updates, and trends in the network marketing and MLM industry.',
    type: 'website',
    url: canonical,
    siteName: 'MLM Union',
  },
  twitter: {
    card: 'summary',
    title: 'MLM News - Latest Network Marketing Updates',
    description:
      'Stay updated with the latest news in the network marketing industry.',
  },
  alternates: { canonical },
  robots: { index: true, follow: true },
};

export const dynamic = 'force-static';

export default function NewsPage() {
  return <NewsPageContent />;
}

