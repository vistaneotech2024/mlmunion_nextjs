import { Metadata } from 'next';
import { SignInPageContent } from '@/components/pages/SignInPageContent';

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://mlmunion.in';

export const metadata: Metadata = {
  title: 'Login - MLM Union',
  description:
    'Sign in to your MLM Union account to access your dashboard, manage companies, classifieds, blogs, and connections.',
  openGraph: {
    title: 'Login - MLM Union',
    description:
      'Sign in to your MLM Union account to access your dashboard, manage companies, classifieds, blogs, and connections.',
    type: 'website',
    url: `${baseUrl}/login`,
    siteName: 'MLM Union',
  },
  twitter: {
    card: 'summary',
    title: 'Login - MLM Union',
    description:
      'Sign in to your MLM Union account to access your dashboard, manage companies, classifieds, blogs, and connections.',
  },
  alternates: { canonical: `${baseUrl}/login` },
  robots: { index: true, follow: true },
};

export default function LoginPage() {
  return <SignInPageContent />;
}

