import { Metadata } from 'next';
import { FAQPageContent } from '@/components/pages/FAQPageContent';

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://mlmunion.in';

export const metadata: Metadata = {
  title: 'Frequently Asked Questions - MLM Union',
  description: 'Find answers to common questions about MLM Union, network marketing, direct selling, and our platform.',
  openGraph: {
    title: 'Frequently Asked Questions - MLM Union',
    description: 'Find answers to common questions about MLM Union and network marketing.',
    type: 'website',
    url: `${baseUrl}/faq`,
    siteName: 'MLM Union',
  },
  twitter: {
    card: 'summary',
    title: 'Frequently Asked Questions - MLM Union',
    description: 'Find answers to common questions about MLM Union.',
  },
  alternates: { canonical: `${baseUrl}/faq` },
  robots: { index: true, follow: true },
};

export default function FAQPage() {
  return <FAQPageContent />;
}
