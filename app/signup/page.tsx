import { Metadata } from 'next';
import { Suspense } from 'react';
import { SignUpPageContent } from '@/components/pages/SignUpPageContent';

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://mlmunion.in';

export const metadata: Metadata = {
  title: 'Sign Up - MLM Union',
  description:
    'Create your free MLM Union account to connect with direct sellers, manage your companies, classifieds, blogs, and grow your network.',
  openGraph: {
    title: 'Sign Up - MLM Union',
    description:
      'Create your free MLM Union account to connect with direct sellers, manage your companies, classifieds, blogs, and grow your network.',
    type: 'website',
    url: `${baseUrl}/signup`,
    siteName: 'MLM Union',
  },
  twitter: {
    card: 'summary',
    title: 'Sign Up - MLM Union',
    description:
      'Create your free MLM Union account to connect with direct sellers, manage your companies, classifieds, blogs, and grow your network.',
  },
  alternates: { canonical: `${baseUrl}/signup` },
  robots: { index: true, follow: true },
};

export default function SignUpPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" />
        </div>
      }
    >
      <SignUpPageContent />
    </Suspense>
  );
}

