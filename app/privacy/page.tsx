import { Metadata } from 'next';
import { PrivacyPolicyPageContent } from '@/components/pages/PrivacyPolicyPageContent';

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://mlmunion.in';

export const metadata: Metadata = {
  title: 'Privacy Policy - MLM Union',
  description:
    'Read the MLM Union Privacy Policy to understand how we collect, use, and protect your personal data.',
  openGraph: {
    title: 'Privacy Policy - MLM Union',
    description:
      'Read the MLM Union Privacy Policy to understand how we collect, use, and protect your personal data.',
    type: 'website',
    url: `${baseUrl}/privacy`,
    siteName: 'MLM Union',
  },
  twitter: {
    card: 'summary',
    title: 'Privacy Policy - MLM Union',
    description:
      'Read the MLM Union Privacy Policy to understand how we collect, use, and protect your personal data.',
  },
  alternates: { canonical: `${baseUrl}/privacy` },
  robots: { index: true, follow: true },
};

export default function PrivacyPage() {
  return <PrivacyPolicyPageContent />;
}

