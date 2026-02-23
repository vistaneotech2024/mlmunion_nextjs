import { Metadata } from 'next';
import { Suspense } from 'react';
import { VerifyEmailContent } from '@/components/pages/VerifyEmailContent';

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://mlmunion.in';

// Force dynamic so this route is always available in production (avoids 404 on some hosts)
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Verify your email - MLM Union',
  description:
    'We sent you a confirmation link. Check your email to verify your MLM Union account and sign in.',
  openGraph: {
    title: 'Verify your email - MLM Union',
    description:
      'We sent you a confirmation link. Check your email to verify your MLM Union account and sign in.',
    type: 'website',
    url: `${baseUrl}/verify-email`,
    siteName: 'MLM Union',
  },
  twitter: {
    card: 'summary',
    title: 'Verify your email - MLM Union',
    description:
      'We sent you a confirmation link. Check your email to verify your MLM Union account and sign in.',
  },
  alternates: { canonical: `${baseUrl}/verify-email` },
  robots: { index: false, follow: true },
};

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<VerifyEmailFallback />}>
      <VerifyEmailContent />
    </Suspense>
  );
}

function VerifyEmailFallback() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" />
    </div>
  );
}
