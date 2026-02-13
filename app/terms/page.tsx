import { Metadata } from 'next';
import { TermsOfServicePageContent } from '@/components/pages/TermsOfServicePageContent';

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://mlmunion.in';

export const metadata: Metadata = {
  title: 'Terms of Service & Terms and Conditions - MLM Union',
  description:
    'Read the MLM Union Terms of Service and Terms and Conditions covering your use of our platform, content, and services.',
  openGraph: {
    title: 'Terms of Service & Terms and Conditions - MLM Union',
    description:
      'Read the MLM Union Terms of Service and Terms and Conditions covering your use of our platform, content, and services.',
    type: 'website',
    url: `${baseUrl}/terms`,
    siteName: 'MLM Union',
  },
  twitter: {
    card: 'summary',
    title: 'Terms of Service & Terms and Conditions - MLM Union',
    description:
      'Read the MLM Union Terms of Service and Terms and Conditions covering your use of our platform, content, and services.',
  },
  alternates: { canonical: `${baseUrl}/terms` },
  robots: { index: true, follow: true },
};

export default function TermsPage() {
  return <TermsOfServicePageContent />;
}

